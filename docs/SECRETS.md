# Secret Management

This document describes how secrets (JWT signing keys, database credentials,
API keys) flow through reasonBridge across local development, CI, and
production, and the conventions every new manifest must follow.

## TL;DR

- **Local / CI:** secrets are interpolated into the Docker Compose stacks from
  the environment using `${VAR:-default}` syntax. The defaults are throwaway
  values that keep the stack working with no `.env` file. Override them by
  copying [`.env.example`](../.env.example) to a git-ignored `.env`.
- **Production / staging:** services **must** source secrets from **AWS Secrets
  Manager**, never from inline literals or committed env files. The CDK already
  provisions the database credentials secret (see below); wire services to it
  rather than copy-pasting values.

## Conventions

### 1. Never inline literal secrets in a manifest

Do not write `POSTGRES_PASSWORD: reasonbridge` or
`JWT_SECRET: some-literal` directly in a compose/k8s manifest. Use
environment interpolation with an explicit default:

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-reasonbridge} # local default only
```

The `${VAR:-default}` form keeps local dev zero-config while making the
injection point obvious. For a manifest where a missing value should be a hard
error (e.g. a shared staging compose), prefer the fail-fast form
`${VAR:?VAR is required}` instead of a silent default.

### 2. Define a repeated secret once

When the same secret is consumed by many services (the E2E stack shares one
`JWT_SECRET` across six services), define it once as a YAML anchor and
reference it, rather than copy-pasting the literal:

```yaml
x-jwt-secret: &jwt-secret ${JWT_SECRET:-mock-jwt-secret-for-e2e-testing}

services:
  api-gateway:
    environment:
      JWT_SECRET: *jwt-secret
  user-service:
    environment:
      JWT_SECRET: *jwt-secret
```

This is how `docker-compose.e2e.yml` is structured. A single edit updates every
consumer and there is no drift between copies.

### 3. Keep `.env` out of git

`.env`, `.env.local`, and `.env.*.local` are git-ignored. Only
[`.env.example`](../.env.example) — containing placeholders and safe local
defaults — is committed.

## Production: AWS Secrets Manager

Local defaults are **not** acceptable in deployed environments. Production
services must read secrets from AWS Secrets Manager.

### What already exists

The CDK provisions a database credentials secret:

- `infrastructure/cdk/lib/rds-stack.ts` creates a
  `secretsmanager.Secret` (`DbCredentials`) and the RDS instance consumes it via
  `Credentials.fromSecret(...)`. The generated secret holds the master username
  and password — nothing is hard-coded.

### Wiring services to Secrets Manager

Services running on ECS/EKS should consume secrets by reference, not value:

- **ECS:** map the secret into the task definition via the container
  `secrets` block (`valueFrom` an ARN), so the value is injected at task start
  and never stored in the task definition JSON.
- **EKS:** use the
  [External Secrets Operator](https://external-secrets.io/) or the
  [AWS Secrets & Configuration Provider (ASCP) CSI driver](https://github.com/aws/secrets-store-csi-driver-provider-aws)
  to sync a Secrets Manager secret into a Kubernetes `Secret`, then reference it
  from the pod's `env`/`envFrom`.

### Adding a new production secret

1. Create the secret in Secrets Manager (via CDK — prefer generated values over
   `SecretValue.unsafePlainText`).
2. Grant the service task/pod role `secretsmanager:GetSecretValue` on that
   secret ARN only (least privilege).
3. Reference it from the task definition / pod spec as above.
4. Add a placeholder line to `.env.example` and a `${VAR:-...}` interpolation in
   the relevant compose file so local dev keeps working.

## Rotation

`INTERNAL_API_KEY` supports rotation via a secondary key
(`INTERNAL_API_KEY_SECONDARY`) — both are accepted during a transition window.
Follow the same pattern for other rotatable secrets, and prefer Secrets Manager
automatic rotation for database credentials.

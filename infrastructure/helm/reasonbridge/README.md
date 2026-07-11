# ReasonBridge Helm Chart

Production deployment artifacts for the ReasonBridge platform (9 backend
microservices + frontend) on the `reason-bridge-cluster` EKS cluster provisioned
by `infrastructure/cdk`.

This chart closes the gap identified in issue **#1336**: previously the repository
had **no in-repo mechanism for database schemas to reach production Aurora** and
**no migration-before-rollout ordering guarantee**.

## What it deploys

| Object | Purpose |
| ------ | ------- |
| `Job/<release>-db-migrate` | Runs `prisma migrate deploy` as a **gated pre-install/pre-upgrade hook** |
| `Deployment` + `Service` per backend service | The 9 microservices, ClusterIP, `/health` readiness + liveness probes |
| `Deployment` + `Service` frontend | Non-root nginx SPA (port 8080) |
| `ConfigMap/<release>-env` | Non-secret env: in-cluster `*_SERVICE_URL`, pool tuning (#1341), region |

Sensitive env (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`) is read from an existing
Kubernetes `Secret` (`existingSecret`, default `reasonbridge-app-secrets`) that is
synced from AWS Secrets Manager (`reason-bridge/rds/credentials`, created in
`infrastructure/cdk/lib/rds-stack.ts`) via the External Secrets Operator.

## Images

Build and push the hardened production images (issue #1340):

```bash
# Per-service images (repeat for each service in values.yaml)
docker build -f Dockerfile.service.prod --build-arg SERVICE=user-service \
  -t $REGISTRY/reasonbridge/user-service:$TAG .

# Migration image
docker build -f Dockerfile.migrate -t $REGISTRY/reasonbridge/db-migrate:$TAG .

# Frontend
docker build -f Dockerfile.frontend.prod -t $REGISTRY/reasonbridge/frontend:$TAG .
```

## Deploy

```bash
helm upgrade --install reasonbridge infrastructure/helm/reasonbridge \
  --namespace reasonbridge --create-namespace \
  --set image.registry=$REGISTRY \
  --set image.tag=$TAG \
  --set migrate.image.tag=$TAG \
  --set frontend.image.tag=$TAG \
  --wait --timeout 10m
```

### Migration-before-rollout ordering

`helm upgrade` executes the `db-migrate` Job (a `pre-upgrade` hook, weight `-5`)
**before** it touches any Deployment, and blocks until the Job succeeds. If
migrations fail:

- the hook Job reports failure and `helm upgrade` **aborts**;
- the previous ReleaseRevision's Deployments keep running unchanged (no partial
  rollout against a half-migrated schema).

## Rollback strategy

Prisma migrations are **roll-forward**; `prisma migrate deploy` never
auto-reverts. Treat rollback in two layers:

1. **Application rollback (fast):** `helm rollback reasonbridge <REVISION>`.
   This re-points Deployments at the previous image tag. Only safe when the
   previous app version is compatible with the already-applied schema — which is
   why migrations must be **backward-compatible / expand-then-contract** (add
   columns/tables in one release, remove usage in the next, drop in a later one).
2. **Schema rollback (rare, deliberate):** author a new *forward* migration that
   reverses the change, or restore from the automated Aurora snapshot/PITR taken
   before the deploy. Never hand-edit `_prisma_migrations`.

Because the migration Job runs first and independently, a failed migration leaves
the running services untouched, so the recovery is simply "fix the migration and
re-run `helm upgrade`."

## Notes

- `helm template infrastructure/helm/reasonbridge` renders manifests offline for
  review / GitOps (Argo CD, Flux).
- Service `name`s must match the repo's `services/<name>` directories so that the
  generated `*_SERVICE_URL` config and in-cluster DNS resolve correctly.

# Unite Discord - AWS CDK Infrastructure

This directory contains AWS CDK infrastructure-as-code for the Unite Discord platform.

## Architecture Overview

The infrastructure consists of four main stacks:

1. **EksStack** - Amazon EKS cluster with multi-AZ VPC
2. **RdsStack** - Aurora Serverless v2 PostgreSQL 15.5 cluster with auto-scaling
3. **ElastiCacheStack** - Redis cluster for caching and sessions
4. **BedrockStack** - IAM roles and permissions for Amazon Bedrock AI services

## Prerequisites

- Node.js 20 LTS
- pnpm 9.0+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

Install dependencies:

```bash
pnpm install
```

Build the project:

```bash
pnpm build
```

## Usage

### Synthesize CloudFormation templates

```bash
pnpm synth
```

### Deploy all stacks

```bash
pnpm deploy --all
```

### Deploy specific stack

```bash
pnpm deploy UniteEksStack
```

### View differences

```bash
pnpm diff
```

### Destroy infrastructure

```bash
pnpm destroy --all
```

## Environment Variables

- `AWS_ACCOUNT_ID` - AWS account ID (defaults to CDK_DEFAULT_ACCOUNT)
- `AWS_REGION` - AWS region (defaults to us-east-1)
- `ENVIRONMENT` - Environment name (dev, staging, prod)

## Stack Details

### EksStack

Creates:
- VPC with public and private subnets across 3 AZs
- EKS cluster (Kubernetes 1.31)
- General-purpose node group (t3.medium, 2-10 nodes)
- AI workload node group (c6i.xlarge, 1-5 nodes)

### RdsStack

Creates:
- Aurora Serverless v2 PostgreSQL 15.5 cluster
- Writer instance with auto-scaling (0.5-16 ACUs)
- Reader instance with auto-scaling (0.5-16 ACUs)
- Multi-AZ deployment with automatic failover
- Automated backups (7-day retention)
- Performance Insights enabled
- Secrets Manager for credentials

### ElastiCacheStack

Creates:
- Redis 7.1 cluster
- Multi-AZ replication (1 primary + 2 replicas)
- Automatic failover
- Encryption at rest and in transit
- Daily snapshots (7-day retention)

### BedrockStack

Creates:
- IAM role for Bedrock access
- Permissions for Claude models
- Service account integration for EKS

## Security

- All resources are deployed in private subnets
- Encryption at rest and in transit enabled
- Deletion protection enabled for databases
- Security groups restrict access
- IAM roles follow principle of least privilege

## Cost Optimization

- EKS node groups use autoscaling
- Aurora Serverless v2 scales down to 0.5 ACUs when idle
- ElastiCache uses t3.medium instances (adjust for production)
- Backup retention set to 7 days (adjust as needed)

## Next Steps

After deploying infrastructure:

1. Configure kubectl for EKS cluster
2. Deploy Helm charts for services
3. Configure database migrations (Prisma)
4. Set up monitoring and logging

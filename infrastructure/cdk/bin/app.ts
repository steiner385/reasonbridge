#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EksStack } from '../lib/eks-stack.js';
import { RdsStack } from '../lib/rds-stack.js';
import { ElastiCacheStack } from '../lib/elasticache-stack.js';
import { BedrockStack } from '../lib/bedrock-stack.js';
import { CognitoStack } from '../lib/cognito-stack.js';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

// Create EKS stack (creates VPC and EKS cluster)
const eksStack = new EksStack(app, 'ReasonBridgeEksStack', {
  env,
  description: 'ReasonBridge Platform - EKS Cluster and VPC',
  tags: {
    Project: 'reason-bridge',
    Environment: process.env.ENVIRONMENT || 'dev',
    ManagedBy: 'CDK',
  },
});

// Create RDS stack (depends on VPC from EKS stack)
const rdsStack = new RdsStack(app, 'ReasonBridgeRdsStack', {
  env,
  vpc: eksStack.vpc,
  description: 'ReasonBridge Platform - PostgreSQL Database',
  tags: {
    Project: 'reason-bridge',
    Environment: process.env.ENVIRONMENT || 'dev',
    ManagedBy: 'CDK',
  },
});
rdsStack.addDependency(eksStack);

// Create ElastiCache stack (depends on VPC from EKS stack)
const elastiCacheStack = new ElastiCacheStack(app, 'ReasonBridgeElastiCacheStack', {
  env,
  vpc: eksStack.vpc,
  description: 'ReasonBridge Platform - Redis Cache',
  tags: {
    Project: 'reason-bridge',
    Environment: process.env.ENVIRONMENT || 'dev',
    ManagedBy: 'CDK',
  },
});
elastiCacheStack.addDependency(eksStack);

// Create Bedrock stack (IAM permissions for AI services)
new BedrockStack(app, 'ReasonBridgeBedrockStack', {
  env,
  description: 'ReasonBridge Platform - Bedrock IAM Permissions',
  tags: {
    Project: 'reason-bridge',
    Environment: process.env.ENVIRONMENT || 'dev',
    ManagedBy: 'CDK',
  },
});

// Create Cognito stack (User authentication and authorization)
new CognitoStack(app, 'ReasonBridgeCognitoStack', {
  env,
  description: 'ReasonBridge Platform - Cognito User Pool',
  tags: {
    Project: 'reason-bridge',
    Environment: process.env.ENVIRONMENT || 'dev',
    ManagedBy: 'CDK',
  },
});

// Synthesize the app
app.synth();

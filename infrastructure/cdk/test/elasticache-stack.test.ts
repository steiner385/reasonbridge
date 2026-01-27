import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ElastiCacheStack } from '../lib/elasticache-stack.js';

describe('ElastiCacheStack', () => {
  let app: cdk.App;
  let vpc: ec2.IVpc;

  beforeEach(() => {
    app = new cdk.App();
    // Create a VPC for testing
    const vpcStack = new cdk.Stack(app, 'TestVpcStack');
    vpc = new ec2.Vpc(vpcStack, 'TestVpc', {
      maxAzs: 2,
      natGateways: 1,
    });
  });

  test('creates Redis replication group with correct configuration', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify Redis replication group is created
    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      Engine: 'redis',
      EngineVersion: '7.1',
      CacheNodeType: 'cache.t3.medium',
      NumNodeGroups: 1,
      ReplicasPerNodeGroup: 2,
      AutomaticFailoverEnabled: true,
      MultiAZEnabled: true,
      AtRestEncryptionEnabled: true,
      TransitEncryptionEnabled: true,
      SnapshotRetentionLimit: 7,
    });
  });

  test('creates security group for Redis', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify security group is created
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ReasonBridge ElastiCache Redis cluster',
    });
  });

  test('creates subnet group in private subnets', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify subnet group is created
    template.hasResourceProperties('AWS::ElastiCache::SubnetGroup', {
      Description: 'Subnet group for ReasonBridge Redis cluster',
      CacheSubnetGroupName: 'reason-bridge-redis-subnet-group',
    });
  });

  test('creates parameter group for Redis 7.x', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify parameter group is created with correct settings
    template.hasResourceProperties('AWS::ElastiCache::ParameterGroup', {
      CacheParameterGroupFamily: 'redis7',
      Description: 'Parameter group for ReasonBridge Redis cluster',
      Properties: {
        'maxmemory-policy': 'allkeys-lru',
        timeout: '300',
      },
    });
  });

  test('creates CloudFormation outputs for endpoints', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify outputs are created
    template.hasOutput('RedisPrimaryEndpoint', {
      Description: 'Redis Primary Endpoint',
    });

    template.hasOutput('RedisPort', {
      Description: 'Redis Port',
    });

    template.hasOutput('RedisReaderEndpoint', {
      Description: 'Redis Reader Endpoint',
    });
  });

  test('uses custom cluster name when provided', () => {
    const customName = 'custom-redis-cluster';
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
      clusterName: customName,
    });

    const template = Template.fromStack(stack);

    // Verify custom cluster name is used
    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      ReplicationGroupId: customName,
    });
  });

  test('uses default cluster name when not provided', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify default cluster name is used
    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      ReplicationGroupId: 'reason-bridge-redis',
    });
  });

  test('configures snapshot window and maintenance window', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    const template = Template.fromStack(stack);

    // Verify backup and maintenance windows
    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      SnapshotWindow: '03:00-05:00',
      PreferredMaintenanceWindow: 'sun:05:00-sun:07:00',
    });
  });

  test('exposes replication group and security group as public properties', () => {
    const stack = new ElastiCacheStack(app, 'TestElastiCacheStack', {
      vpc,
    });

    // Verify public properties are accessible
    expect(stack.replicationGroup).toBeDefined();
    expect(stack.securityGroup).toBeDefined();
  });
});

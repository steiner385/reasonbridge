import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export interface ElastiCacheStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  clusterName?: string;
}

export class ElastiCacheStack extends cdk.Stack {
  public readonly replicationGroup: elasticache.CfnReplicationGroup;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: ElastiCacheStackProps) {
    super(scope, id, props);

    // Create security group for ElastiCache
    this.securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Unite ElastiCache Redis cluster',
      allowAllOutbound: false,
    });

    // Create subnet group for ElastiCache
    const subnetGroup = new elasticache.CfnSubnetGroup(
      this,
      'RedisSubnetGroup',
      {
        description: 'Subnet group for Unite Redis cluster',
        subnetIds: props.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnetIds,
        cacheSubnetGroupName: 'unite-redis-subnet-group',
      }
    );

    // Create parameter group for Redis 7.x
    const parameterGroup = new elasticache.CfnParameterGroup(
      this,
      'RedisParameterGroup',
      {
        cacheParameterGroupFamily: 'redis7',
        description: 'Parameter group for Unite Redis cluster',
        properties: {
          'maxmemory-policy': 'allkeys-lru',
          'timeout': '300',
        },
      }
    );

    // Create Redis replication group
    this.replicationGroup = new elasticache.CfnReplicationGroup(
      this,
      'RedisReplicationGroup',
      {
        replicationGroupId: props.clusterName || 'unite-discord-redis',
        replicationGroupDescription:
          'Redis cluster for Unite Discord platform',
        engine: 'redis',
        engineVersion: '7.1',
        cacheNodeType: 'cache.t3.medium',
        numNodeGroups: 1,
        replicasPerNodeGroup: 2,
        automaticFailoverEnabled: true,
        multiAzEnabled: true,
        cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
        securityGroupIds: [this.securityGroup.securityGroupId],
        cacheParameterGroupName: parameterGroup.ref,
        atRestEncryptionEnabled: true,
        transitEncryptionEnabled: true,
        snapshotRetentionLimit: 7,
        snapshotWindow: '03:00-05:00',
        preferredMaintenanceWindow: 'sun:05:00-sun:07:00',
      }
    );

    this.replicationGroup.addDependency(subnetGroup);
    this.replicationGroup.addDependency(parameterGroup);

    // Output Redis details
    new cdk.CfnOutput(this, 'RedisPrimaryEndpoint', {
      value: this.replicationGroup.attrPrimaryEndPointAddress,
      description: 'Redis Primary Endpoint',
    });

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.replicationGroup.attrPrimaryEndPointPort,
      description: 'Redis Port',
    });

    new cdk.CfnOutput(this, 'RedisReaderEndpoint', {
      value: this.replicationGroup.attrReaderEndPointAddress,
      description: 'Redis Reader Endpoint',
    });
  }
}

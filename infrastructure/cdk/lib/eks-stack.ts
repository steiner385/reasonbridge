import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';

export interface EksStackProps extends cdk.StackProps {
  vpcId?: string;
  clusterName?: string;
}

export class EksStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props?: EksStackProps) {
    super(scope, id, props);

    // Use existing VPC or create new one
    this.vpc = props?.vpcId
      ? ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: props.vpcId })
      : new ec2.Vpc(this, 'UniteVpc', {
          maxAzs: 3,
          natGateways: 2,
          subnetConfiguration: [
            {
              cidrMask: 24,
              name: 'Public',
              subnetType: ec2.SubnetType.PUBLIC,
            },
            {
              cidrMask: 24,
              name: 'Private',
              subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
          ],
        });

    // Create EKS cluster
    this.cluster = new eks.Cluster(this, 'UniteCluster', {
      clusterName: props?.clusterName || 'reason-bridge-cluster',
      version: eks.KubernetesVersion.V1_31,
      vpc: this.vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 0, // We'll add node groups separately
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
    });

    // Add managed node group for general workloads
    this.cluster.addNodegroupCapacity('GeneralNodeGroup', {
      instanceTypes: [new ec2.InstanceType('t3.medium')],
      minSize: 2,
      maxSize: 10,
      desiredSize: 3,
      diskSize: 50,
      labels: {
        role: 'general',
      },
    });

    // Add managed node group for AI workloads (CPU-intensive)
    this.cluster.addNodegroupCapacity('AiNodeGroup', {
      instanceTypes: [new ec2.InstanceType('c6i.xlarge')],
      minSize: 1,
      maxSize: 5,
      desiredSize: 2,
      diskSize: 100,
      labels: {
        role: 'ai',
      },
      taints: [
        {
          effect: eks.TaintEffect.NO_SCHEDULE,
          key: 'workload',
          value: 'ai',
        },
      ],
    });

    // Output cluster details
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'EKS Cluster Name',
    });

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: this.cluster.clusterArn,
      description: 'EKS Cluster ARN',
    });
  }
}

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EksStack } from '../lib/eks-stack.js';

describe('EksStack', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  test('creates VPC with correct configuration', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify VPC is created
    template.hasResourceProperties('AWS::EC2::VPC', {
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });

    // Verify NAT gateways (2)
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  test('creates EKS cluster with Kubernetes 1.31', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify EKS cluster is created with correct version
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: {
        version: '1.31',
        roleArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('ReasonBridgeClusterRole.*'), 'Arn'],
        },
      },
    });
  });

  test('creates general node group with correct configuration', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify general node group exists
    template.hasResourceProperties('AWS::EKS::Nodegroup', {
      ScalingConfig: {
        MinSize: 2,
        MaxSize: 10,
        DesiredSize: 3,
      },
      DiskSize: 50,
      Labels: {
        role: 'general',
      },
    });
  });

  test('creates AI node group with correct configuration and taints', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify AI node group exists with taints
    template.hasResourceProperties('AWS::EKS::Nodegroup', {
      ScalingConfig: {
        MinSize: 1,
        MaxSize: 5,
        DesiredSize: 2,
      },
      DiskSize: 100,
      Labels: {
        role: 'ai',
      },
      Taints: [
        {
          Effect: 'NO_SCHEDULE',
          Key: 'workload',
          Value: 'ai',
        },
      ],
    });
  });

  test('uses private subnets for EKS nodes', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify that private subnets are created
    template.hasResourceProperties('AWS::EC2::Subnet', {
      Tags: Match.arrayWith([
        Match.objectLike({
          Key: 'Name',
          Value: Match.stringLikeRegexp('.*Private.*'),
        }),
      ]),
    });
  });

  test('configures cluster with public and private endpoint access', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify endpoint access configuration
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: {
        resourcesVpcConfig: {
          endpointPublicAccess: true,
          endpointPrivateAccess: true,
        },
      },
    });
  });

  test('creates CloudFormation outputs for cluster details', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify outputs are created
    template.hasOutput('ClusterName', {
      Description: 'EKS Cluster Name',
    });

    template.hasOutput('ClusterArn', {
      Description: 'EKS Cluster ARN',
    });
  });

  test('uses custom cluster name when provided', () => {
    const customName = 'custom-eks-cluster';
    const stack = new EksStack(app, 'TestEksStack', {
      clusterName: customName,
    });

    const template = Template.fromStack(stack);

    // Verify custom cluster name is used
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: {
        name: customName,
      },
    });
  });

  test('uses default cluster name when not provided', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify default cluster name is used
    template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
      Config: {
        name: 'reason-bridge-cluster',
      },
    });
  });

  test('exposes cluster and VPC as public properties', () => {
    const stack = new EksStack(app, 'TestEksStack');

    // Verify public properties are accessible
    expect(stack.cluster).toBeDefined();
    expect(stack.vpc).toBeDefined();
    expect(stack.cluster.clusterName).toBeDefined();
    expect(stack.vpc.vpcId).toBeDefined();
  });

  test('creates node groups with at least 2 groups', () => {
    const stack = new EksStack(app, 'TestEksStack');
    const template = Template.fromStack(stack);

    // Verify at least 2 node groups are created (general + AI)
    template.resourceCountIs('AWS::EKS::Nodegroup', 2);
  });
});

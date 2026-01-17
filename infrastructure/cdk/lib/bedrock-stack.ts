import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface BedrockStackProps extends cdk.StackProps {
  serviceAccountRoleArns?: string[];
}

export class BedrockStack extends cdk.Stack {
  public readonly bedrockAccessRole: iam.Role;

  constructor(scope: Construct, id: string, props?: BedrockStackProps) {
    super(scope, id, props);

    // Create IAM role for Bedrock access
    this.bedrockAccessRole = new iam.Role(this, 'BedrockAccessRole', {
      roleName: 'unite-bedrock-access-role',
      description: 'IAM role for Unite services to access Amazon Bedrock',
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
    });

    // Add Bedrock invoke permissions
    this.bedrockAccessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          // Claude models
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-opus-20240229-v1:0`,
          // Allow future Claude models
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-*`,
        ],
      })
    );

    // Add Bedrock model listing permissions (for monitoring/debugging)
    this.bedrockAccessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:ListFoundationModels', 'bedrock:GetFoundationModel'],
        resources: ['*'],
      })
    );

    // Allow assuming this role from specified service accounts
    if (props?.serviceAccountRoleArns) {
      props.serviceAccountRoleArns.forEach((roleArn) => {
        this.bedrockAccessRole.assumeRolePolicy?.addStatements(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ArnPrincipal(roleArn)],
            actions: ['sts:AssumeRole'],
          })
        );
      });
    }

    // Output role details
    new cdk.CfnOutput(this, 'BedrockRoleArn', {
      value: this.bedrockAccessRole.roleArn,
      description: 'ARN of the Bedrock access role',
    });

    new cdk.CfnOutput(this, 'BedrockRoleName', {
      value: this.bedrockAccessRole.roleName,
      description: 'Name of the Bedrock access role',
    });
  }
}

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CognitoStack } from '../lib/cognito-stack.js';

describe('CognitoStack', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  test('creates user pool with correct configuration', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    // Verify user pool is created
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'unite-user-pool',
      AutoVerifiedAttributes: ['email'],
      UsernameAttributes: ['email'],
      // Email-based sign-in
      AliasAttributes: Match.absent(),
      // Self-registration enabled
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: false,
      },
      // Deletion protection enabled
      DeletionProtection: 'ACTIVE',
    });
  });

  test('user pool has correct password policy', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: {
        PasswordPolicy: {
          MinimumLength: 12,
          RequireLowercase: true,
          RequireUppercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
          TemporaryPasswordValidityDays: 3,
        },
      },
    });
  });

  test('user pool has correct MFA configuration', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPool', {
      MfaConfiguration: 'OPTIONAL',
      EnabledMfas: Match.arrayWith(['SMS_MFA', 'SOFTWARE_TOKEN_MFA']),
    });
  });

  test('user pool has email recovery only', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AccountRecoverySetting: {
        RecoveryMechanisms: [
          {
            Name: 'verified_email',
            Priority: 1,
          },
        ],
      },
    });
  });

  test('user pool has custom attributes for platform', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Schema: Match.arrayWith([
        // Email attribute (standard)
        Match.objectLike({
          Name: 'email',
          Required: true,
          Mutable: false,
        }),
        // Display name (custom)
        Match.objectLike({
          Name: 'displayName',
          AttributeDataType: 'String',
          Mutable: true,
          StringAttributeConstraints: {
            MinLength: '3',
            MaxLength: '50',
          },
        }),
        // Verification level (custom)
        Match.objectLike({
          Name: 'verificationLevel',
          AttributeDataType: 'String',
          Mutable: true,
          StringAttributeConstraints: {
            MinLength: '5',
            MaxLength: '20',
          },
        }),
      ]),
    });
  });

  test('creates user pool domain', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    // Verify domain is created with dynamic account ID
    template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
      Domain: Match.objectLike({
        'Fn::Join': Match.arrayEquals([
          '', // separator
          Match.arrayWith(['reason-bridge-']),
        ]),
      }),
      UserPoolId: {
        Ref: Match.stringLikeRegexp('UniteUserPool.*'),
      },
    });
  });

  test('creates web client with OAuth configuration', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'unite-web-client',
      // OAuth flows
      AllowedOAuthFlows: ['code'],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: ['email', 'openid', 'profile'],
      // Callback URLs
      CallbackURLs: Match.arrayWith([
        'http://localhost:5173/auth/callback',
        'https://app.reasonbridge.com/auth/callback',
      ]),
      LogoutURLs: Match.arrayWith(['http://localhost:5173/', 'https://app.reasonbridge.com/']),
      // Generate secret
      GenerateSecret: false,
      // Prevent user existence errors - CDK converts false to "LEGACY"
      PreventUserExistenceErrors: 'LEGACY',
    });
  });

  test('web client has correct auth flows', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ExplicitAuthFlows: Match.arrayWith([
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ]),
    });
  });

  test('web client has correct token validity', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      // CDK converts to minutes: 1 hour = 60 minutes
      AccessTokenValidity: 60,
      IdTokenValidity: 60,
      // 30 days = 43200 minutes
      RefreshTokenValidity: 43200,
      TokenValidityUnits: {
        AccessToken: 'minutes',
        IdToken: 'minutes',
        RefreshToken: 'minutes',
      },
    });
  });

  test('web client has correct read/write attributes', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ReadAttributes: Match.arrayWith([
        'custom:displayName',
        'custom:verificationLevel',
        'email',
        'email_verified',
      ]),
      WriteAttributes: Match.arrayWith(['custom:displayName', 'custom:verificationLevel', 'email']),
    });
  });

  test('creates CloudFormation outputs', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    // Verify outputs exist
    template.hasOutput('UserPoolId', {
      Description: 'Cognito User Pool ID',
      Export: {
        Name: 'UniteUserPoolId',
      },
    });

    template.hasOutput('UserPoolArn', {
      Description: 'Cognito User Pool ARN',
      Export: {
        Name: 'UniteUserPoolArn',
      },
    });

    template.hasOutput('UserPoolClientId', {
      Description: 'Cognito User Pool Client ID',
      Export: {
        Name: 'UniteUserPoolClientId',
      },
    });

    template.hasOutput('UserPoolDomain', {
      Description: 'Cognito User Pool Domain',
      Export: {
        Name: 'UniteUserPoolDomain',
      },
    });

    template.hasOutput('CognitoHostedUI', {
      Description: 'Cognito Hosted UI URL',
    });
  });

  test('supports custom domain prefix', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack', {
      domainPrefix: 'my-custom-prefix',
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
      Domain: 'my-custom-prefix',
    });
  });

  test('applies correct tags to user pool', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolTags: Match.objectLike({
        Service: 'Authentication',
        Component: 'Cognito',
      }),
    });
  });

  test('creates all required resources', () => {
    const stack = new CognitoStack(app, 'TestCognitoStack');
    const template = Template.fromStack(stack);

    // Verify resource counts
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.resourceCountIs('AWS::Cognito::UserPoolDomain', 1);
  });
});

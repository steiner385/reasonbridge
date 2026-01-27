import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface CognitoStackProps extends cdk.StackProps {
  /**
   * Domain prefix for Cognito hosted UI
   * Must be globally unique across all AWS accounts
   */
  domainPrefix?: string;
}

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: CognitoStackProps) {
    super(scope, id, props);

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'ReasonBridgeUserPool', {
      userPoolName: 'reason-bridge-user-pool',
      // Self-registration enabled for MVP
      selfSignUpEnabled: true,
      // Email-based sign-in
      signInAliases: {
        email: true,
        username: false,
      },
      // Auto-verify email addresses
      autoVerify: {
        email: true,
      },
      // Standard attributes required for the platform
      standardAttributes: {
        email: {
          required: true,
          mutable: false, // Email cannot be changed after registration
        },
      },
      // Custom attributes for platform-specific data
      customAttributes: {
        // Display name (stored in Cognito for consistency)
        displayName: new cognito.StringAttribute({
          minLen: 3,
          maxLen: 50,
          mutable: true,
        }),
        // Verification level: basic | enhanced | verified_human
        verificationLevel: new cognito.StringAttribute({
          minLen: 5,
          maxLen: 20,
          mutable: true,
        }),
      },
      // Password policy aligned with security best practices
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      // MFA configuration (optional for MVP, required for enhanced verification)
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // Email configuration (using Cognito default for MVP, can switch to SES later)
      email: cognito.UserPoolEmail.withCognito(),
      // User invitation settings
      userInvitation: {
        emailSubject: 'Welcome to ReasonBridge!',
        emailBody:
          'Hello {username}, your temporary password is {####}. Please sign in and change your password.',
      },
      // User verification settings
      userVerification: {
        emailSubject: 'Verify your email for ReasonBridge',
        emailBody: 'Please verify your email by clicking this link: {##Verify Email##}',
        emailStyle: cognito.VerificationEmailStyle.LINK,
      },
      // Keep users for 30 days after deletion (compliance requirement)
      deletionProtection: true,
      // Lambda triggers can be added later for custom auth flows
    });

    // Create user pool domain for hosted UI
    const domainPrefix = props?.domainPrefix || `reason-bridge-${this.account}`;
    this.userPoolDomain = this.userPool.addDomain('ReasonBridgeUserPoolDomain', {
      cognitoDomain: {
        domainPrefix,
      },
    });

    // Create user pool client for the web application
    this.userPoolClient = this.userPool.addClient('ReasonBridgeWebClient', {
      userPoolClientName: 'reason-bridge-web-client',
      // OAuth configuration for social sign-in
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false, // Not recommended for web apps
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        // Callback URLs - configure based on environment
        callbackUrls: [
          'http://localhost:5173/auth/callback', // Local development
          'https://app.reasonbridge.org/auth/callback', // Production (example)
        ],
        logoutUrls: [
          'http://localhost:5173/', // Local development
          'https://app.reasonbridge.org/', // Production (example)
        ],
      },
      // Enable user existence errors for better UX
      preventUserExistenceErrors: false,
      // Auth flows
      authFlows: {
        userPassword: true, // Username/password auth
        userSrp: true, // Secure Remote Password (recommended)
        custom: false, // Can enable for custom auth later
      },
      // Token validity periods
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      // Generate client secret (required for server-side apps)
      generateSecret: false, // Set to true if using server-side auth
      // Read/write attributes
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
        })
        .withCustomAttributes('displayName', 'verificationLevel'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
        })
        .withCustomAttributes('displayName', 'verificationLevel'),
    });

    // Create identity pool for AWS resource access (optional for MVP)
    // This can be added later if services need temporary AWS credentials

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'ReasonBridgeUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: 'ReasonBridgeUserPoolArn',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'ReasonBridgeUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: 'ReasonBridgeUserPoolDomain',
    });

    new cdk.CfnOutput(this, 'CognitoHostedUI', {
      value: `https://${domainPrefix}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI URL',
    });

    // Tag resources
    cdk.Tags.of(this.userPool).add('Service', 'Authentication');
    cdk.Tags.of(this.userPool).add('Component', 'Cognito');
  }
}

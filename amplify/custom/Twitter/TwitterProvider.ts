import * as url from "node:url";
// you may need to declare this as a dependency
import { CDKContextKey } from "@aws-amplify/platform-core";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { secret } from "@aws-amplify/backend";

export type BackendSecret = ReturnType<typeof secret>;

export type TwitterProviderProps = {
  /**
   * Cognito User Pool to attach to
   */
  userPool: cognito.IUserPool;
  /**
   * Cognito User Pool client to use
   */
  userPoolClient: cognito.IUserPoolClient;
  /**
   * Twitter OAuth Client ID
   */
  clientId: BackendSecret;
  /**
   * Twitter OAuth Client Secret
   */
  clientSecret: BackendSecret;
};

// TwitterProvider OIDC
// API Gateway
// Lambda Functions
export class TwitterProvider extends Construct {
  public api: apigateway.RestApi;
  public apiUrl: string;
  public provider: cognito.UserPoolIdentityProviderOidc;
  private backendIdentifier = {
    name: this.node.tryGetContext(CDKContextKey.BACKEND_NAME),
    namespace: this.node.tryGetContext(CDKContextKey.BACKEND_NAMESPACE),
    type: this.node.tryGetContext(CDKContextKey.DEPLOYMENT_TYPE),
  };

  constructor(scope: Construct, id: string, props: TwitterProviderProps) {
    super(scope, id);

    // Backend ID To resolve secrets

    // lambda

    const userLambda = new lambda.NodejsFunction(this, "UserLambda", {
      entry: url.fileURLToPath(new URL("./api/user.ts", import.meta.url)),
      runtime: Runtime.NODEJS_18_X,
    });

    const tokenLambda = new lambda.NodejsFunction(this, "TokenLambda", {
      entry: url.fileURLToPath(new URL("./api/token.ts", import.meta.url)),
      runtime: Runtime.NODEJS_18_X,
    });

    const privateLambda = new lambda.NodejsFunction(this, "PrivateLambda", {
      entry: url.fileURLToPath(new URL("./api/private.ts", import.meta.url)),
      runtime: Runtime.NODEJS_18_X,
    });

    // Setup API Gateway

    const apiTwitterGateway = new apigateway.RestApi(this, "APIGateway", {
      restApiName: "Twitter API Gateway",
      description: "this is for Twitter API Login",
      deployOptions: {
        stageName: "prod",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["*"], // Specify allowed headers
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // Setup Resource Routes
    const userResource = apiTwitterGateway.root.addResource("user");
    const userIntegration = new apigateway.LambdaIntegration(userLambda);
    userResource.addMethod("GET", userIntegration);

    const tokenResource = apiTwitterGateway.root.addResource("token");
    const tokenIntegration = new apigateway.LambdaIntegration(tokenLambda);
    tokenResource.addMethod("POST", tokenIntegration);

    const userPoolAuthorizer = new apigateway.CfnAuthorizer(
      this,
      "UserPoolAuthorizerTwitter",
      {
        name: "UserPoolAuthorizer",
        restApiId: apiTwitterGateway.restApiId,
        type: "COGNITO_USER_POOLS",
        providerArns: [props.userPool.userPoolArn],
        identitySource: "method.request.header.Authorization",
      }
    );

    // protected Private route
    const privateResource = apiTwitterGateway.root.addResource("private");
    const privateIntegration = new apigateway.LambdaIntegration(privateLambda);
    privateResource.addMethod("GET", privateIntegration, {
      authorizer: { authorizerId: userPoolAuthorizer.ref },
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Setup Twitter Identity Provider
    const twitterIdentityProvider = new cognito.UserPoolIdentityProviderOidc(
      this,
      "TwitterProvider",
      {
        // https://twitter.com/aws-amplify/amplify-backend/blob/6a2f9aa8fe81bf48ac725470a1bd64622966da46/packages/backend-auth/src/translate_auth_props.ts#L138-L154
        clientId: props.clientId
          .resolve(this, this.backendIdentifier)
          .unsafeUnwrap(),
        clientSecret: props.clientSecret
          .resolve(this, this.backendIdentifier)
          .unsafeUnwrap(),
        userPool: props.userPool,
        issuerUrl: "https://twitter.com",
        attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
        name: "Twitter",
        endpoints: {
          authorization: "https://twitter.com/i/oauth2/authorize",
          jwksUri: apiTwitterGateway.url + "token",
          token: apiTwitterGateway.url + "token",
          userInfo: apiTwitterGateway.url + "user",
        },
        attributeMapping: {
          email: cognito.ProviderAttribute.other("email"),
          preferredUsername: cognito.ProviderAttribute.other("name"),
        },
        scopes: ["openid", "user", "tweet.read", "users.read"],
      }
    );

    // add the new identity provider to the user pool client
    const userPoolClient = props.userPoolClient.node
      .defaultChild as cognito.CfnUserPoolClient;
    userPoolClient.supportedIdentityProviders = [
      ...(userPoolClient.supportedIdentityProviders || []),
      twitterIdentityProvider.providerName,
    ];
    this.api = apiTwitterGateway;
    this.apiUrl = apiTwitterGateway.url;
    this.provider = twitterIdentityProvider;
  }
}

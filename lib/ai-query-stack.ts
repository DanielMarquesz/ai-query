import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Role, ServicePrincipal, PolicyStatement, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export class AiQueryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const chatLambda = new NodejsFunction(this, 'ChatFunction', {
      entry: 'src/chat.ts', 
      runtime: Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        REGION: this.region,
      },
      role: new Role(this, 'ChatLambdaRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          ChatLambdaPolicy: new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: ['bedrock:*'],
                resources: ['*'],
              }),
              new PolicyStatement({
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [`arn:aws:logs:${this.region}:${this.account}:*`],
              }),
            ],
          }),
        },
      }),
    });

    const httpApi = new HttpApi(this, 'ChatApi', {
      apiName: 'chat-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
        allowHeaders: ['*'],
      },
    });

    httpApi.addRoutes({
      path: '/chat',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('ChatIntegration', chatLambda),
    });
    
    new cdk.CfnOutput(this, 'ChatApiUrl', {
      value: httpApi.apiEndpoint,
    });
  }
}

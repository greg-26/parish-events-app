// amplify/backend.ts
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

//we define the functions with amplify for better dev experience (amplify takes care of few things like ts support, hot-reloading...)
import { apiFn } from "./functions/api/resource";
import { streamWorkerFn } from "./functions/stream-worker/resource";

//cdk

import { Stack, RemovalPolicy } from "aws-cdk-lib";

import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource, SqsDlq } from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Duration } from "aws-cdk-lib";

const isProd = process.env.AMPLIFY_ENV === "prod"; // this is defined in Amplify

//1. backend resources
const backend = defineBackend({
  auth,
  apiFn,
  streamWorkerFn,
});

//2. Custom stack for API + DB
const appStack = backend.stack;

//3. DynamoDB table (PK/SK example) with streams enabled
const table = new dynamodb.Table(appStack, "AppTable", {
  partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
});

table.applyRemovalPolicy(isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY); // keep prod data and nothing else.

backend.apiFn.addEnvironment("TABLE_NAME", table.tableName);
backend.streamWorkerFn.addEnvironment("TABLE_NAME", table.tableName); //I think this might not be needed as event may have it, but anyway

//4. Grant the lambdas R/W permissions
table.grantReadWriteData(backend.apiFn.resources.lambda);
table.grantReadWriteData(backend.streamWorkerFn.resources.lambda);

//4.1 Create DynamoDB stream event source for the stream worker
backend.streamWorkerFn.resources.lambda.addEventSource(
  new DynamoEventSource(table, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 1, // default
    retryAttempts: 2, // default
    bisectBatchOnError: true,
    reportBatchItemFailures: true,
    onFailure: new SqsDlq(
      new sqs.Queue(appStack, "StreamDLQ", {
        retentionPeriod: Duration.days(7),
      }),
    ),
    enabled: true,
  }),
);

// 3. API
// 3.1 Integration
const integration = new HttpLambdaIntegration("DefaultIntegration", backend.apiFn.resources.lambda);

// 3.2 Cognito user-pool authorizer
const authorizer = new HttpUserPoolAuthorizer("CognitoAuth", backend.auth.resources.userPool, {
  userPoolClients: [backend.auth.resources.userPoolClient],
});

// 3.3 Actual Http Api
const httpApi = new apigwv2.HttpApi(appStack, "HttpApi", {
  apiName: "custom-http-api",
  corsPreflight: {
    allowOrigins: ["*"],
    allowMethods: [apigwv2.CorsHttpMethod.ANY],
    allowHeaders: ["authorization", "content-type"],
  },
});
// --- Private routes (default) — require Cognito JWT ---
httpApi.addRoutes({ path: "/", methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], integration, authorizer });
httpApi.addRoutes({
  path: "/{proxy+}",
  methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
  integration,
  authorizer,
});

// --- Public API routes (no auth) ---
// Parish JSON-LD endpoints for Mass Times Protocol compliance
httpApi.addRoutes({
  path: "/public/{proxy+}",
  methods: [apigwv2.HttpMethod.GET],
  integration,
  // no authorizer — open to the world
});

// 3.4 output the url
backend.addOutput({
  custom: {
    httpApi: { url: httpApi.apiEndpoint },
  },
});

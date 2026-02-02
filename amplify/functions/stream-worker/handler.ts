import type { DynamoDBStreamHandler } from 'aws-lambda'

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const r of event.Records) {
    console.log('DDB event:', r.eventName, r.dynamodb?.Keys, r.dynamodb?.NewImage)
    // TODO: your logic (denormalization, projections, notifications, etc.)
  }

  return { batchItemFailures: [] } // OK for standard stream handling
}

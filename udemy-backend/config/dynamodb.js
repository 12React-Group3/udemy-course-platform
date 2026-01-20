/**
 * DynamoDB Client Configuration
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Create base DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create Document Client for easier data manipulation
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Automatically remove undefined values
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table name from environment
export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'UdemyPlatform';

// Log connection info (only on startup)
console.log(`📦 DynamoDB configured for table: ${TABLE_NAME} in region: ${process.env.AWS_REGION}`);

export default docClient;

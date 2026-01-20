// Test script to verify DynamoDB connection
import 'dotenv/config';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Check environment variables
console.log('Checking environment variables...');
console.log('AWS_REGION:', process.env.AWS_REGION ? '✅ Set' : '❌ Missing');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
console.log('DYNAMODB_TABLE_NAME:', process.env.DYNAMODB_TABLE_NAME ? '✅ Set' : '❌ Missing');
console.log('');

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

async function testConnection() {
  try {
    // Test 1: Describe table
    console.log('Test 1: Checking table exists...');
    const describeResult = await client.send(new DescribeTableCommand({
      TableName: TABLE_NAME
    }));
    console.log('✅ Table found:', describeResult.Table.TableName);
    console.log('   Status:', describeResult.Table.TableStatus);
    console.log('');

    // Test 2: Write a test item
    console.log('Test 2: Writing test item...');
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: 'TEST#connection',
        SK: 'TEST#connection',
        message: 'Hello from local development!',
        timestamp: new Date().toISOString(),
      }
    }));
    console.log('✅ Test item written successfully');
    console.log('');

    // Test 3: Read the test item
    console.log('Test 3: Reading test item...');
    const getResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: 'TEST#connection',
        SK: 'TEST#connection',
      }
    }));
    console.log('✅ Test item read successfully');
    console.log('   Data:', JSON.stringify(getResult.Item, null, 2));
    console.log('');

    console.log('========================================');
    console.log('🎉 All tests passed! DynamoDB is ready.');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.name === 'ResourceNotFoundException') {
      console.error('   Table not found. Check DYNAMODB_TABLE_NAME in .env');
    } else if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
      console.error('   Invalid credentials. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'CredentialsProviderError') {
      console.error('   Missing credentials. Make sure .env file is configured');
    }

    process.exit(1);
  }
}

testConnection();

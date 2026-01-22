/**
 * Migration Script: Fill instructorId for existing courses
 *
 * This script updates existing courses that don't have an instructorId
 * by matching the instructor name (userName) to the corresponding user's ID.
 *
 * Usage:
 *   node scripts/fill-instructor-id.js
 *
 * Make sure your .env file has AWS credentials configured.
 */

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// ============================================
// Configuration
// ============================================

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'UdemyPlatform';

// DynamoDB client setup
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// ============================================
// Helper Functions
// ============================================

/**
 * Get all users from the database
 */
async function getAllUsers() {
  const users = [];
  let lastEvaluatedKey = undefined;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':type': 'USER',
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    if (result.Items) {
      users.push(...result.Items);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return users;
}

/**
 * Get all courses from the database
 */
async function getAllCourses() {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': 'ENTITY#COURSE',
    },
  }));

  return result.Items || [];
}

/**
 * Update course with instructorId
 */
async function updateCourseInstructorId(course, instructorId) {
  const courseKey = course.courseUid || course.courseId;

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `COURSE#${courseKey}`,
      SK: `COURSE#${courseKey}`,
    },
    UpdateExpression: 'SET instructorId = :instructorId',
    ExpressionAttributeValues: {
      ':instructorId': instructorId,
    },
  }));
}

// ============================================
// Main Migration Function
// ============================================

async function migrate() {
  console.log('='.repeat(60));
  console.log('Fill instructorId Migration Script');
  console.log('='.repeat(60));
  console.log(`Table: ${TABLE_NAME}`);
  console.log('');

  try {
    // Step 1: Get all users and build userName -> userId mapping
    console.log('Step 1: Fetching all users...');
    const users = await getAllUsers();
    console.log(`  Found ${users.length} users`);

    // Build mapping (case-insensitive)
    const userNameToId = new Map();
    for (const user of users) {
      if (user.userName && user.userId) {
        userNameToId.set(user.userName.toLowerCase(), user.userId);
        console.log(`  - ${user.userName} -> ${user.userId} (${user.role})`);
      }
    }
    console.log('');

    // Step 2: Get all courses
    console.log('Step 2: Fetching all courses...');
    const courses = await getAllCourses();
    console.log(`  Found ${courses.length} courses`);
    console.log('');

    // Step 3: Update courses without instructorId
    console.log('Step 3: Updating courses...');
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const course of courses) {
      const courseId = course.courseId;
      const instructor = course.instructor;
      const existingInstructorId = course.instructorId;

      // Skip if already has instructorId
      if (existingInstructorId) {
        console.log(`  [SKIP] ${courseId} - already has instructorId: ${existingInstructorId}`);
        skipped++;
        continue;
      }

      // Find userId by instructor name
      if (!instructor) {
        console.log(`  [WARN] ${courseId} - no instructor name set`);
        notFound++;
        continue;
      }

      const instructorId = userNameToId.get(instructor.toLowerCase());

      if (!instructorId) {
        console.log(`  [WARN] ${courseId} - instructor "${instructor}" not found in users`);
        notFound++;
        continue;
      }

      // Update the course
      await updateCourseInstructorId(course, instructorId);
      console.log(`  [OK] ${courseId} - set instructorId to ${instructorId} (instructor: ${instructor})`);
      updated++;
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary:');
    console.log(`  Total courses: ${courses.length}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (already had instructorId): ${skipped}`);
    console.log(`  Not found (instructor not in users): ${notFound}`);
    console.log('='.repeat(60));
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

/**
 * Migration Script: Fill courseUid for existing courses
 *
 * This script finds courses missing courseUid, generates a unique ID,
 * writes a new item with the new PK/SK, and deletes the old item.
 *
 * Usage:
 *   node scripts/fill-course-uid.js
 *
 * Dry run (no writes):
 *   DRY_RUN=1 node scripts/fill-course-uid.js
 *
 * Make sure your .env file has AWS credentials configured.
 */

import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

// ============================================
// Configuration
// ============================================

dotenv.config({ path: new URL('../.env', import.meta.url) });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'UdemyPlatform';
const DRY_RUN = process.env.DRY_RUN === '1';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

if (!REGION) {
  console.error('Missing AWS region. Set AWS_REGION (or AWS_DEFAULT_REGION) in your environment.');
  process.exit(1);
}

// DynamoDB client setup
const client = new DynamoDBClient({
  region: REGION,
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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get all courses missing courseUid
 */
async function getCoursesMissingUid() {
  const courses = [];
  let lastEvaluatedKey = undefined;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        'begins_with(PK, :pk) AND attribute_exists(courseId) AND (attribute_not_exists(courseUid) OR courseUid = :empty)',
      ExpressionAttributeValues: {
        ':pk': 'COURSE#',
        ':empty': '',
      },
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    if (result.Items) {
      courses.push(...result.Items);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return courses;
}

/**
 * Migrate a single course to a new PK/SK with courseUid
 */
async function migrateCourse(course) {
  const courseId = String(course.courseId || '').trim();
  if (!courseId) {
    return { status: 'skip', reason: 'missing courseId' };
  }

  if (!course.PK || !course.SK) {
    return { status: 'skip', reason: 'missing PK/SK' };
  }

  const courseUid = generateId();
  const newItem = {
    ...course,
    PK: `COURSE#${courseUid}`,
    SK: `COURSE#${courseUid}`,
    GSI1PK: 'ENTITY#COURSE',
    GSI1SK: `COURSE#${courseId}`,
    entityType: 'COURSE',
    courseUid,
    courseId,
  };

  if (DRY_RUN) {
    return { status: 'dry-run', courseId, courseUid, oldKey: { PK: course.PK, SK: course.SK } };
  }

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: newItem,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: course.PK,
      SK: course.SK,
    },
  }));

  return { status: 'ok', courseId, courseUid };
}

// ============================================
// Main Migration Function
// ============================================

async function migrate() {
  console.log('='.repeat(60));
  console.log('Fill courseUid Migration Script');
  console.log('='.repeat(60));
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Dry Run: ${DRY_RUN ? 'yes' : 'no'}`);
  console.log('');

  try {
    console.log('Step 1: Fetching courses missing courseUid...');
    const courses = await getCoursesMissingUid();
    console.log(`  Found ${courses.length} courses`);
    console.log('');

    console.log('Step 2: Migrating courses...');
    let updated = 0;
    let skipped = 0;
    let dryRun = 0;

    for (const course of courses) {
      const result = await migrateCourse(course);

      if (result.status === 'ok') {
        console.log(`  [OK] ${result.courseId} -> courseUid: ${result.courseUid}`);
        updated++;
      } else if (result.status === 'dry-run') {
        console.log(`  [DRY] ${result.courseId} -> courseUid: ${result.courseUid}`);
        dryRun++;
      } else {
        console.log(`  [SKIP] ${course.courseId || '(unknown)'} - ${result.reason}`);
        skipped++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary:');
    console.log(`  Total candidates: ${courses.length}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Dry run: ${dryRun}`);
    console.log(`  Skipped: ${skipped}`);
    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

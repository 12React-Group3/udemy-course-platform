/**
 * Migration Script: MongoDB to DynamoDB
 *
 * This script migrates all data from MongoDB to DynamoDB.
 *
 * Usage:
 *   node scripts/migrate-to-dynamodb.js
 *
 * Make sure your .env file has both:
 *   - MONGO_URI (source)
 *   - AWS credentials (destination)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';

// Import Mongoose models
import { User, Course, Question, Task, TaskRecord } from '../models/schema.js';

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
// Transform Functions (MongoDB → DynamoDB)
// ============================================

/**
 * Transform User document to DynamoDB item
 */
function transformUser(user) {
  const userId = user._id.toString();
  return {
    PK: `USER#${userId}`,
    SK: `USER#${userId}`,
    GSI1PK: `EMAIL#${user.email.toLowerCase()}`,
    GSI1SK: `EMAIL#${user.email.toLowerCase()}`,
    entityType: 'USER',
    userId: userId,
    userName: user.userName,
    email: user.email.toLowerCase(),
    password: user.password, // Already hashed from MongoDB
    profileImage: user.profileImage || null,
    role: user.role,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Transform Course document to DynamoDB item
 */
function transformCourse(course) {
  return {
    PK: `COURSE#${course.courseId}`,
    SK: `COURSE#${course.courseId}`,
    GSI1PK: 'ENTITY#COURSE',
    GSI1SK: `COURSE#${course.courseId}`,
    entityType: 'COURSE',
    courseId: course.courseId,
    mongoId: course._id.toString(),
    title: course.title,
    description: course.description || '',
    videoURL: course.videoURL || '',
    instructor: course.instructor,
    students: course.students || [],
    courseTag: course.courseTag || '',
    createdAt: course.createdAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Transform Question document to DynamoDB item
 */
function transformQuestion(question) {
  return {
    PK: `QUESTION#${question.questionId}`,
    SK: `QUESTION#${question.questionId}`,
    GSI1PK: 'ENTITY#QUESTION',
    GSI1SK: `QUESTION#${question.questionId}`,
    entityType: 'QUESTION',
    questionId: question.questionId,
    mongoId: question._id.toString(),
    options: question.options || [],
    correctAnswer: question.correctAnswer,
    explanation: question.explanation || null,
    difficulty: question.difficulty,
    createdAt: question.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: question.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Transform Task document to DynamoDB item
 */
function transformTask(task, courseIdMap) {
  const mongoCourseId = task.courseId.toString();
  const courseId = courseIdMap.get(mongoCourseId) || mongoCourseId;

  return {
    PK: `COURSE#${courseId}`,
    SK: `TASK#${task.taskId}`,
    GSI1PK: 'ENTITY#TASK',
    GSI1SK: `TASK#${task.taskId}`,
    entityType: 'TASK',
    taskId: task.taskId,
    mongoId: task._id.toString(),
    courseId: courseId,
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate?.toISOString() || null,
    type: task.type,
    questions: task.questions || [],
    createdAt: task.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: task.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Transform TaskRecord document to DynamoDB item
 */
function transformTaskRecord(record, taskIdMap) {
  const userId = record.userId.toString();
  const mongoTaskId = record.taskId.toString();
  const taskId = taskIdMap.get(mongoTaskId) || mongoTaskId;

  return {
    PK: `USER#${userId}`,
    SK: `TASKRECORD#${taskId}`,
    GSI1PK: `TASK#${taskId}`,
    GSI1SK: `USER#${userId}`,
    entityType: 'TASKRECORD',
    mongoId: record._id.toString(),
    userId: userId,
    taskId: taskId,
    responses: record.responses?.map(r => ({
      questionId: r.questionId?.toString(),
      selectedAnswer: r.selectedAnswer,
      isCorrect: r.isCorrect,
      answeredAt: r.answeredAt?.toISOString() || new Date().toISOString(),
    })) || [],
    score: record.score || 0,
    createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: record.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

// ============================================
// Batch Write Helper
// ============================================

async function batchWriteItems(items, entityName) {
  if (items.length === 0) {
    console.log(`   No ${entityName} to migrate`);
    return 0;
  }

  const BATCH_SIZE = 25;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    };

    try {
      const result = await docClient.send(new BatchWriteCommand(params));

      // Handle unprocessed items
      if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
        console.log(`   Retrying unprocessed items...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await docClient.send(new BatchWriteCommand({ RequestItems: result.UnprocessedItems }));
      }

      successCount += batch.length;
      process.stdout.write(`\r   Progress: ${successCount}/${items.length} items`);
    } catch (error) {
      console.error(`\n   Batch write error:`, error.message);
      failCount += batch.length;
    }
  }

  console.log(`\n   Migrated ${successCount} ${entityName}, ${failCount} failed`);
  return successCount;
}

// ============================================
// Main Migration Function
// ============================================

async function migrate() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     MongoDB to DynamoDB Migration Script               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  // Check environment variables
  console.log('Checking configuration...');
  const requiredEnvVars = ['MONGO_URI', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'DYNAMODB_TABLE_NAME'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
  console.log('   All environment variables set');
  console.log(`   DynamoDB Table: ${TABLE_NAME}`);
  console.log(`   AWS Region: ${process.env.AWS_REGION}`);
  console.log('');

  const stats = {
    users: 0,
    courses: 0,
    questions: 0,
    tasks: 0,
    taskRecords: 0,
  };

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   Connected to MongoDB');
    console.log('');

    // Create lookup maps for foreign key resolution
    const courseIdMap = new Map();
    const taskIdMap = new Map();

    // ----------------------------------------
    // 1. Migrate Users
    // ----------------------------------------
    console.log('[1/5] Migrating Users...');
    const users = await User.find({}).lean();
    const transformedUsers = users.map(transformUser);
    stats.users = await batchWriteItems(transformedUsers, 'users');
    console.log('');

    // ----------------------------------------
    // 2. Migrate Courses
    // ----------------------------------------
    console.log('[2/5] Migrating Courses...');
    const courses = await Course.find({}).lean();

    courses.forEach(course => {
      courseIdMap.set(course._id.toString(), course.courseId);
    });

    const transformedCourses = courses.map(transformCourse);
    stats.courses = await batchWriteItems(transformedCourses, 'courses');
    console.log('');

    // ----------------------------------------
    // 3. Migrate Questions
    // ----------------------------------------
    console.log('[3/5] Migrating Questions...');
    const questions = await Question.find({}).lean();
    const transformedQuestions = questions.map(transformQuestion);
    stats.questions = await batchWriteItems(transformedQuestions, 'questions');
    console.log('');

    // ----------------------------------------
    // 4. Migrate Tasks
    // ----------------------------------------
    console.log('[4/5] Migrating Tasks...');
    const tasks = await Task.find({}).lean();

    tasks.forEach(task => {
      taskIdMap.set(task._id.toString(), task.taskId);
    });

    const transformedTasks = tasks.map(task => transformTask(task, courseIdMap));
    stats.tasks = await batchWriteItems(transformedTasks, 'tasks');
    console.log('');

    // ----------------------------------------
    // 5. Migrate TaskRecords
    // ----------------------------------------
    console.log('[5/5] Migrating TaskRecords...');
    const taskRecords = await TaskRecord.find({}).lean();
    const transformedRecords = taskRecords.map(record => transformTaskRecord(record, taskIdMap));
    stats.taskRecords = await batchWriteItems(transformedRecords, 'task records');
    console.log('');

    // ----------------------------------------
    // Summary
    // ----------------------------------------
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                 Migration Summary                      ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  Users:        ${stats.users.toString().padStart(5)} migrated                        ║`);
    console.log(`║  Courses:      ${stats.courses.toString().padStart(5)} migrated                        ║`);
    console.log(`║  Questions:    ${stats.questions.toString().padStart(5)} migrated                        ║`);
    console.log(`║  Tasks:        ${stats.tasks.toString().padStart(5)} migrated                        ║`);
    console.log(`║  TaskRecords:  ${stats.taskRecords.toString().padStart(5)} migrated                        ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Migration completed successfully!                     ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify data in AWS Console:');
    console.log('     DynamoDB -> Tables -> UdemyPlatform -> Explore items');
    console.log('  2. Start your backend: npm run dev');
    console.log('  3. Test all API endpoints');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrate();

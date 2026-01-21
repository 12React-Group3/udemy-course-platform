/**
 * DynamoDB client + shared formatters
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import {
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export const TABLE_NAME = process.env.DDB_TABLE_NAME || "UdemyPlatform";

export const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  })
);

export {
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
};

/**
 * ✅ generateId (required by UserDB.js)
 * Simple unique-ish ID for DynamoDB primary keys.
 * (Later, for taskId we’ll use crypto.randomUUID() as you requested.)
 */
export function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 9)
  );
}

/**
 * Format user for API response
 */
export function formatUser(item) {
  if (!item) return null;
  return {
    _id: item.userId,
    userId: item.userId,
    userName: item.userName,
    email: item.email,
    password: item.password,
    profileImage: item.profileImage,
    role: item.role,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format course for API response
 */
export function formatCourse(item) {
  if (!item) return null;
  return {
    _id: item.courseId,
    courseId: item.courseId,
    title: item.title,
    description: item.description,
    videoURL: item.videoURL,
    videoKey: item.videoKey || "",
    instructor: item.instructor,
    instructorId: item.instructorId,
    courseTag: item.courseTag,
    students: item.students || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format question for API response
 */
export function formatQuestion(item) {
  if (!item) return null;
  return {
    _id: item.questionId,
    questionId: item.questionId,
    options: item.options || [],
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    difficulty: item.difficulty,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format task for API response
 */
export function formatTask(item) {
  if (!item) return null;
  return {
    _id: item.taskId,
    taskId: item.taskId,
    courseId: item.courseId,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    type: item.type,
    questions: item.questions || [],
    timeLimitSec: item.timeLimitSec ?? null,
    maxAttempts: item.maxAttempts ?? 1,
    isPublished: Boolean(item.isPublished),
    isLocked: Boolean(item.isLocked),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format task record for API response
 */
export function formatTaskRecord(item) {
  if (!item) return null;
  return {
    _id: `${item.userId}_${item.taskId}`,
    userId: item.userId,
    taskId: item.taskId,

    responses: item.responses || [],

    // keep score for backward compatibility (treat as lastScore)
    score: item.score,
    lastScore: item.lastScore ?? item.score ?? 0,
    bestScore: item.bestScore ?? 0,
    attemptCount: item.attemptCount ?? 0,

    inProgress: Boolean(item.inProgress),
    startedAt: item.startedAt ?? null,
    submittedAt: item.submittedAt ?? null,
    lastSavedAt: item.lastSavedAt ?? null,
    savedResponses: item.savedResponses || [],
    lastQuestionIndex: item.lastQuestionIndex ?? 0,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

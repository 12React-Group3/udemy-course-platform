/**
 * DynamoDB Client & Shared Utilities
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/dynamodb.js';

// Re-export for use in model files
export { docClient, TABLE_NAME };
export { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand };

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ============================================
// Formatters
// ============================================

/**
 * Format user for API response
 */
export function formatUser(item) {
  if (!item) return null;
  return {
    _id: item.userId,
    id: item.userId,
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
    videoKey: item.videoKey || '',
    instructor: item.instructor,
    students: item.students || [],
    courseTag: item.courseTag,
    createdAt: item.createdAt,
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
    score: item.score,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

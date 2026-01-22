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
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../config/dynamodb.js";

export { docClient, TABLE_NAME };
export { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand };

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatUser(item) {
  if (!item) return null;
  return {
    _id: item.userId,
    id: item.userId,
    userName: item.userName,
    email: item.email,
    password: item.password,
    profileImage: item.profileImage || "",
    profileImageKey: item.profileImageKey || "",
    role: item.role,
    enrolledCourses: item.enrolledCourses || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function formatCourse(item) {
  if (!item) return null;

  // prefer courseUid if you ever introduced it, otherwise fallback to courseId
  const courseUid = item.courseUid || item.courseId;

  return {
    _id: courseUid,
    id: courseUid,

    // keep both for compatibility (some frontend uses id, some uses courseId)
    courseUid,
    courseId: item.courseId,

    title: item.title || "",
    description: item.description || "",

  videoURL: item.videoURL || "",
  videoKey: item.videoKey || "",
  thumbnailUrl: item.thumbnailUrl || "",
  thumbnailKey: item.thumbnailKey || "",

  instructor: item.instructor || "",
  instructorId: item.instructorId || "",
  students: item.students || [],
  courseTag: item.courseTag || "",
  isHidden: item.isHidden === true,

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
    taskId: item.taskId,
    questionText: item.questionText || "",
    options: item.options || [],
    correctAnswer: item.correctAnswer || "",
    explanation: item.explanation || "",
    difficulty: item.difficulty || "medium",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function formatTask(item) {
  if (!item) return null;
  const courseUid = item.courseUid || item.courseId || "";
  return {
    _id: item.taskId,
    taskId: item.taskId,
    courseId: item.courseId || courseUid,
    courseUid,
    title: item.title || "",
    description: item.description || "",
    dueDate: item.dueDate || null,
    type: item.type || "quiz",
    createdBy: item.createdBy || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

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

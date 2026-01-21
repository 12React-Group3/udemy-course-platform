// src/api/tasks.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

// Get all tasks
export function fetchAllTasks() {
  return apiClient.get(API_PATHS.TASKS.GET_ALL);
}

// Get task by ID
export function fetchTaskById(taskId) {
  return apiClient.get(API_PATHS.TASKS.GET_BY_ID(taskId));
}

// Get tasks for a specific course
export function fetchTasksByCourse(courseId) {
  return apiClient.get(API_PATHS.TASKS.GET_BY_COURSE(courseId));
}

// Create a new task with questions
export function createTask(taskData) {
  return apiClient.post(API_PATHS.TASKS.CREATE, taskData);
}

// Update a task
export function updateTask(taskId, taskData) {
  return apiClient.put(API_PATHS.TASKS.UPDATE(taskId), taskData);
}

// Delete a task
export function deleteTask(taskId) {
  return apiClient.delete(API_PATHS.TASKS.DELETE(taskId));
}

// Add a question to a task
export function addQuestion(taskId, questionData) {
  return apiClient.post(API_PATHS.TASKS.ADD_QUESTION(taskId), questionData);
}

// Update a question
export function updateQuestion(taskId, questionId, questionData) {
  return apiClient.put(API_PATHS.TASKS.UPDATE_QUESTION(taskId, questionId), questionData);
}

// Delete a question
export function deleteQuestion(taskId, questionId) {
  return apiClient.delete(API_PATHS.TASKS.DELETE_QUESTION(taskId, questionId));
}

// Submit task answers (learner)
export function submitTask(taskId, responses) {
  return apiClient.post(API_PATHS.TASKS.SUBMIT(taskId), { responses });
}

// Get my submissions (learner)
export function fetchMySubmissions() {
  return apiClient.get(API_PATHS.TASKS.MY_SUBMISSIONS);
}

// Get task records (tutor)
export function fetchTaskRecords(taskId) {
  return apiClient.get(API_PATHS.TASKS.GET_RECORDS(taskId));
}

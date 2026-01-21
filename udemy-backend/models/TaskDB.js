/**
 * Task Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  PutCommand,
  QueryCommand,
  formatTask,
} from './client.js';

export const TaskDB = {
  /**
   * Create a new task
   */
  async create({ taskId, courseId, title, description = '', dueDate = null, type, questions = [] }) {
    const now = new Date().toISOString();

    const item = {
      PK: `COURSE#${courseId}`,
      SK: `TASK#${taskId}`,
      GSI1PK: 'ENTITY#TASK',
      GSI1SK: `TASK#${taskId}`,
      entityType: 'TASK',
      taskId,
      courseId,
      title,
      description,
      dueDate,
      type,
      questions,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return formatTask(item);
  },

  /**
   * Find task by ID
   */
  async findById(taskId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#TASK',
        ':sk': `TASK#${taskId}`,
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return formatTask(result.Items[0]);
  },

  /**
   * Get all tasks for a course
   */
  async findByCourseId(courseId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `COURSE#${courseId}`,
        ':sk': 'TASK#',
      },
    }));

    return (result.Items || []).map(formatTask);
  },
};

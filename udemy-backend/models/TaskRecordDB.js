/**
 * TaskRecord Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  GetCommand,
  PutCommand,
  QueryCommand,
  formatTaskRecord,
} from './client.js';

export const TaskRecordDB = {
  /**
   * Create a new task record
   */
  async create({ userId, taskId, responses = [], score = 0 }) {
    const now = new Date().toISOString();

    const item = {
      PK: `USER#${userId}`,
      SK: `TASKRECORD#${taskId}`,
      GSI1PK: `TASK#${taskId}`,
      GSI1SK: `USER#${userId}`,
      entityType: 'TASKRECORD',
      userId,
      taskId,
      responses,
      score,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return formatTaskRecord(item);
  },

  /**
   * Find task records for a user
   */
  async findByUserId(userId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TASKRECORD#',
      },
    }));

    return (result.Items || []).map(formatTaskRecord);
  },

  /**
   * Find specific task record for user
   */
  async findByUserAndTask(userId, taskId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `TASKRECORD#${taskId}`,
      },
    }));

    if (!result.Item) {
      return null;
    }

    return formatTaskRecord(result.Item);
  },

  /**
   * Find all task records for a specific task (using GSI1)
   */
  async findByTaskId(taskId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TASK#${taskId}`,
      },
    }));

    return (result.Items || []).map(formatTaskRecord);
  },
};

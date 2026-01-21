/**
 * Task Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  generateId,
  formatTask,
} from './client.js';

export const TaskDB = {
  /**
   * Create a new task
   */
  async create({ taskId, courseId, title, description = '', dueDate = null, type = 'quiz', createdBy }) {
    const now = new Date().toISOString();
    const tId = taskId || generateId();

    const item = {
      PK: `COURSE#${courseId}`,
      SK: `TASK#${tId}`,
      GSI1PK: 'ENTITY#TASK',
      GSI1SK: `TASK#${tId}`,
      entityType: 'TASK',
      taskId: tId,
      courseId,
      title,
      description,
      dueDate,
      type,
      createdBy,
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

  /**
   * Get all tasks
   */
  async findAll() {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#TASK',
      },
    }));

    return (result.Items || []).map(formatTask);
  },

  /**
   * Get all tasks created by a user (tutor)
   */
  async findByCreator(userId) {
    const allTasks = await this.findAll();
    return allTasks.filter(task => task.createdBy === userId);
  },

  /**
   * Update a task
   */
  async update(courseId, taskId, updates) {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString(),
    };

    if (updates.title !== undefined) {
      updateExpressions.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = updates.title;
    }

    if (updates.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = updates.description;
    }

    if (updates.dueDate !== undefined) {
      updateExpressions.push('dueDate = :dueDate');
      expressionAttributeValues[':dueDate'] = updates.dueDate;
    }

    if (updates.type !== undefined) {
      updateExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = updates.type;
    }

    updateExpressions.push('updatedAt = :updatedAt');

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseId}`,
        SK: `TASK#${taskId}`,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return formatTask(result.Attributes);
  },

  /**
   * Delete a task
   */
  async remove(courseId, taskId) {
    const task = await this.findById(taskId);
    if (!task) {
      return null;
    }

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseId}`,
        SK: `TASK#${taskId}`,
      },
    }));

    return task;
  },
};

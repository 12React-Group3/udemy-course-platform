/**
 * Question Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  generateId,
  formatQuestion,
} from './client.js';

export const QuestionDB = {
  /**
   * Create a new question
   */
  async create({ questionId, taskId, questionText, options = [], correctAnswer, explanation = '', difficulty = 'medium' }) {
    const now = new Date().toISOString();
    const qId = questionId || generateId();

    const item = {
      PK: `TASK#${taskId}`,
      SK: `QUESTION#${qId}`,
      GSI1PK: 'ENTITY#QUESTION',
      GSI1SK: `QUESTION#${qId}`,
      entityType: 'QUESTION',
      questionId: qId,
      taskId,
      questionText,
      options,
      correctAnswer,
      explanation,
      difficulty,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return formatQuestion(item);
  },

  /**
   * Find question by ID
   */
  async findById(questionId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#QUESTION',
        ':sk': `QUESTION#${questionId}`,
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return formatQuestion(result.Items[0]);
  },

  /**
   * Get all questions for a task
   */
  async findByTaskId(taskId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `TASK#${taskId}`,
        ':sk': 'QUESTION#',
      },
    }));

    return (result.Items || []).map(formatQuestion);
  },

  /**
   * Update a question
   */
  async update(taskId, questionId, updates) {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString(),
    };

    if (updates.questionText !== undefined) {
      updateExpressions.push('questionText = :questionText');
      expressionAttributeValues[':questionText'] = updates.questionText;
    }

    if (updates.options !== undefined) {
      updateExpressions.push('#options = :options');
      expressionAttributeNames['#options'] = 'options';
      expressionAttributeValues[':options'] = updates.options;
    }

    if (updates.correctAnswer !== undefined) {
      updateExpressions.push('correctAnswer = :correctAnswer');
      expressionAttributeValues[':correctAnswer'] = updates.correctAnswer;
    }

    if (updates.explanation !== undefined) {
      updateExpressions.push('explanation = :explanation');
      expressionAttributeValues[':explanation'] = updates.explanation;
    }

    if (updates.difficulty !== undefined) {
      updateExpressions.push('difficulty = :difficulty');
      expressionAttributeValues[':difficulty'] = updates.difficulty;
    }

    updateExpressions.push('updatedAt = :updatedAt');

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TASK#${taskId}`,
        SK: `QUESTION#${questionId}`,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return formatQuestion(result.Attributes);
  },

  /**
   * Delete a question
   */
  async remove(taskId, questionId) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `TASK#${taskId}`,
        SK: `QUESTION#${questionId}`,
      },
    }));

    return { questionId, deleted: true };
  },

  /**
   * Delete all questions for a task
   */
  async removeByTaskId(taskId) {
    const questions = await this.findByTaskId(taskId);

    for (const question of questions) {
      await this.remove(taskId, question.questionId);
    }

    return { taskId, deletedCount: questions.length };
  },

  /**
   * Get all questions
   */
  async findAll() {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#QUESTION',
      },
    }));

    return (result.Items || []).map(formatQuestion);
  },
};

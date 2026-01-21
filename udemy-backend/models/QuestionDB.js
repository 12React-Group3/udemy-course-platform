/**
 * Question Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  GetCommand,
  PutCommand,
  QueryCommand,
  formatQuestion,
} from './client.js';

export const QuestionDB = {
  /**
   * Create a new question
   */
  async create({ questionId, options = [], correctAnswer, explanation = '', difficulty }) {
    const now = new Date().toISOString();

    const item = {
      PK: `QUESTION#${questionId}`,
      SK: `QUESTION#${questionId}`,
      GSI1PK: 'ENTITY#QUESTION',
      GSI1SK: `QUESTION#${questionId}`,
      entityType: 'QUESTION',
      questionId,
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
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `QUESTION#${questionId}`,
        SK: `QUESTION#${questionId}`,
      },
    }));

    if (!result.Item) {
      return null;
    }

    return formatQuestion(result.Item);
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

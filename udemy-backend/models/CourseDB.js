/**
 * Course Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  formatCourse,
} from './client.js';

export const CourseDB = {
  /**
   * Create a new course
   */
  async create({
    courseId,
    title,
    description = '',
    videoURL = '',
    videoKey = '',
    instructor,
    courseTag = '',
    students = [],
  }) {
    const now = new Date().toISOString();

    const item = {
      PK: `COURSE#${courseId}`,
      SK: `COURSE#${courseId}`,
      GSI1PK: 'ENTITY#COURSE',
      GSI1SK: `COURSE#${courseId}`,
      entityType: 'COURSE',
      courseId,
      title,
      description,
      videoURL,
      videoKey,
      instructor,
      courseTag,
      students,
      createdAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    return formatCourse(item);
  },

  /**
   * Find course by courseId
   */
  async findByCourseId(courseId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseId}`,
        SK: `COURSE#${courseId}`,
      },
    }));

    if (!result.Item) {
      return null;
    }

    return formatCourse(result.Item);
  },

  /**
   * Get all courses
   */
  async findAll() {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#COURSE',
      },
    }));

    return (result.Items || []).map(formatCourse);
  },

  /**
   * Check if course exists
   */
  async exists(courseId) {
    const course = await this.findByCourseId(courseId);
    return course !== null;
  },

  /**
   * Update course
   */
  async update(courseId, updates) {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (updates.title !== undefined) {
      updateExpressions.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = updates.title;
    }

    if (updates.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = updates.description;
    }

    if (updates.videoURL !== undefined) {
      updateExpressions.push('videoURL = :videoURL');
      expressionAttributeValues[':videoURL'] = updates.videoURL;
    }

    if (updates.students !== undefined) {
      updateExpressions.push('students = :students');
      expressionAttributeValues[':students'] = updates.students;
    }

    if (updateExpressions.length === 0) {
      return await this.findByCourseId(courseId);
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseId}`,
        SK: `COURSE#${courseId}`,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return formatCourse(result.Attributes);
  },
};

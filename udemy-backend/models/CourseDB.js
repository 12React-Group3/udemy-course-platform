/**
 * Course Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  generateId,
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
    const courseUid = generateId();

    const item = {
      PK: `COURSE#${courseUid}`,
      SK: `COURSE#${courseUid}`,
      GSI1PK: 'ENTITY#COURSE',
      GSI1SK: `COURSE#${courseId}`,
      entityType: 'COURSE',
      courseUid,
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
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#COURSE',
        ':sk': `COURSE#${courseId}`,
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return formatCourse(result.Items[0]);
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
    const course = await this.findByCourseId(courseId);
    if (!course) {
      return null;
    }

    const courseKey = course.courseUid || course._id || course.courseId;

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

    if (updates.videoKey !== undefined) {
      updateExpressions.push('videoKey = :videoKey');
      expressionAttributeValues[':videoKey'] = updates.videoKey;
    }

    if (updates.courseTag !== undefined) {
      updateExpressions.push('courseTag = :courseTag');
      expressionAttributeValues[':courseTag'] = updates.courseTag;
    }

    if (updates.instructor !== undefined) {
      updateExpressions.push('instructor = :instructor');
      expressionAttributeValues[':instructor'] = updates.instructor;
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
        PK: `COURSE#${courseKey}`,
        SK: `COURSE#${courseKey}`,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return formatCourse(result.Attributes);
  },

  /**
   * Delete course by courseId
   */
  async remove(courseId) {
    const course = await this.findByCourseId(courseId);
    if (!course) {
      return null;
    }

    const courseKey = course.courseUid || course._id || course.courseId;

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseKey}`,
        SK: `COURSE#${courseKey}`,
      },
    }));

    return course;
  },
};

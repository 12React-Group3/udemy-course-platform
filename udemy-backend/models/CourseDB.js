/**
 * Course Database Operations
 * Primary key: courseUid (system-generated unique ID)
 * courseId is kept for display purposes only (user-friendly name)
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
    instructorId = '',
    courseTag = '',
    students = [],
    isHidden = false,
    thumbnailUrl = "",
    thumbnailKey = "",
  }) {
    const now = new Date().toISOString();
    const courseUid = generateId();

    const item = {
      PK: `COURSE#${courseUid}`,
      SK: `COURSE#${courseUid}`,
      GSI1PK: 'ENTITY#COURSE',
      GSI1SK: `COURSE#${courseUid}`,
      entityType: 'COURSE',
      courseUid,
      courseId, // user-friendly display name only
      title,
      description,
      videoURL,
      videoKey,
      instructor,
      instructorId,
      courseTag,
      students,
      isHidden: isHidden === true,
      createdAt: now,
      thumbnailUrl,
      thumbnailKey,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    return formatCourse(item);
  },

  /**
   * Find course by courseUid (primary method - direct PK lookup)
   */
  async findByCourseUid(courseUid) {
    if (!courseUid) return null;

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseUid}`,
        SK: `COURSE#${courseUid}`,
      },
    }));

    return result.Item ? formatCourse(result.Item) : null;
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
   * Update course by courseUid
   */
  async update(courseUid, updates) {
    if (!courseUid) return null;

    // Verify course exists
    const existing = await this.findByCourseUid(courseUid);
    if (!existing) return null;

    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (updates.title !== undefined) {
      updateExpressions.push("#title = :title");
      expressionAttributeNames["#title"] = "title";
      expressionAttributeValues[":title"] = updates.title;
    }

    if (updates.description !== undefined) {
      updateExpressions.push("description = :description");
      expressionAttributeValues[":description"] = updates.description;
    }

    if (updates.videoURL !== undefined) {
      updateExpressions.push("videoURL = :videoURL");
      expressionAttributeValues[":videoURL"] = updates.videoURL;
    }

    if (updates.videoKey !== undefined) {
      updateExpressions.push("videoKey = :videoKey");
      expressionAttributeValues[":videoKey"] = updates.videoKey;
    }

    if (updates.courseTag !== undefined) {
      updateExpressions.push("courseTag = :courseTag");
      expressionAttributeValues[":courseTag"] = updates.courseTag;
    }

    if (updates.instructor !== undefined) {
      updateExpressions.push("instructor = :instructor");
      expressionAttributeValues[":instructor"] = updates.instructor;
    }

    if (updates.instructorId !== undefined) {
      updateExpressions.push('instructorId = :instructorId');
      expressionAttributeValues[':instructorId'] = updates.instructorId;
    }

    if (updates.students !== undefined) {
      updateExpressions.push("students = :students");
      expressionAttributeValues[":students"] = updates.students;
    }

    if (updates.isHidden !== undefined) {
      updateExpressions.push("isHidden = :isHidden");
      expressionAttributeValues[":isHidden"] = updates.isHidden === true;
    }

    if (updates.thumbnailUrl !== undefined) {
      updateExpressions.push("thumbnailUrl = :thumbnailUrl");
      expressionAttributeValues[":thumbnailUrl"] = updates.thumbnailUrl;
    }

    if (updates.thumbnailKey !== undefined) {
      updateExpressions.push("thumbnailKey = :thumbnailKey");
      expressionAttributeValues[":thumbnailKey"] = updates.thumbnailKey;
    }

    if (updateExpressions.length === 0) return existing;

    // Add updatedAt
    const now = new Date().toISOString();
    updateExpressions.push("updatedAt = :updatedAt");
    expressionAttributeValues[":updatedAt"] = now;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseUid}`,
          SK: `COURSE#${courseUid}`,
        },
        UpdateExpression: "SET " + updateExpressions.join(", "),
        ExpressionAttributeNames:
          Object.keys(expressionAttributeNames).length > 0
            ? expressionAttributeNames
            : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return formatCourse(result.Attributes);
  },

  /**
   * Delete course by courseUid
   */
  async remove(courseUid) {
    if (!courseUid) return null;

    // Read the full item first so we can return it
    const existing = await this.findByCourseUid(courseUid);
    if (!existing) return null;

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseUid}`,
          SK: `COURSE#${courseUid}`,
        },
      })
    );

    return existing;
  },
};

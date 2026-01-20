/**
 * DynamoDB Data Access Layer
 *
 * Replaces Mongoose models with DynamoDB operations
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/dynamodb.js';
import bcrypt from 'bcryptjs';

// ============================================
// User Operations
// ============================================

export const UserDB = {
  /**
   * Create a new user
   */
  async create({ userName, email, password, role = 'learner', profileImage = null }) {
    const userId = generateId();
    const now = new Date().toISOString();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const item = {
      PK: `USER#${userId}`,
      SK: `USER#${userId}`,
      GSI1PK: `EMAIL#${email.toLowerCase()}`,
      GSI1SK: `EMAIL#${email.toLowerCase()}`,
      entityType: 'USER',
      userId,
      userName,
      email: email.toLowerCase(),
      password: hashedPassword,
      profileImage,
      role,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwrite
    }));

    return {
      _id: userId,
      id: userId,
      userName,
      email: email.toLowerCase(),
      role,
      profileImage,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Find user by email (for login)
   */
  async findByEmail(email) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `EMAIL#${email.toLowerCase()}`,
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const user = result.Items[0];
    return formatUser(user);
  },

  /**
   * Find user by ID
   */
  async findById(userId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `USER#${userId}`,
      },
    }));

    if (!result.Item) {
      return null;
    }

    return formatUser(result.Item);
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const now = new Date().toISOString();
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': now,
    };

    // Build dynamic update expression
    if (updates.userName !== undefined) {
      updateExpressions.push('#userName = :userName');
      expressionAttributeNames['#userName'] = 'userName';
      expressionAttributeValues[':userName'] = updates.userName;
    }

    if (updates.email !== undefined) {
      updateExpressions.push('#email = :email');
      updateExpressions.push('GSI1PK = :gsi1pk');
      updateExpressions.push('GSI1SK = :gsi1sk');
      expressionAttributeNames['#email'] = 'email';
      expressionAttributeValues[':email'] = updates.email.toLowerCase();
      expressionAttributeValues[':gsi1pk'] = `EMAIL#${updates.email.toLowerCase()}`;
      expressionAttributeValues[':gsi1sk'] = `EMAIL#${updates.email.toLowerCase()}`;
    }

    if (updates.profileImage !== undefined) {
      updateExpressions.push('profileImage = :profileImage');
      expressionAttributeValues[':profileImage'] = updates.profileImage;
    }

    if (updates.password !== undefined) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updates.password, salt);
      updateExpressions.push('#password = :password');
      expressionAttributeNames['#password'] = 'password';
      expressionAttributeValues[':password'] = hashedPassword;
    }

    updateExpressions.push('updatedAt = :updatedAt');

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `USER#${userId}`,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return formatUser(result.Attributes);
  },

  /**
   * Check if email exists
   */
  async emailExists(email) {
    const user = await this.findByEmail(email);
    return user !== null;
  },

  /**
   * Compare password
   */
  async matchPassword(user, enteredPassword) {
    return await bcrypt.compare(enteredPassword, user.password);
  },
};

// ============================================
// Course Operations
// ============================================

export const CourseDB = {
  /**
   * Create a new course
   */
  async create({
    courseId,
    title,
    description = "",
    videoURL = "",
    videoKey = "",
    instructor,
    courseTag = "",
    students = [],
  }) {
    const now = new Date().toISOString();

    const item = {
      PK: `COURSE#${courseId}`,
      SK: `COURSE#${courseId}`,
      GSI1PK: "ENTITY#COURSE",
      GSI1SK: `COURSE#${courseId}`,
      entityType: "COURSE",
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

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );

    return formatCourse(item);
  },

  /**
   * Find course by courseId
   */
  async findByCourseId(courseId) {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: `COURSE#${courseId}`,
        },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return formatCourse(result.Item);
  },

  /**
   * Get all courses
   */
  async findAll() {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": "ENTITY#COURSE",
        },
      }),
    );

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

    if (updates.students !== undefined) {
      updateExpressions.push("students = :students");
      expressionAttributeValues[":students"] = updates.students;
    }

    if (updateExpressions.length === 0) {
      return await this.findByCourseId(courseId);
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: `COURSE#${courseId}`,
        },
        UpdateExpression: "SET " + updateExpressions.join(", "),
        ExpressionAttributeNames:
          Object.keys(expressionAttributeNames).length > 0
            ? expressionAttributeNames
            : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      }),
    );

    return formatCourse(result.Attributes);
  },
};

// ============================================
// Question Operations
// ============================================

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

// ============================================
// Task Operations
// ============================================

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
    // Need to scan or use GSI since we don't know courseId
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

// ============================================
// TaskRecord Operations
// ============================================

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
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Format user for API response (matches Mongoose format)
 */
function formatUser(item) {
  if (!item) return null;
  return {
    _id: item.userId,
    id: item.userId,
    userName: item.userName,
    email: item.email,
    password: item.password, // Include for password comparison
    profileImage: item.profileImage,
    role: item.role,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format course for API response
 */
function formatCourse(item) {
  if (!item) return null;
  return {
    _id: item.courseId,
    courseId: item.courseId,
    title: item.title,
    description: item.description,
    videoURL: item.videoURL,
    videoKey: item.videoKey || "",
    instructor: item.instructor,
    students: item.students || [],
    courseTag: item.courseTag,
    createdAt: item.createdAt,
  };
}

/**
 * Format question for API response
 */
function formatQuestion(item) {
  if (!item) return null;
  return {
    _id: item.questionId,
    questionId: item.questionId,
    options: item.options || [],
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    difficulty: item.difficulty,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format task for API response
 */
function formatTask(item) {
  if (!item) return null;
  return {
    _id: item.taskId,
    taskId: item.taskId,
    courseId: item.courseId,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    type: item.type,
    questions: item.questions || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Format task record for API response
 */
function formatTaskRecord(item) {
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

export default {
  UserDB,
  CourseDB,
  QuestionDB,
  TaskDB,
  TaskRecordDB,
};

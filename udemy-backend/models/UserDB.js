/**
 * User Database Operations
 */

import bcrypt from 'bcryptjs';
import {
  docClient,
  TABLE_NAME,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  generateId,
  formatUser,
} from './client.js';

export const UserDB = {
  /**
   * Create a new user
   */
  async create({ userName, email, password, role = 'learner', profileImage = null, profileImageKey = null, enrolledCourses = [] }) {
    const userId = generateId();
    const now = new Date().toISOString();

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
      profileImageKey,
      role,
      enrolledCourses,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    return {
      _id: userId,
      id: userId,
      userName,
      email: email.toLowerCase(),
      role,
      profileImage,
      profileImageKey,
      enrolledCourses,
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

    return formatUser(result.Items[0]);
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

    if (updates.profileImageKey !== undefined) {
      updateExpressions.push('profileImageKey = :profileImageKey');
      expressionAttributeValues[':profileImageKey'] = updates.profileImageKey;
    }

    if (updates.enrolledCourses !== undefined) {
      updateExpressions.push('enrolledCourses = :enrolledCourses');
      expressionAttributeValues[':enrolledCourses'] = Array.isArray(updates.enrolledCourses)
        ? updates.enrolledCourses
        : [];
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

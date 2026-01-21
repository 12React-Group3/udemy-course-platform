/**
 * Task Database Operations
 */

import {
  docClient,
  TABLE_NAME,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  formatTask,
} from "./client.js";

export const TaskDB = {
  async create({
    taskId,
    courseId,
    title,
    description = "",
    dueDate = null,
    type = "HOMEWORK",
    questions = [],
    timeLimitSec = null,
    maxAttempts = 1,
    isPublished = false,
    isLocked = false,
  }) {
    const now = new Date().toISOString();

    const item = {
      PK: `COURSE#${courseId}`,
      SK: `TASK#${taskId}`,
      GSI1PK: "ENTITY#TASK",
      GSI1SK: `TASK#${taskId}`,
      entityType: "TASK",
      taskId,
      courseId,
      title,
      description,
      dueDate,
      type,
      questions,
      timeLimitSec,
      maxAttempts,
      isPublished,
      isLocked,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    return formatTask(item);
  },

  async findByCourseAndTask(courseId, taskId) {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: `TASK#${taskId}`,
        },
      })
    );

    return result.Item ? formatTask(result.Item) : null;
  },

  async findByCourseId(courseId) {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `COURSE#${courseId}`,
          ":sk": "TASK#",
        },
      })
    );

    return (result.Items || []).map(formatTask);
  },

  async update(courseId, taskId, updates = {}) {
    const now = new Date().toISOString();

    const sets = ["#updatedAt = :updatedAt"];
    const names = { "#updatedAt": "updatedAt" };
    const values = { ":updatedAt": now };

    const add = (field, val) => {
      sets.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = val;
    };

    if (updates.title !== undefined) add("title", updates.title);
    if (updates.description !== undefined) add("description", updates.description);
    if (updates.dueDate !== undefined) add("dueDate", updates.dueDate);
    if (updates.type !== undefined) add("type", updates.type);
    if (updates.questions !== undefined) add("questions", updates.questions);
    if (updates.timeLimitSec !== undefined) add("timeLimitSec", updates.timeLimitSec);
    if (updates.maxAttempts !== undefined) add("maxAttempts", updates.maxAttempts);
    if (updates.isPublished !== undefined) add("isPublished", updates.isPublished);
    if (updates.isLocked !== undefined) add("isLocked", updates.isLocked);

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: `TASK#${taskId}`,
        },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes ? formatTask(result.Attributes) : null;
  },

  async remove(courseId, taskId) {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: `TASK#${taskId}`,
        },
      })
    );
  },
};

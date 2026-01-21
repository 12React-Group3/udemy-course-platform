/**
 * TaskRecord Database Operations
 *
 * Per-user, per-task progress record.
 * finalScore = bestScore.
 *
 * PK = USER#<userId>
 * SK = TASKRECORD#<taskId>
 * GSI1PK = TASK#<taskId> (class stats)
 * GSI1SK = USER#<userId>
 */

import {
  docClient,
  TABLE_NAME,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  formatTaskRecord,
} from "./client.js";

export const TaskRecordDB = {
  async findByUserAndTask(userId, taskId) {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TASKRECORD#${taskId}`,
        },
      })
    );
    return result.Item ? formatTaskRecord(result.Item) : null;
  },

  async findByTaskId(taskId) {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `TASK#${taskId}`,
        },
      })
    );
    return (result.Items || []).map(formatTaskRecord);
  },

  async upsert(userId, taskId, patch = {}) {
    const now = new Date().toISOString();

    const sets = [
      "#entityType = if_not_exists(#entityType, :entityType)",
      "#userId = if_not_exists(#userId, :userId)",
      "#taskId = if_not_exists(#taskId, :taskId)",
      "#GSI1PK = if_not_exists(#GSI1PK, :gsi1pk)",
      "#GSI1SK = if_not_exists(#GSI1SK, :gsi1sk)",
      "#createdAt = if_not_exists(#createdAt, :createdAt)",
      "#updatedAt = :updatedAt",
    ];

    const names = {
      "#entityType": "entityType",
      "#userId": "userId",
      "#taskId": "taskId",
      "#GSI1PK": "GSI1PK",
      "#GSI1SK": "GSI1SK",
      "#createdAt": "createdAt",
      "#updatedAt": "updatedAt",
    };

    const values = {
      ":entityType": "TASKRECORD",
      ":userId": userId,
      ":taskId": taskId,
      ":gsi1pk": `TASK#${taskId}`,
      ":gsi1sk": `USER#${userId}`,
      ":createdAt": now,
      ":updatedAt": now,
    };

    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      names[`#${k}`] = k;
      values[`:${k}`] = v;
      sets.push(`#${k} = :${k}`);
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TASKRECORD#${taskId}`,
        },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes ? formatTaskRecord(result.Attributes) : null;
  },
};

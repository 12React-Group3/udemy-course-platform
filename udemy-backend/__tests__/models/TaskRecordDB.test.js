import { sendMock, docClient, TABLE_NAME } from "./__mocks__/dynamoMock.js";

vi.mock("../../config/dynamodb.js", () => ({
  docClient,
  TABLE_NAME,
  default: docClient,
}));

import { TaskRecordDB } from "../../models/TaskRecordDB.js";

describe("TaskRecordDB", () => {
  beforeEach(() => sendMock.mockReset());

  it("create writes record under USER partition key and GSI by TASK", async () => {
    sendMock.mockResolvedValueOnce({});

    const rec = await TaskRecordDB.create({
      userId: "u1",
      taskId: "t1",
      responses: [{ questionId: "q1", answer: "A", isCorrect: true }],
      score: 100,
    });

    expect(rec.userId).toBe("u1");
    expect(rec.taskId).toBe("t1");
    expect(rec.score).toBe(100);

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Item.PK).toBe("USER#u1");
    expect(cmd.input.Item.SK).toBe("TASKRECORD#t1");
    expect(cmd.input.Item.GSI1PK).toBe("TASK#t1");
    expect(cmd.input.Item.GSI1SK).toBe("USER#u1");
  });

  it("findByUserAndTask returns null if no item", async () => {
    sendMock.mockResolvedValueOnce({ Item: undefined });

    const rec = await TaskRecordDB.findByUserAndTask("u1", "t1");
    expect(rec).toBeNull();
  });

  it("findByUserId queries begins_with TASKRECORD#", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const recs = await TaskRecordDB.findByUserId("u1");
    expect(recs).toEqual([]);

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.KeyConditionExpression).toContain("begins_with");
    expect(cmd.input.ExpressionAttributeValues[":sk"]).toBe("TASKRECORD#");
  });
});

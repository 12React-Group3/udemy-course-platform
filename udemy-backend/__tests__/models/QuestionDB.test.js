import { sendMock, docClient, TABLE_NAME } from "./__mocks__/dynamoMock.js";

vi.mock("../../config/dynamodb.js", () => ({
  docClient,
  TABLE_NAME,
  default: docClient,
}));

import { QuestionDB } from "../../models/QuestionDB.js";

describe("QuestionDB", () => {
  beforeEach(() => sendMock.mockReset());

  it("create writes question under TASK partition key", async () => {
    sendMock.mockResolvedValueOnce({});

    const q = await QuestionDB.create({
      taskId: "t1",
      questionText: "2+2?",
      options: ["3", "4"],
      correctAnswer: "4",
    });

    expect(q.taskId).toBe("t1");
    expect(q.correctAnswer).toBe("4");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Item.PK).toBe("TASK#t1");
    expect(cmd.input.Item.SK).toMatch(/^QUESTION#/);
    expect(cmd.input.Item.GSI1PK).toBe("ENTITY#QUESTION");
  });

  it("findByTaskId queries begins_with QUESTION#", async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        {
          questionId: "q1",
          taskId: "t1",
          questionText: "x",
          options: [],
          correctAnswer: "a",
          explanation: "",
          difficulty: "medium",
          createdAt: "x",
          updatedAt: "y",
          PK: "TASK#t1",
          SK: "QUESTION#q1",
        },
      ],
    });

    const qs = await QuestionDB.findByTaskId("t1");
    expect(qs.length).toBe(1);
    expect(qs[0].questionId).toBe("q1");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.KeyConditionExpression).toContain("begins_with(SK, :sk)");
    expect(cmd.input.ExpressionAttributeValues[":sk"]).toBe("QUESTION#");
  });

  it("removeByTaskId deletes each question found", async () => {
    // 1) findByTaskId
    sendMock.mockResolvedValueOnce({
      Items: [
        { questionId: "q1", taskId: "t1", PK: "TASK#t1", SK: "QUESTION#q1" },
        { questionId: "q2", taskId: "t1", PK: "TASK#t1", SK: "QUESTION#q2" },
      ],
    });
    // 2) delete q1
    sendMock.mockResolvedValueOnce({});
    // 3) delete q2
    sendMock.mockResolvedValueOnce({});

    const result = await QuestionDB.removeByTaskId("t1");
    expect(result.deletedCount).toBe(2);

    // total calls = 3 (1 query + 2 deletes)
    expect(sendMock).toHaveBeenCalledTimes(3);
  });
});

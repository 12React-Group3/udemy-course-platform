// __tests__/models/QuestionDB.test.js
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

  it("findById returns null when no items", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const q = await QuestionDB.findById("q1");
    expect(q).toBeNull();
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
    expect(cmd.input.ExpressionAttributeValues[":sk"]).toBe("QUESTION#");
  });

  it("update sends UpdateCommand with correct Key", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        questionId: "q1",
        taskId: "t1",
        questionText: "new",
        options: ["A"],
        correctAnswer: "A",
        createdAt: "x",
        updatedAt: "y",
      },
    });

    const updated = await QuestionDB.update("t1", "q1", { questionText: "new" });
    expect(updated.questionText).toBe("new");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Key).toEqual({ PK: "TASK#t1", SK: "QUESTION#q1" });
  });

  it("remove deletes by taskId/questionId key", async () => {
    sendMock.mockResolvedValueOnce({});

    const result = await QuestionDB.remove("t1", "q1");
    expect(result).toEqual({ questionId: "q1", deleted: true });

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Key).toEqual({ PK: "TASK#t1", SK: "QUESTION#q1" });
  });

  it("removeByTaskId deletes each question found", async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        { questionId: "q1", taskId: "t1", PK: "TASK#t1", SK: "QUESTION#q1" },
        { questionId: "q2", taskId: "t1", PK: "TASK#t1", SK: "QUESTION#q2" },
      ],
    });
    sendMock.mockResolvedValueOnce({});
    sendMock.mockResolvedValueOnce({});

    const result = await QuestionDB.removeByTaskId("t1");
    expect(result.deletedCount).toBe(2);
    expect(sendMock).toHaveBeenCalledTimes(3);
  });
});

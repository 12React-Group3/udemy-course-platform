// __tests__/models/TaskDB.test.js
import { sendMock, docClient, TABLE_NAME } from "./__mocks__/dynamoMock.js";

vi.mock("../../config/dynamodb.js", () => ({
  docClient,
  TABLE_NAME,
  default: docClient,
}));

import { TaskDB } from "../../models/TaskDB.js";

describe("TaskDB", () => {
  beforeEach(() => sendMock.mockReset());

  it("create writes PutCommand under COURSE#courseUid", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    sendMock.mockResolvedValueOnce({});

    const task = await TaskDB.create({
      courseUid: "cuid1",
      title: "HW1",
      createdBy: "u1",
    });

    expect(task.courseUid).toBe("cuid1");
    expect(task.courseId).toBe("cuid1"); // fallback behavior
    expect(task.title).toBe("HW1");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Item.PK).toBe("COURSE#cuid1");
    expect(cmd.input.Item.SK).toMatch(/^TASK#/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("findById returns null when not found", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });
    const task = await TaskDB.findById("t1");
    expect(task).toBeNull();
  });

  it("findByCourseUid queries begins_with TASK#", async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        {
          taskId: "t1",
          courseUid: "cuid1",
          title: "HW",
          description: "",
          dueDate: null,
          type: "quiz",
          createdBy: "u1",
          createdAt: "x",
          updatedAt: "y",
          PK: "COURSE#cuid1",
          SK: "TASK#t1",
        },
      ],
    });

    const tasks = await TaskDB.findByCourseUid("cuid1");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskId).toBe("t1");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.KeyConditionExpression).toContain("begins_with");
    expect(cmd.input.ExpressionAttributeValues[":pk"]).toBe("COURSE#cuid1");
  });

  it("findAll queries GSI1 ENTITY#TASK", async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        {
          taskId: "t1",
          courseUid: "cuid1",
          title: "HW",
          entityType: "TASK",
          GSI1PK: "ENTITY#TASK",
          GSI1SK: "TASK#t1",
          createdAt: "x",
          updatedAt: "y",
        },
      ],
    });

    const tasks = await TaskDB.findAll();
    expect(tasks).toHaveLength(1);

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.IndexName).toBe("GSI1");
    expect(cmd.input.ExpressionAttributeValues[":pk"]).toBe("ENTITY#TASK");
  });

  it("findByCreator filters results from findAll", async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        { taskId: "t1", courseUid: "c1", createdBy: "u1", title: "A", createdAt: "x", updatedAt: "y" },
        { taskId: "t2", courseUid: "c2", createdBy: "u2", title: "B", createdAt: "x", updatedAt: "y" },
      ],
    });

    const mine = await TaskDB.findByCreator("u1");
    expect(mine).toHaveLength(1);
    expect(mine[0].taskId).toBe("t1");
  });

  it("update sends UpdateCommand with correct Key", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        taskId: "t1",
        courseUid: "cuid1",
        title: "HW1 updated",
        description: "",
        dueDate: null,
        type: "quiz",
        createdBy: "u1",
        createdAt: "x",
        updatedAt: "y",
      },
    });

    const updated = await TaskDB.update("cuid1", "t1", { title: "HW1 updated" });
    expect(updated.title).toBe("HW1 updated");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Key).toEqual({ PK: "COURSE#cuid1", SK: "TASK#t1" });
    expect(cmd.input.UpdateExpression).toContain("#title = :title");
  });

  it("remove returns null if task not found", async () => {
    // remove() calls findById first (Query GSI1)
    sendMock.mockResolvedValueOnce({ Items: [] });

    const removed = await TaskDB.remove("cuid1", "t1");
    expect(removed).toBeNull();
  });
});

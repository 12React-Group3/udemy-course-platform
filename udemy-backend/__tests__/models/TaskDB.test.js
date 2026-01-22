import { sendMock, docClient, TABLE_NAME } from "./__mocks__/dynamoMock.js";

vi.mock("../../config/dynamodb.js", () => ({
  docClient,
  TABLE_NAME,
  default: docClient,
}));

import { TaskDB } from "../../models/TaskDB.js";

describe("TaskDB", () => {
  beforeEach(() => sendMock.mockReset());

  it("create writes PutCommand with COURSE partition key", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    vi.spyOn(Math, "random").mockReturnValue(0.2);

    sendMock.mockResolvedValueOnce({});

    const task = await TaskDB.create({
      courseId: "C1",
      title: "HW1",
      createdBy: "u1",
    });

    expect(task.courseId).toBe("C1");
    expect(task.title).toBe("HW1");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Item.PK).toBe("COURSE#C1");
    expect(cmd.input.Item.SK).toMatch(/^TASK#/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("findById returns null when not found", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const task = await TaskDB.findById("t1");
    expect(task).toBeNull();
  });

  it("update sends UpdateCommand with correct Key", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        taskId: "t1",
        courseId: "C1",
        title: "HW1 updated",
        description: "",
        dueDate: null,
        type: "quiz",
        createdBy: "u1",
        createdAt: "x",
        updatedAt: "y",
      },
    });

    const updated = await TaskDB.update("C1", "t1", { title: "HW1 updated" });
    expect(updated.title).toBe("HW1 updated");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Key).toEqual({ PK: "COURSE#C1", SK: "TASK#t1" });
    expect(cmd.input.UpdateExpression).toContain("#title = :title");
  });
});

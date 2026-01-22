import { sendMock, docClient, TABLE_NAME } from "./__mocks__/dynamoMock.js";

vi.mock("../../config/dynamodb.js", () => ({
  docClient,
  TABLE_NAME,
  default: docClient,
}));

import { CourseDB } from "../../models/CourseDB.js";

describe("CourseDB", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("findByCourseId returns null when no items", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const course = await CourseDB.findByCourseId("C1");
    expect(course).toBeNull();

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.TableName).toBe(TABLE_NAME);
    expect(cmd.input.IndexName).toBe("GSI1");
  });

  it("create sends PutCommand with expected attributes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456);

    sendMock.mockResolvedValueOnce({});

    const created = await CourseDB.create({
      courseId: "C1",
      title: "Intro",
      instructor: "u1",
    });

    expect(created).toMatchObject({
      courseId: "C1",
      title: "Intro",
      instructor: "u1",
    });

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.TableName).toBe(TABLE_NAME);
    expect(cmd.input.ConditionExpression).toBe("attribute_not_exists(PK)");
    expect(cmd.input.Item.GSI1PK).toBe("ENTITY#COURSE");
    expect(cmd.input.Item.GSI1SK).toBe("COURSE#C1");
    expect(cmd.input.Item.PK).toMatch(/^COURSE#/);
    expect(cmd.input.Item.SK).toMatch(/^COURSE#/);

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("update returns null if course not found", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] }); // findByCourseId

    const updated = await CourseDB.update("C1", { title: "New" });
    expect(updated).toBeNull();
  });

  it("remove returns null if course not found", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] }); // findByCourseId

    const removed = await CourseDB.remove("C1");
    expect(removed).toBeNull();
  });
});

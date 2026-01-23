// __tests__/models/UserDB.test.js
import { sendMock, docClient, TABLE_NAME } from "./__mocks__/dynamoMock.js";

vi.mock("../../config/dynamodb.js", () => ({
  docClient,
  TABLE_NAME,
  default: docClient,
}));

vi.mock("bcryptjs", () => ({
  default: {
    genSalt: vi.fn(async () => "salt"),
    hash: vi.fn(async (pw) => `hashed:${pw}`),
    compare: vi.fn(async (entered, stored) => stored === `hashed:${entered}`),
  },
}));

import { UserDB } from "../../models/UserDB.js";
import bcrypt from "bcryptjs";

describe("UserDB", () => {
  beforeEach(() => sendMock.mockReset());

  it("create hashes password and writes PutCommand", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    sendMock.mockResolvedValueOnce({});

    const user = await UserDB.create({
      userName: "Henry",
      email: "H@TEST.com",
      password: "secret",
      role: "learner",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("secret", "salt");
    expect(user.email).toBe("h@test.com");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.TableName).toBe(TABLE_NAME);
    expect(cmd.input.ConditionExpression).toBe("attribute_not_exists(PK)");
    expect(cmd.input.Item.GSI1PK).toBe("EMAIL#h@test.com");
    expect(cmd.input.Item.password).toBe("hashed:secret");

    Date.now.mockRestore();
    Math.random.mockRestore();
  });

  it("findByEmail returns null when not found", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const user = await UserDB.findByEmail("none@test.com");
    expect(user).toBeNull();
  });

  it("findById returns null when no Item", async () => {
    sendMock.mockResolvedValueOnce({ Item: undefined });

    const user = await UserDB.findById("u1");
    expect(user).toBeNull();
  });

  it("matchPassword uses bcrypt.compare", async () => {
    const ok = await UserDB.matchPassword({ password: "hashed:abc" }, "abc");
    expect(ok).toBe(true);

    const no = await UserDB.matchPassword({ password: "hashed:abc" }, "wrong");
    expect(no).toBe(false);
  });

  it("updateProfile hashes new password when updates.password provided", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        userId: "u1",
        userName: "Henry",
        email: "h@test.com",
        password: "hashed:newpw",
        role: "learner",
        enrolledCourses: [],
        createdAt: "x",
        updatedAt: "y",
      },
    });

    const updated = await UserDB.updateProfile("u1", { password: "newpw" });

    expect(bcrypt.hash).toHaveBeenCalledWith("newpw", "salt");
    expect(updated.password).toBe("hashed:newpw");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Key.PK).toBe("USER#u1");
    expect(cmd.input.UpdateExpression).toContain("#password = :password");
  });

  it("findAll scans for entityType USER", async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const users = await UserDB.findAll();
    expect(users).toEqual([]);

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.FilterExpression).toContain("entityType");
  });

  it("delete returns null if user not found", async () => {
    // delete() calls findById first
    sendMock.mockResolvedValueOnce({ Item: undefined });

    const deleted = await UserDB.delete("u1");
    expect(deleted).toBeNull();
  });

  it("updateRole updates role and updatedAt", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        userId: "u1",
        userName: "Henry",
        email: "h@test.com",
        password: "hashed:x",
        role: "tutor",
        enrolledCourses: [],
        createdAt: "x",
        updatedAt: "y",
      },
    });

    const updated = await UserDB.updateRole("u1", "tutor");
    expect(updated.role).toBe("tutor");

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.UpdateExpression).toContain("#role = :role");
  });

  it("findByIds returns only existing users", async () => {
    // findByIds calls findById multiple times -> multiple GetCommand results
    sendMock
      .mockResolvedValueOnce({ Item: { userId: "u1", userName: "A", email: "a@test.com", password: "p", role: "learner", createdAt: "x", updatedAt: "y" } })
      .mockResolvedValueOnce({ Item: undefined });

    const users = await UserDB.findByIds(["u1", "u2"]);
    expect(users).toHaveLength(1);
    expect(users[0]._id).toBe("u1");
  });
});

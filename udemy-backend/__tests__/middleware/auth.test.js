// __tests__/middleware/auth.test.js
import { mockRes, mockNext } from "../utils/testUtils.js";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  UserDB: { findById: vi.fn() },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: mocks.verify },
}));

vi.mock("../../models/index.js", () => ({
  UserDB: mocks.UserDB,
}));

import protect from "../../middleware/auth.js";

describe("protect middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "testsecret";
  });

  it("401 if no authorization header", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 if authorization not Bearer", async () => {
    const req = { headers: { authorization: "Token abc" } };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 if token expired", async () => {
    mocks.verify.mockImplementation(() => {
      const e = new Error("expired");
      e.name = "TokenExpiredError";
      throw e;
    });

    const req = { headers: { authorization: "Bearer expired" } };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Token expired", statusCode: 401 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("401 if token invalid (JsonWebTokenError)", async () => {
    mocks.verify.mockImplementation(() => {
      const e = new Error("bad token");
      e.name = "JsonWebTokenError";
      throw e;
    });

    const req = { headers: { authorization: "Bearer bad" } };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid token", statusCode: 401 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("401 if token ok but user not found", async () => {
    mocks.verify.mockReturnValue({ id: "u1" });
    mocks.UserDB.findById.mockResolvedValueOnce(null);

    const req = { headers: { authorization: "Bearer good" } };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "User not found", statusCode: 401 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next on success", async () => {
    mocks.verify.mockReturnValue({ id: "u1" });
    mocks.UserDB.findById.mockResolvedValueOnce({
      _id: "u1",
      userName: "Henry",
      email: "h@test.com",
      role: "learner",
      profileImage: null,
    });

    const req = { headers: { authorization: "Bearer good" } };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(req.user).toMatchObject({
      id: "u1",
      userName: "Henry",
      email: "h@test.com",
      role: "learner",
    });
    expect(next).toHaveBeenCalled();
  });
});

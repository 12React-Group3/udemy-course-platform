import { mockRes, mockNext } from "../utils/testUtils.js";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));


vi.mock("../../models/index.js", () => ({
  UserDB: { findById: vi.fn() },
}));

import jwt from "jsonwebtoken";
import protect from "../../middleware/auth.js";
import { UserDB } from "../../models/index.js";

describe("protect middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "testsecret";
  });

  it("401 if no token", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 if invalid token", async () => {
    jwt.verify.mockImplementation(() => {
      const e = new Error("bad");
      e.name = "JsonWebTokenError";
      throw e;
    });

    const req = { headers: { authorization: "Bearer xxx" } };
    const res = mockRes();
    const next = mockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next on success", async () => {
    jwt.verify.mockReturnValue({ id: "u1" });
    UserDB.findById.mockResolvedValue({
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

    expect(req.user).toMatchObject({ id: "u1", role: "learner" });
    expect(next).toHaveBeenCalled();
  });
});

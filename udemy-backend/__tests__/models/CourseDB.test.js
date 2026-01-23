// __tests__/middleware/errorHandler.test.js
import errorHandler from "../../middleware/errorHandler.js";
import { mockRes } from "../utils/testUtils.js";

describe("errorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("defaults to 500", () => {
    const err = new Error("boom");
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "boom",
        statusCode: 500,
      })
    );
  });

  it("handles JsonWebTokenError -> 401", () => {
    const err = new Error("bad token");
    err.name = "JsonWebTokenError";

    const res = mockRes();
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        error: "Invalid token. Please log in again",
      })
    );
  });

  it("handles multer LIMIT_FILE_SIZE -> 400", () => {
    const err = new Error("too big");
    err.code = "LIMIT_FILE_SIZE";

    const res = mockRes();
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: "File size is too large. Max limit is 10MB",
      })
    );
  });

  it("handles CastError -> 404", () => {
    const err = new Error("cast");
    err.name = "CastError";
    err.value = "abc123";

    const res = mockRes();
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
      })
    );
  });

  it("handles duplicate key 11000 -> 400", () => {
    const err = new Error("dup");
    err.code = 11000;
    err.keyValue = { email: "x@test.com" };

    const res = mockRes();
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      })
    );
  });

  it("handles ValidationError -> 400", () => {
    const err = new Error("validation");
    err.name = "ValidationError";
    err.errors = {
      email: { message: "Email required" },
      password: { message: "Password required" },
    };

    const res = mockRes();
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: expect.stringContaining("Email required"),
      })
    );
  });
});

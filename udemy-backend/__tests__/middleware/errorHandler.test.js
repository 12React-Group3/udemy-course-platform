import errorHandler from "../../middleware/errorHandler.js";
import { mockRes } from "../utils/testUtils.js";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe("errorHandler", () => {
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

  it("handles JsonWebTokenError", () => {
    const err = new Error("bad token");
    err.name = "JsonWebTokenError";
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Invalid token. Please log in again",
      })
    );
  });

  it("handles multer LIMIT_FILE_SIZE", () => {
    const err = new Error("too big");
    err.code = "LIMIT_FILE_SIZE";
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

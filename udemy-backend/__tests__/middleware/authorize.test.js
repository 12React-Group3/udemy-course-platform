import { authorize } from "../../middleware/authorize.js";
import { mockRes, mockNext } from "../utils/testUtils.js";

describe("authorize middleware", () => {
  it("401 if no req.user", () => {
    const req = {};
    const res = mockRes();
    const next = mockNext();

    authorize("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("403 if role not allowed", () => {
    const req = { user: { role: "learner" } };
    const res = mockRes();
    const next = mockNext();

    authorize("admin", "tutor")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next if allowed", () => {
    const req = { user: { role: "tutor" } };
    const res = mockRes();
    const next = mockNext();

    authorize("admin", "tutor")(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

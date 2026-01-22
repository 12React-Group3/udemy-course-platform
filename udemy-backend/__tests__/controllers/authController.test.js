import { mockRes, mockNext } from "../utils/testUtils.js";

vi.mock("../../models/index.js", () => ({
  UserDB: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    matchPassword: vi.fn(),
    findById: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "token123"),
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async () => "https://signed-avatar"),
}));

vi.mock("../../config/s3.js", () => ({
  s3Client: { send: vi.fn() },
  S3_BUCKET_NAME: undefined, // force attachAvatarUrl to do nothing
}));

import { UserDB } from "../../models/index.js";
import { login, changePassword } from "../../controllers/authController.js";

describe("authController", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "testsecret";
  });

  it("login: 400 if missing email/password", async () => {
    const req = { body: {} };
    const res = mockRes();
    const next = mockNext();

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("login: 401 if user not found", async () => {
    UserDB.findByEmail.mockResolvedValueOnce(null);

    const req = { body: { email: "a@test.com", password: "123456" } };
    const res = mockRes();
    const next = mockNext();

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("changePassword: 401 if current password wrong", async () => {
    UserDB.findById.mockResolvedValueOnce({ _id: "u1" });
    UserDB.matchPassword.mockResolvedValueOnce(false);

    const req = { user: { id: "u1" }, body: { currentPassword: "old", newPassword: "new" } };
    const res = mockRes();
    const next = mockNext();

    await changePassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(UserDB.updateProfile).not.toHaveBeenCalled();
  });

  it("changePassword: 200 when correct", async () => {
    UserDB.findById.mockResolvedValueOnce({ _id: "u1" });
    UserDB.matchPassword.mockResolvedValueOnce(true);
    UserDB.updateProfile.mockResolvedValueOnce({});

    const req = { user: { id: "u1" }, body: { currentPassword: "old", newPassword: "new" } };
    const res = mockRes();
    const next = mockNext();

    await changePassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(UserDB.updateProfile).toHaveBeenCalledWith("u1", { password: "new" });
  });
});

it("login: 200 when password matches", async () => {
  UserDB.findByEmail.mockResolvedValueOnce({
    _id: "u1",
    userName: "Henry",
    email: "a@test.com",
    role: "learner",
    password: "hashed:any",
    profileImage: null,
    profileImageKey: null,
    enrolledCourses: [],
    createdAt: "x",
    updatedAt: "y",
  });

  // IMPORTANT: controller calls UserDB.matchPassword(user, password)
  UserDB.matchPassword.mockResolvedValueOnce(true);

  const req = { body: { email: "a@test.com", password: "123456" } };
  const res = mockRes();
  const next = mockNext();

  await login(req, res, next);

  // If this fails, we know it threw
  expect(next).not.toHaveBeenCalled();

  expect(res.status).toHaveBeenCalledWith(200);

  const payload = res.json.mock.calls[0][0];
  expect(payload.success).toBe(true);
  expect(payload.token).toBe("token123");
});



import { getProfile } from "../../controllers/authController.js";

it("getProfile: 404 if user not found", async () => {
  UserDB.findById.mockResolvedValueOnce(null);

  const req = { user: { id: "u1" } };
  const res = mockRes();
  const next = mockNext();

  await getProfile(req, res, next);

  expect(res.status).toHaveBeenCalledWith(404);
});

import { updateProfile } from "../../controllers/authController.js";

it("updateProfile: 200 updates userName/email", async () => {
  UserDB.updateProfile.mockResolvedValueOnce({
    _id: "u1",
    userName: "New",
    email: "new@test.com",
    role: "learner",
    enrolledCourses: [],
    createdAt: "x",
    updatedAt: "y",
  });

  const req = { user: { id: "u1" }, body: { userName: "New", email: "new@test.com" } };
  const res = mockRes();
  const next = mockNext();

  await updateProfile(req, res, next);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(UserDB.updateProfile).toHaveBeenCalledWith("u1", expect.objectContaining({
    userName: "New",
    email: "new@test.com",
  }));
});

import { register } from "../../controllers/authController.js";

it("register: 400 if user already exists", async () => {
  UserDB.findByEmail.mockResolvedValueOnce({ _id: "u1" });

  const req = { body: { userName: "H", email: "a@test.com", password: "123456", role: "learner" } };
  const res = mockRes();
  const next = mockNext();

  await register(req, res, next);

  expect(res.status).toHaveBeenCalledWith(400);
});

it("getProfile: 200 returns hydrated user", async () => {
  UserDB.findById.mockResolvedValueOnce({
    _id: "u1",
    userName: "Henry",
    email: "a@test.com",
    role: "learner",
    profileImage: null,
    profileImageKey: null,
    enrolledCourses: [],
    createdAt: "x",
    updatedAt: "y",
  });

  const req = { user: { id: "u1" } };
  const res = mockRes();
  const next = mockNext();

  await getProfile(req, res, next);

  expect(res.status).toHaveBeenCalledWith(200);
});

it("register: 201 success when new user", async () => {
  UserDB.findByEmail.mockResolvedValueOnce(null);
  UserDB.create.mockResolvedValueOnce({
    _id: "u1",
    userName: "Henry",
    email: "a@test.com",
    role: "learner",
    profileImage: null,
    profileImageKey: null,
    enrolledCourses: [],
  });

  const req = { body: { userName: "Henry", email: "a@test.com", password: "123456", role: "learner" } };
  const res = mockRes();
  const next = mockNext();

  await register(req, res, next);

  expect(res.status).toHaveBeenCalledWith(201);
  const payload = res.json.mock.calls[0][0];
  expect(payload.success).toBe(true);
  expect(payload.data.user.email).toBe("a@test.com");
});

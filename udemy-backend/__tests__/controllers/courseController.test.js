import { mockRes } from "../utils/testUtils.js";

vi.mock("../../models/index.js", () => ({
  CourseDB: {
    findByCourseId: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  UserDB: {
    findById: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock("../../config/s3.js", () => ({
  s3Client: { send: vi.fn() },
  S3_BUCKET_NAME: "test-bucket",
}));

import { CourseDB, UserDB } from "../../models/index.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  presignVideoUpload,
  createCourse,
  deleteCourse,
  subscribeCourse,
  unsubscribeCourse,
} from "../../controllers/courseController.js";

describe("courseController", () => {
  it("presignVideoUpload: 400 missing fields", async () => {
    const req = { body: {} };
    const res = mockRes();

    await presignVideoUpload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("presignVideoUpload: 400 not mp4", async () => {
    const req = { body: { courseId: "C1", fileName: "a.mov", contentType: "video/quicktime" } };
    const res = mockRes();

    await presignVideoUpload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("presignVideoUpload: 200 returns uploadUrl and fileUrl", async () => {
    process.env.AWS_REGION = "us-west-2";
    getSignedUrl.mockResolvedValueOnce("https://signed-upload");

    const req = { body: { courseId: "C1", fileName: "a.mp4", contentType: "video/mp4" } };
    const res = mockRes();

    await presignVideoUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.uploadUrl).toBe("https://signed-upload");
    expect(payload.data.fileUrl).toContain("test-bucket.s3.us-west-2.amazonaws.com/");
  });

  it("createCourse: 409 if course exists", async () => {
    CourseDB.findByCourseId.mockResolvedValueOnce({ courseId: "C1" });
    const req = { body: { courseId: "C1", title: "t", instructor: "u1" } };
    const res = mockRes();

    await createCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("deleteCourse: 404 if not found", async () => {
    CourseDB.remove.mockResolvedValueOnce(null);

    const req = { params: { courseId: "C1" } };
    const res = mockRes();

    await deleteCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("subscribeCourse: adds courseId to user + userId to course", async () => {
    CourseDB.findByCourseId.mockResolvedValueOnce({ courseId: "C1", students: [] });
    UserDB.findById.mockResolvedValueOnce({ _id: "u1", enrolledCourses: [] });
    UserDB.updateProfile.mockResolvedValueOnce({ _id: "u1", enrolledCourses: ["C1"] });
    CourseDB.update.mockResolvedValueOnce({ courseId: "C1", students: ["u1"] });

    const req = { params: { courseId: "C1" }, user: { id: "u1" } };
    const res = mockRes();

    await subscribeCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(UserDB.updateProfile).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ enrolledCourses: ["C1"] })
    );
    expect(CourseDB.update).toHaveBeenCalledWith(
      "C1",
      expect.objectContaining({ students: ["u1"] })
    );
  });

  it("unsubscribeCourse: removes ids", async () => {
    CourseDB.findByCourseId.mockResolvedValueOnce({ courseId: "C1", students: ["u1"] });
    UserDB.findById.mockResolvedValueOnce({ _id: "u1", enrolledCourses: ["C1"] });
    UserDB.updateProfile.mockResolvedValueOnce({ _id: "u1", enrolledCourses: [] });
    CourseDB.update.mockResolvedValueOnce({ courseId: "C1", students: [] });

    const req = { params: { courseId: "C1" }, user: { id: "u1" } };
    const res = mockRes();

    await unsubscribeCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

import { getCourseByCourseId } from "../../controllers/courseController.js";

it("getCourseByCourseId: 404 if not found", async () => {
  CourseDB.findByCourseId.mockResolvedValueOnce(null);

  const req = { params: { courseId: "C1" } };
  const res = mockRes();

  await getCourseByCourseId(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
});

it("getCourseByCourseId: 200 returns course", async () => {
  CourseDB.findByCourseId.mockResolvedValueOnce({ courseId: "C1", title: "Intro" });

  const req = { params: { courseId: "C1" } };
  const res = mockRes();

  await getCourseByCourseId(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

import { updateCourse } from "../../controllers/courseController.js";

it("updateCourse: 400 if no valid fields", async () => {
  const req = { params: { courseId: "C1" }, body: {} };
  const res = mockRes();

  await updateCourse(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
});

it("updateCourse: 404 if course not found", async () => {
  CourseDB.update.mockResolvedValueOnce(null);

  const req = { params: { courseId: "C1" }, body: { title: "New" } };
  const res = mockRes();

  await updateCourse(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
});

it("updateCourse: 200 when updated", async () => {
  CourseDB.update.mockResolvedValueOnce({ courseId: "C1", title: "New" });

  const req = { params: { courseId: "C1" }, body: { title: "New" } };
  const res = mockRes();

  await updateCourse(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
});

import { getCourseVideoUrl } from "../../controllers/courseController.js";

it("getCourseVideoUrl: 404 if course not found", async () => {
  CourseDB.findByCourseId.mockResolvedValueOnce(null);

  const req = { params: { courseId: "C1" } };
  const res = mockRes();

  await getCourseVideoUrl(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
});

it("getCourseVideoUrl: 400 if course has no videoKey", async () => {
  CourseDB.findByCourseId.mockResolvedValueOnce({ courseId: "C1", videoKey: "" });

  const req = { params: { courseId: "C1" } };
  const res = mockRes();

  await getCourseVideoUrl(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
});

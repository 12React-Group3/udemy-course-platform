// __tests__/controllers/courseController.test.js
import { mockRes } from "../utils/testUtils.js";

const mocks = vi.hoisted(() => ({
  CourseDB: {
    findByCourseUid: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  UserDB: {
    findById: vi.fn(),
    updateProfile: vi.fn(),
  },
  getSignedUrlMock: vi.fn(),
}));

vi.mock("../../models/index.js", () => ({
  CourseDB: mocks.CourseDB,
  UserDB: mocks.UserDB,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrlMock,
}));

vi.mock("../../config/s3.js", () => ({
  s3Client: { send: vi.fn() },
  S3_BUCKET_NAME: "test-bucket",
}));

import {
  presignVideoUpload,
  presignThumbnailUpload,
  getCourseVideoUrl,
  getCourseThumbnailUrl,
  getAllCourses,
  createCourse,
  getCourseByCourseId,
  subscribeCourse,
  unsubscribeCourse,
  updateCourse,
  deleteCourse,
} from "../../controllers/courseController.js";

describe("courseController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AWS_REGION = "us-west-2";
  });

  // ---------- presignVideoUpload ----------
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

  it("presignVideoUpload: 200 returns uploadUrl/fileUrl/key", async () => {
    mocks.getSignedUrlMock.mockResolvedValueOnce("https://signed-upload");

    const req = { body: { courseId: "C1", fileName: "a.mp4", contentType: "video/mp4" } };
    const res = mockRes();

    await presignVideoUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.uploadUrl).toBe("https://signed-upload");
    expect(payload.data.fileUrl).toContain("test-bucket.s3.us-west-2.amazonaws.com/");
    expect(payload.data.key).toContain("courses/");
  });

  // ---------- presignThumbnailUpload ----------
  it("presignThumbnailUpload: 400 missing fields", async () => {
    const req = { body: {} };
    const res = mockRes();
    await presignThumbnailUpload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("presignThumbnailUpload: 400 if not jpeg/png", async () => {
    const req = { body: { courseId: "C1", fileName: "a.gif", contentType: "image/gif" } };
    const res = mockRes();

    await presignThumbnailUpload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("presignThumbnailUpload: 200 returns uploadUrl/fileUrl/key", async () => {
    mocks.getSignedUrlMock.mockResolvedValueOnce("https://signed-thumb");

    const req = { body: { courseId: "C1", fileName: "a.png", contentType: "image/png" } };
    const res = mockRes();

    await presignThumbnailUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.uploadUrl).toBe("https://signed-thumb");
    expect(payload.data.fileUrl).toContain("test-bucket.s3");
    expect(payload.data.key).toContain("thumbnail-");
  });

  // ---------- getCourseThumbnailUrl ----------
  it("getCourseThumbnailUrl: 404 if course not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseThumbnailUrl(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getCourseThumbnailUrl: 400 if no thumbnailKey", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", thumbnailKey: "" });

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseThumbnailUrl(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getCourseThumbnailUrl: 200 returns signedUrl", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", thumbnailKey: "thumb.png" });
    mocks.getSignedUrlMock.mockResolvedValueOnce("https://signed-thumb-view");

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseThumbnailUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.signedUrl).toBe("https://signed-thumb-view");
  });

  // ---------- getAllCourses ----------
  it("getAllCourses: 200 returns list", async () => {
    mocks.CourseDB.findAll.mockResolvedValueOnce([{ courseUid: "uid1" }]);

    const req = {};
    const res = mockRes();

    await getAllCourses(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ---------- createCourse ----------
  it("createCourse: 400 missing courseId/title", async () => {
    const req = { body: {} };
    const res = mockRes();
    await createCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createCourse: 400 missing instructor when not tutor and no instructor", async () => {
    const req = { body: { courseId: "C1", title: "Intro" } };
    const res = mockRes();
    await createCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createCourse: 201 tutor forces instructor to req.user.userName", async () => {
    mocks.CourseDB.create.mockResolvedValueOnce({ courseUid: "uid1", title: "Intro", instructor: "TutorName" });

    const req = {
      user: { id: "u1", role: "tutor", userName: "TutorName" },
      body: { courseId: "C1", title: "Intro", instructor: "IGNORE" },
    };
    const res = mockRes();

    await createCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.CourseDB.create).toHaveBeenCalledWith(
      expect.objectContaining({
        instructor: "TutorName",
        instructorId: "u1",
      })
    );
  });

  // ---------- getCourseByCourseId (courseUid) ----------
  it("getCourseByCourseId: 404 if not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseByCourseId(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getCourseByCourseId: 200 if found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", title: "Intro" });

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseByCourseId(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ---------- getCourseVideoUrl ----------
  it("getCourseVideoUrl: 404 if course not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseVideoUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getCourseVideoUrl: 400 if no videoKey", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", videoKey: "" });

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseVideoUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getCourseVideoUrl: 200 returns signedUrl", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", videoKey: "k.mp4" });
    mocks.getSignedUrlMock.mockResolvedValueOnce("https://signed-video");

    const req = { params: { courseUid: "uid1" } };
    const res = mockRes();

    await getCourseVideoUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.signedUrl).toBe("https://signed-video");
  });

  // ---------- updateCourse ----------
  it("updateCourse: 404 if course not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = { params: { courseUid: "uid1" }, body: { title: "New" }, user: { role: "admin" } };
    const res = mockRes();

    await updateCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updateCourse: 403 if not admin and not owner tutor", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", instructor: "OtherTutor" });

    const req = {
      params: { courseUid: "uid1" },
      body: { title: "New" },
      user: { role: "tutor", userName: "TutorName" },
    };
    const res = mockRes();

    await updateCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("updateCourse: 400 if no valid fields", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", instructor: "TutorName" });

    const req = {
      params: { courseUid: "uid1" },
      body: {},
      user: { role: "tutor", userName: "TutorName" },
    };
    const res = mockRes();

    await updateCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateCourse: 200 updates", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", instructor: "TutorName" });
    mocks.CourseDB.update.mockResolvedValueOnce({ courseUid: "uid1", title: "New" });

    const req = {
      params: { courseUid: "uid1" },
      body: { title: "New" },
      user: { role: "tutor", userName: "TutorName" },
    };
    const res = mockRes();

    await updateCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.CourseDB.update).toHaveBeenCalledWith("uid1", expect.objectContaining({ title: "New" }));
  });

  // ---------- deleteCourse ----------
  it("deleteCourse: 404 if not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = { params: { courseUid: "uid1" }, user: { role: "admin" } };
    const res = mockRes();

    await deleteCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deleteCourse: 403 if not allowed", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", instructor: "OtherTutor" });

    const req = { params: { courseUid: "uid1" }, user: { role: "tutor", userName: "TutorName" } };
    const res = mockRes();

    await deleteCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deleteCourse: 200 removed (owner tutor)", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", instructor: "TutorName" });
    mocks.CourseDB.remove.mockResolvedValueOnce({ courseUid: "uid1" });

    const req = { params: { courseUid: "uid1" }, user: { role: "tutor", userName: "TutorName" } };
    const res = mockRes();

    await deleteCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ---------- subscribe/unsubscribe ----------
  it("subscribeCourse: 401 if no userId", async () => {
    const req = { params: { courseUid: "uid1" }, user: null };
    const res = mockRes();

    await subscribeCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("subscribeCourse: 404 if course missing", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);
    mocks.UserDB.findById.mockResolvedValueOnce({ _id: "u1" });

    const req = { params: { courseUid: "uid1" }, user: { id: "u1" } };
    const res = mockRes();

    await subscribeCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("subscribeCourse: 200 adds courseUid to user + userId to course", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", students: [] });
    mocks.UserDB.findById.mockResolvedValueOnce({ _id: "u1", enrolledCourses: [] });

    mocks.UserDB.updateProfile.mockResolvedValueOnce({ _id: "u1", enrolledCourses: ["uid1"], password: "x" });
    mocks.CourseDB.update.mockResolvedValueOnce({ courseUid: "uid1", students: ["u1"] });

    const req = { params: { courseUid: "uid1" }, user: { id: "u1" } };
    const res = mockRes();

    await subscribeCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.UserDB.updateProfile).toHaveBeenCalledWith("u1", expect.objectContaining({ enrolledCourses: ["uid1"] }));
    expect(mocks.CourseDB.update).toHaveBeenCalledWith("uid1", expect.objectContaining({ students: ["u1"] }));
  });

  it("unsubscribeCourse: 200 removes ids", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "uid1", students: ["u1"] });
    mocks.UserDB.findById.mockResolvedValueOnce({ _id: "u1", enrolledCourses: ["uid1"] });

    mocks.UserDB.updateProfile.mockResolvedValueOnce({ _id: "u1", enrolledCourses: [] });
    mocks.CourseDB.update.mockResolvedValueOnce({ courseUid: "uid1", students: [] });

    const req = { params: { courseUid: "uid1" }, user: { id: "u1" } };
    const res = mockRes();

    await unsubscribeCourse(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

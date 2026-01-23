// __tests__/controllers/taskController.test.js
import { mockRes } from "../utils/testUtils.js";

const mocks = vi.hoisted(() => ({
  TaskDB: {
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findAll: vi.fn(),
    findByCreator: vi.fn(),
    findByCourseUid: vi.fn(),
  },
  QuestionDB: {
    findByTaskId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    removeByTaskId: vi.fn(),
  },
  CourseDB: {
    findByCourseUid: vi.fn(),
  },
  TaskRecordDB: {
    findByUserAndTask: vi.fn(),
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByTaskId: vi.fn(),
  },
  UserDB: {
    findById: vi.fn(),
  },
}));

vi.mock("../../models/index.js", () => ({
  TaskDB: mocks.TaskDB,
  QuestionDB: mocks.QuestionDB,
  CourseDB: mocks.CourseDB,
  TaskRecordDB: mocks.TaskRecordDB,
  UserDB: mocks.UserDB,
}));

import * as ctrl from "../../controllers/taskController.js";

describe("taskController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- getAllTasks ----------
  it("getAllTasks: admin returns all tasks (with questions)", async () => {
    mocks.TaskDB.findAll.mockResolvedValueOnce([{ taskId: "t1" }, { taskId: "t2" }]);
    mocks.QuestionDB.findByTaskId
      .mockResolvedValueOnce([{ questionId: "q1" }])
      .mockResolvedValueOnce([{ questionId: "q2" }]);

    const req = { user: { role: "admin", id: "admin1" } };
    const res = mockRes();

    await ctrl.getAllTasks(req, res);

    expect(mocks.TaskDB.findAll).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0].questions).toBeDefined();
  });

  it("getAllTasks: tutor uses findByCreator", async () => {
    mocks.TaskDB.findByCreator.mockResolvedValueOnce([{ taskId: "t1", createdBy: "u1" }]);
    mocks.QuestionDB.findByTaskId.mockResolvedValueOnce([]);

    const req = { user: { role: "tutor", id: "u1" } };
    const res = mockRes();

    await ctrl.getAllTasks(req, res);

    expect(mocks.TaskDB.findByCreator).toHaveBeenCalledWith("u1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getAllTasks: learner returns tasks with course + creator enrichment", async () => {
    mocks.TaskDB.findAll.mockResolvedValueOnce([
      { taskId: "t1", courseUid: "c1", createdBy: "u2" },
    ]);

    mocks.QuestionDB.findByTaskId.mockResolvedValueOnce([{ questionId: "q1" }]);
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({
      courseUid: "c1",
      courseId: "C1",
      title: "Intro",
      instructor: "Tutor",
    });
    mocks.UserDB.findById.mockResolvedValueOnce({ _id: "u2", userName: "TutorName" });

    const req = { user: { role: "learner", id: "u1" } };
    const res = mockRes();

    await ctrl.getAllTasks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].courseTitle).toBe("Intro");
    expect(payload.data[0].creatorName).toBe("TutorName");
  });

  // ---------- getTasksByCourse ----------
  it("getTasksByCourse: 404 if course not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = { params: { courseUid: "c1" }, user: { id: "u1", role: "learner" } };
    const res = mockRes();

    await ctrl.getTasksByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mocks.TaskDB.findByCourseUid).not.toHaveBeenCalled();
  });

  it("getTasksByCourse: 200 returns tasks with questions", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "c1" });
    mocks.TaskDB.findByCourseUid.mockResolvedValueOnce([
      { taskId: "t1", courseUid: "c1" },
      { taskId: "t2", courseUid: "c1" },
    ]);

    mocks.QuestionDB.findByTaskId
      .mockResolvedValueOnce([{ questionId: "q1" }])
      .mockResolvedValueOnce([]);

    const req = { params: { courseUid: "c1" } };
    const res = mockRes();

    await ctrl.getTasksByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ---------- getTaskById ----------
  it("getTaskById: 404 if task not found", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce(null);

    const req = { params: { taskId: "t1" } };
    const res = mockRes();

    await ctrl.getTaskById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getTaskById: 200 returns task + questions", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseUid: "c1", title: "HW" });
    mocks.QuestionDB.findByTaskId.mockResolvedValueOnce([{ questionId: "q1" }] );

    const req = { params: { taskId: "t1" } };
    const res = mockRes();

    await ctrl.getTaskById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.questions).toHaveLength(1);
  });

  // ---------- createTask ----------
  it("createTask: 400 if missing courseUid/title", async () => {
    const req = { user: { id: "u1", role: "tutor" }, body: { title: "" } };
    const res = mockRes();

    await ctrl.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createTask: 404 if course not found", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce(null);

    const req = {
      user: { id: "u1", role: "tutor" },
      body: { courseUid: "c1", title: "HW1", questions: [] },
    };
    const res = mockRes();

    await ctrl.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mocks.TaskDB.create).not.toHaveBeenCalled();
  });

  it("createTask: 201 creates task and valid questions", async () => {
    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({ courseUid: "c1" });
    mocks.TaskDB.create.mockResolvedValueOnce({ taskId: "t1", courseUid: "c1" });

    mocks.QuestionDB.create
      .mockResolvedValueOnce({ questionId: "q1" })
      .mockResolvedValueOnce({ questionId: "q2" });

    const req = {
      user: { id: "u1", role: "tutor" },
      body: {
        courseUid: "c1",
        title: "HW1",
        questions: [
          { questionText: "1+1?", options: ["1", "2"], correctAnswer: "2" },
          { questionText: "2+2?", options: ["3", "4"], correctAnswer: "4" },
          { questionText: "invalid", options: null, correctAnswer: "" },
        ],
      },
    };
    const res = mockRes();

    await ctrl.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.QuestionDB.create).toHaveBeenCalledTimes(2);
  });

  // ---------- updateTask ----------
  it("updateTask: 404 if task not found", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce(null);

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1", role: "tutor" },
      body: { title: "New" },
    };
    const res = mockRes();

    await ctrl.updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updateTask: 403 if tutor not creator", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({
      taskId: "t1",
      courseUid: "c1",
      createdBy: "other",
    });

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1", role: "tutor" },
      body: { title: "New" },
    };
    const res = mockRes();

    await ctrl.updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("updateTask: 400 if no valid fields", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({
      taskId: "t1",
      courseUid: "c1",
      createdBy: "u1",
    });

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1", role: "tutor" },
      body: {},
    };
    const res = mockRes();

    await ctrl.updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.TaskDB.update).not.toHaveBeenCalled();
  });

  it("updateTask: 200 updates task", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({
      taskId: "t1",
      courseUid: "c1",
      createdBy: "u1",
    });

    mocks.TaskDB.update.mockResolvedValueOnce({
      taskId: "t1",
      courseUid: "c1",
      title: "New",
    });

    mocks.QuestionDB.findByTaskId.mockResolvedValueOnce([]);

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1", role: "tutor" },
      body: { title: "New" },
    };
    const res = mockRes();

    await ctrl.updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.TaskDB.update).toHaveBeenCalledWith("c1", "t1", expect.objectContaining({ title: "New" }));
  });

  // ---------- deleteTask ----------
  it("deleteTask: 404 if not found", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce(null);

    const req = { params: { taskId: "t1" }, user: { id: "u1", role: "tutor" } };
    const res = mockRes();

    await ctrl.deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deleteTask: 200 deletes task and questions", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({
      taskId: "t1",
      courseUid: "c1",
      createdBy: "u1",
    });

    mocks.QuestionDB.removeByTaskId.mockResolvedValueOnce({ deletedCount: 2 });
    mocks.TaskDB.remove.mockResolvedValueOnce({ deleted: true });

    const req = { params: { taskId: "t1" }, user: { id: "u1", role: "tutor" } };
    const res = mockRes();

    await ctrl.deleteTask(req, res);

    expect(mocks.QuestionDB.removeByTaskId).toHaveBeenCalledWith("t1");
    expect(mocks.TaskDB.remove).toHaveBeenCalledWith("c1", "t1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ---------- updateQuestion ----------
  it("updateQuestion: 404 if task not found", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce(null);

    const req = {
      params: { taskId: "t1", questionId: "q1" },
      user: { id: "u1", role: "tutor" },
      body: { questionText: "New" },
    };
    const res = mockRes();

    await ctrl.updateQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updateQuestion: 403 if tutor not creator", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", createdBy: "other" });

    const req = {
      params: { taskId: "t1", questionId: "q1" },
      user: { id: "u1", role: "tutor" },
      body: { questionText: "New" },
    };
    const res = mockRes();

    await ctrl.updateQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("updateQuestion: 400 if no valid fields", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", createdBy: "u1" });

    const req = {
      params: { taskId: "t1", questionId: "q1" },
      user: { id: "u1", role: "tutor" },
      body: {},
    };
    const res = mockRes();

    await ctrl.updateQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateQuestion: 200 updates question", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", createdBy: "u1" });
    mocks.QuestionDB.update.mockResolvedValueOnce({ questionId: "q1", questionText: "New" });

    const req = {
      params: { taskId: "t1", questionId: "q1" },
      user: { id: "u1", role: "tutor" },
      body: { questionText: "New" },
    };
    const res = mockRes();

    await ctrl.updateQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.QuestionDB.update).toHaveBeenCalledWith("t1", "q1", expect.objectContaining({ questionText: "New" }));
  });

  // ---------- deleteQuestion ----------
  it("deleteQuestion: 200 deletes question", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", createdBy: "u1" });
    mocks.QuestionDB.remove.mockResolvedValueOnce({ deleted: true });

    const req = {
      params: { taskId: "t1", questionId: "q1" },
      user: { id: "u1", role: "tutor" },
    };
    const res = mockRes();

    await ctrl.deleteQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.QuestionDB.remove).toHaveBeenCalledWith("t1", "q1");
  });

  // ---------- getTaskRecords ----------
  it("getTaskRecords: 404 if task not found", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce(null);

    const req = { params: { taskId: "t1" } };
    const res = mockRes();

    await ctrl.getTaskRecords(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getTaskRecords: 200 returns completed + notCompleted", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseUid: "c1" });

    mocks.CourseDB.findByCourseUid.mockResolvedValueOnce({
      courseUid: "c1",
      students: ["u1", "u2"],
    });

    mocks.TaskRecordDB.findByTaskId.mockResolvedValueOnce([
      { userId: "u1", taskId: "t1", score: 100 },
    ]);

    mocks.UserDB.findById
      .mockResolvedValueOnce({ _id: "u1", userName: "A", email: "a@test.com" })
      .mockResolvedValueOnce({ _id: "u2", userName: "B", email: "b@test.com" });

    const req = { params: { taskId: "t1" } };
    const res = mockRes();

    await ctrl.getTaskRecords(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.totalEnrolled).toBe(2);
    expect(payload.data.totalCompleted).toBe(1);
    expect(payload.data.completedLearners).toHaveLength(1);
    expect(payload.data.notCompletedLearners).toHaveLength(1);
  });

  // ---------- getMySubmissions ----------
  it("getMySubmissions: 200 returns learner submissions with enriched task", async () => {
    mocks.TaskRecordDB.findByUserId.mockResolvedValueOnce([
      { userId: "u1", taskId: "t1", score: 90 },
    ]);

    mocks.TaskDB.findById.mockResolvedValueOnce({
      taskId: "t1",
      title: "HW1",
      courseUid: "c1",
    });

    const req = { user: { id: "u1", role: "learner" } };
    const res = mockRes();

    await ctrl.getMySubmissions(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].task).toMatchObject({
      taskId: "t1",
      title: "HW1",
      courseUid: "c1",
    });
  });

  // ---------- submitTask ----------
  it("submitTask: 404 if task not found", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce(null);

    const req = { params: { taskId: "t1" }, user: { id: "u1" }, body: { responses: [] } };
    const res = mockRes();

    await ctrl.submitTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("submitTask: 400 if already submitted", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1" });
    mocks.TaskRecordDB.findByUserAndTask.mockResolvedValueOnce({ taskId: "t1", userId: "u1" });

    const req = { params: { taskId: "t1" }, user: { id: "u1" }, body: { responses: [] } };
    const res = mockRes();

    await ctrl.submitTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("submitTask: 201 scores correctly", async () => {
    mocks.TaskDB.findById.mockResolvedValueOnce({ taskId: "t1" });
    mocks.TaskRecordDB.findByUserAndTask.mockResolvedValueOnce(null);

    mocks.QuestionDB.findByTaskId.mockResolvedValueOnce([
      { questionId: "q1", correctAnswer: "A" },
      { questionId: "q2", correctAnswer: "B" },
    ]);

    mocks.TaskRecordDB.create.mockResolvedValueOnce({ userId: "u1", taskId: "t1", score: 50 });

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1" },
      body: { responses: [{ questionId: "q1", answer: "A" }, { questionId: "q2", answer: "X" }] },
    };
    const res = mockRes();

    await ctrl.submitTask(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.correctAnswers).toBe(1);
    expect(payload.data.totalQuestions).toBe(2);
  });
});

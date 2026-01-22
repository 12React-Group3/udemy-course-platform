import { mockRes } from "../utils/testUtils.js";

// 1) Create mock objects so we can reference the same fns in tests
const modelsMock = {
  TaskDB: {
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findAll: vi.fn(),
    findByCreator: vi.fn(),
    findByCourseId: vi.fn(),
  },
  QuestionDB: {
    findByTaskId: vi.fn(),
    create: vi.fn(),
    removeByTaskId: vi.fn(),
  },
  CourseDB: {
    findByCourseId: vi.fn(),
  },
  TaskRecordDB: {
    findByUserAndTask: vi.fn(),
    create: vi.fn(),
    findByUserId: vi.fn(),
  },
};

// 2) Mock BEFORE importing controller
vi.mock("../../models/index.js", () => modelsMock);

describe("taskController", () => {
  // Import controllers AFTER mock is ready
  let ctrl;
  let TaskDB, QuestionDB, TaskRecordDB, CourseDB;

  beforeEach(async () => {
    // reset mock calls each test
    Object.values(modelsMock).forEach((obj) => {
      Object.values(obj).forEach((fn) => fn.mockReset && fn.mockReset());
    });

    ({ TaskDB, QuestionDB, TaskRecordDB, CourseDB } = await import("../../models/index.js"));
    ctrl = await import("../../controllers/taskController.js");
  });

  it("deleteTask: 403 if tutor not creator", async () => {
    TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseId: "C1", createdBy: "other" });

    const req = { params: { taskId: "t1" }, user: { role: "tutor", id: "u1" } };
    const res = mockRes();

    await ctrl.deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(TaskDB.remove).not.toHaveBeenCalled();
  });

  it("submitTask: prevents resubmission", async () => {
    TaskDB.findById.mockResolvedValueOnce({ taskId: "t1" });
    TaskRecordDB.findByUserAndTask.mockResolvedValueOnce({ taskId: "t1", userId: "u1" });

    const req = { params: { taskId: "t1" }, user: { id: "u1" }, body: { responses: [] } };
    const res = mockRes();

    await ctrl.submitTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("submitTask: scores correctly", async () => {
    TaskDB.findById.mockResolvedValueOnce({ taskId: "t1" });
    TaskRecordDB.findByUserAndTask.mockResolvedValueOnce(null);

    QuestionDB.findByTaskId.mockResolvedValueOnce([
      { questionId: "q1", correctAnswer: "A" },
      { questionId: "q2", correctAnswer: "B" },
    ]);

    TaskRecordDB.create.mockResolvedValueOnce({ userId: "u1", taskId: "t1", score: 50 });

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

  // ====== NEW tests you added ======

  it("getAllTasks: admin returns all tasks (with questions)", async () => {
    TaskDB.findAll.mockResolvedValueOnce([{ taskId: "t1" }, { taskId: "t2" }]);
    QuestionDB.findByTaskId
      .mockResolvedValueOnce([{ questionId: "q1" }])
      .mockResolvedValueOnce([{ questionId: "q2" }]);

    const req = { user: { role: "admin", id: "admin1" } };
    const res = mockRes();

    await ctrl.getAllTasks(req, res);

    expect(TaskDB.findAll).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0].questions).toBeDefined();
  });

  it("getAllTasks: tutor uses findByCreator (with questions)", async () => {
    TaskDB.findByCreator.mockResolvedValueOnce([{ taskId: "t1" }]);
    QuestionDB.findByTaskId.mockResolvedValueOnce([{ questionId: "q1" }]);

    const req = { user: { role: "tutor", id: "u1" } };
    const res = mockRes();

    await ctrl.getAllTasks(req, res);

    expect(TaskDB.findByCreator).toHaveBeenCalledWith("u1");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getTasksByCourse: 404 if course not found", async () => {
    CourseDB.findByCourseId.mockResolvedValueOnce(null);

    const req = { params: { courseId: "C1" }, user: { id: "u1", role: "learner" } };
    const res = mockRes();

    await ctrl.getTasksByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(TaskDB.findByCourseId).not.toHaveBeenCalled();
  });

  it("createTask: 400 if missing courseId/title", async () => {
    const req = { user: { id: "u1", role: "tutor" }, body: { title: "" } };
    const res = mockRes();

    await ctrl.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createTask: 404 if course not found", async () => {
    CourseDB.findByCourseId.mockResolvedValueOnce(null);

    const req = {
      user: { id: "u1", role: "tutor" },
      body: { courseId: "C1", title: "HW1", questions: [] },
    };
    const res = mockRes();

    await ctrl.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(TaskDB.create).not.toHaveBeenCalled();
  });

  it("updateTask: 404 if task not found", async () => {
    TaskDB.findById.mockResolvedValueOnce(null);

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1", role: "tutor" },
      body: { title: "New" },
    };
    const res = mockRes();

    await ctrl.updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updateTask: 400 if no valid fields", async () => {
    TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseId: "C1", createdBy: "u1" });

    const req = {
      params: { taskId: "t1" },
      user: { id: "u1", role: "tutor" },
      body: {},
    };
    const res = mockRes();

    await ctrl.updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(TaskDB.update).not.toHaveBeenCalled();
  });

  it("getMySubmissions: returns enriched task info", async () => {
    TaskRecordDB.findByUserId.mockResolvedValueOnce([
      { userId: "u1", taskId: "t1", score: 90 },
      { userId: "u1", taskId: "t2", score: 80 },
    ]);

    TaskDB.findById
      .mockResolvedValueOnce({ taskId: "t1", title: "HW1", courseId: "C1" })
      .mockResolvedValueOnce(null);

    const req = { user: { id: "u1", role: "learner" } };
    const res = mockRes();

    await ctrl.getMySubmissions(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].task).toMatchObject({ taskId: "t1", title: "HW1", courseId: "C1" });
    expect(payload.data[1].task).toBeNull();
  });
  it("updateTask: 403 if tutor not creator", async () => {
  TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseId: "C1", createdBy: "other" });

  const req = { params: { taskId: "t1" }, user: { id: "u1", role: "tutor" }, body: { title: "X" } };
  const res = mockRes();

  await ctrl.updateTask(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});

it("addQuestion: 404 if task not found", async () => {
  TaskDB.findById.mockResolvedValueOnce(null);

  const req = { params: { taskId: "t1" }, user: { id: "u1", role: "tutor" }, body: {} };
  const res = mockRes();

  await ctrl.addQuestion(req, res);

  expect(res.status).toHaveBeenCalledWith(404);
});

it("addQuestion: 400 if missing required fields", async () => {
  TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseId: "C1", createdBy: "u1" });

  const req = { params: { taskId: "t1" }, user: { id: "u1", role: "tutor" }, body: { questionText: "Q" } };
  const res = mockRes();

  await ctrl.addQuestion(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
});

it("deleteTask: 200 deletes questions then task", async () => {
  TaskDB.findById.mockResolvedValueOnce({ taskId: "t1", courseId: "C1", createdBy: "u1" });
  QuestionDB.removeByTaskId.mockResolvedValueOnce({ taskId: "t1", deletedCount: 2 });
  TaskDB.remove.mockResolvedValueOnce({ taskId: "t1" });

  const req = { params: { taskId: "t1" }, user: { role: "tutor", id: "u1" } };
  const res = mockRes();

  await ctrl.deleteTask(req, res);

  expect(QuestionDB.removeByTaskId).toHaveBeenCalledWith("t1");
  expect(TaskDB.remove).toHaveBeenCalledWith("C1", "t1");
  expect(res.status).toHaveBeenCalledWith(200);
});

});


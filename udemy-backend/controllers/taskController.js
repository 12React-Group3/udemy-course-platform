// controllers/taskController.js

import crypto from "node:crypto";
import { CourseDB, TaskDB, TaskRecordDB, QuestionDB } from "../models/index.js";

const isoNow = () => new Date().toISOString();

const ALLOWED_TASK_TYPES = new Set(["HOMEWORK", "EXAM"]);

const toIntOrNull = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : null;
};

const isLearner = (req) => req.user?.role === "learner";

function computeAvailability(task) {
    // For UI: grey-out or clickable
    if (!task.isPublished) return { visible: false, canOpen: false, reason: "UNPUBLISHED" };
    if (task.isLocked) return { visible: true, canOpen: false, reason: "LOCKED" };

    if (task.dueDate) {
        const due = new Date(task.dueDate).getTime();
        if (!Number.isNaN(due) && Date.now() > due) {
            return { visible: true, canOpen: false, reason: "PAST_DUE" };
        }
    }

    return { visible: true, canOpen: true, reason: null };
}

function sanitizeQuestionForLearner(q) {
    if (!q) return null;
    // Do NOT send correctAnswer/explanation to learners
    return {
        questionId: q.questionId,
        options: q.options || [],
        difficulty: q.difficulty,
    };
}

async function getCourseOr404(courseId, res) {
    const course = await CourseDB.findByCourseId(courseId);
    if (!course) {
        res.status(404).json({ success: false, message: "Course not found" });
        return null;
    }
    return course;
}

// ------------------------------------------------------------
// GET /api/courses/:courseId/tasks
// - learner sees only published tasks (locked tasks still returned but not clickable)
// - tutor/admin sees all tasks
// ------------------------------------------------------------
export async function listCourseTasks(req, res) {
    try {
        const { courseId } = req.params;

        const course = await getCourseOr404(courseId, res);
        if (!course) return;

        let tasks = await TaskDB.findByCourseId(courseId);

        if (isLearner(req)) {
            tasks = tasks.filter((t) => t.isPublished);
        }

        const data = tasks.map((t) => ({
            ...t,
            availability: computeAvailability(t),
        }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("listCourseTasks error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// POST /api/courses/:courseId/tasks (tutor/admin + course owner)
// Body: { title, description, type, dueDate, questions, timeLimitSec, maxAttempts, isPublished, isLocked }
// taskId is generated UUID
// ------------------------------------------------------------
export async function createTask(req, res) {
    try {
        const { courseId } = req.params;
        const {
            title,
            description = "",
            type = "HOMEWORK",
            dueDate = null,
            questions = [],
            timeLimitSec,
            maxAttempts,
            isPublished = false,
            isLocked = false,
        } = req.body || {};

        if (!ALLOWED_TASK_TYPES.has(type)) {
            return res.status(400).json({
                success: false,
                message: "type must be HOMEWORK or EXAM",
            });
        }

        if (!title) {
            return res.status(400).json({ success: false, message: "title is required" });
        }

        const course = await getCourseOr404(courseId, res);
        if (!course) return;

        const taskId = crypto.randomUUID();

        const task = await TaskDB.create({
            taskId,
            courseId,
            title,
            description,
            type,
            dueDate,
            questions,
            timeLimitSec: toIntOrNull(timeLimitSec),
            maxAttempts: toIntOrNull(maxAttempts) ?? 1,
            isPublished: Boolean(isPublished),
            isLocked: Boolean(isLocked),
        });

        return res.status(201).json({ success: true, data: task });
    } catch (err) {
        console.error("createTask error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// PATCH /api/courses/:courseId/tasks/:taskId (tutor/admin + owner)
// ------------------------------------------------------------
export async function updateTask(req, res) {
    try {
        const { courseId, taskId } = req.params;
        const updates = req.body || {};

        const task = await TaskDB.update(courseId, taskId, updates);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (updates.type !== undefined && !ALLOWED_TASK_TYPES.has(updates.type)) {
            return res.status(400).json({
                success: false,
                message: "type must be HOMEWORK or EXAM",
            });
        }

        return res.status(200).json({ success: true, data: task });
    } catch (err) {
        console.error("updateTask error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// PATCH publish/unpublish
// Body: { isPublished: true/false }
// ------------------------------------------------------------
export async function setTaskPublishState(req, res) {
    try {
        const { courseId, taskId } = req.params;
        const { isPublished } = req.body || {};

        if (typeof isPublished !== "boolean") {
            return res.status(400).json({ success: false, message: "isPublished must be boolean" });
        }

        const task = await TaskDB.update(courseId, taskId, { isPublished });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        return res.status(200).json({ success: true, data: task });
    } catch (err) {
        console.error("setTaskPublishState error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// PATCH lock/unlock
// Body: { isLocked: true/false }
// ------------------------------------------------------------
export async function setTaskLockState(req, res) {
    try {
        const { courseId, taskId } = req.params;
        const { isLocked } = req.body || {};

        if (typeof isLocked !== "boolean") {
            return res.status(400).json({ success: false, message: "isLocked must be boolean" });
        }

        const task = await TaskDB.update(courseId, taskId, { isLocked });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        return res.status(200).json({ success: true, data: task });
    } catch (err) {
        console.error("setTaskLockState error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// GET /overview
// returns: meta + user progress + class stats (min/max/avg on bestScore)
// finalScore = bestScore
// ------------------------------------------------------------
export async function getTaskOverview(req, res) {
    try {
        const { courseId, taskId } = req.params;

        const task = await TaskDB.findByCourseAndTask(courseId, taskId);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (isLearner(req) && !task.isPublished) {
            return res.status(403).json({ success: false, message: "Task is not published" });
        }

        const progress = (await TaskRecordDB.findByUserAndTask(req.user.id, taskId)) || {
            taskId,
            userId: req.user.id,
            attemptCount: 0,
            bestScore: 0,
            lastScore: 0,
            inProgress: false,
            savedResponses: [],
            lastQuestionIndex: 0,
        };

        const maxAttempts = task.maxAttempts ?? 1;
        const attemptsRemaining = maxAttempts ? Math.max(0, maxAttempts - (progress.attemptCount || 0)) : null;

        // class stats (aggregated only)
        const records = await TaskRecordDB.findByTaskId(taskId);
        const scores = records.map((r) => Number(r.bestScore ?? 0)).filter((n) => Number.isFinite(n));
        const stats =
            scores.length === 0
                ? { count: 0, min: null, max: null, avg: null }
                : {
                    count: scores.length,
                    min: Math.min(...scores),
                    max: Math.max(...scores),
                    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
                };

        return res.status(200).json({
            success: true,
            data: {
                task: {
                    ...task,
                    questionCount: (task.questions || []).length,
                    availability: computeAvailability(task),
                },
                progress: {
                    ...progress,
                    finalScore: progress.bestScore ?? 0,
                    attemptsRemaining,
                },
                classStats: stats,
            },
        });
    } catch (err) {
        console.error("getTaskOverview error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// GET /take
// - learners cannot take if locked / past due / unpublished
// - returns sanitized questions (no correct answers)
// ------------------------------------------------------------
export async function getTaskForTaking(req, res) {
    try {
        const { courseId, taskId } = req.params;

        const task = await TaskDB.findByCourseAndTask(courseId, taskId);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (isLearner(req)) {
            if (!task.isPublished) return res.status(403).json({ success: false, message: "Task is not published" });
            const avail = computeAvailability(task);
            if (!avail.canOpen) {
                return res.status(403).json({ success: false, message: `Task not available: ${avail.reason}` });
            }
        }

        const questionIds = task.questions || [];
        const questionObjs = [];
        for (const qid of questionIds) {
            // 1-by-1 fetch (fine for now; optimize later with BatchGet)
            // eslint-disable-next-line no-await-in-loop
            const q = await QuestionDB.findById(qid);
            if (q) questionObjs.push(isLearner(req) ? sanitizeQuestionForLearner(q) : q);
        }

        return res.status(200).json({
            success: true,
            data: {
                task: {
                    ...task,
                    questionCount: questionIds.length,
                },
                questions: questionObjs,
            },
        });
    } catch (err) {
        console.error("getTaskForTaking error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// POST /start
// - creates/resumes inProgress attempt (supports "continue last exam")
// ------------------------------------------------------------
export async function startTaskAttempt(req, res) {
    try {
        const { courseId, taskId } = req.params;

        const task = await TaskDB.findByCourseAndTask(courseId, taskId);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (isLearner(req)) {
            if (!task.isPublished) return res.status(403).json({ success: false, message: "Task is not published" });
            const avail = computeAvailability(task);
            if (!avail.canOpen) {
                return res.status(403).json({ success: false, message: `Task not available: ${avail.reason}` });
            }
        }

        const existing = await TaskRecordDB.findByUserAndTask(req.user.id, taskId);
        if (existing?.inProgress) {
            return res.status(200).json({ success: true, data: existing });
        }

        const created = await TaskRecordDB.upsert(req.user.id, taskId, {
            inProgress: true,
            startedAt: isoNow(),
            lastSavedAt: isoNow(),
            savedResponses: [],
            lastQuestionIndex: 0,
        });

        return res.status(200).json({ success: true, data: created });
    } catch (err) {
        console.error("startTaskAttempt error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// POST /save
// Body: { savedResponses, lastQuestionIndex }
// ------------------------------------------------------------
export async function saveTaskProgress(req, res) {
    try {
        const { courseId, taskId } = req.params;
        const { savedResponses = [], lastQuestionIndex = 0 } = req.body || {};

        const task = await TaskDB.findByCourseAndTask(courseId, taskId);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const existing = await TaskRecordDB.findByUserAndTask(req.user.id, taskId);
        if (!existing?.inProgress) {
            return res.status(400).json({ success: false, message: "No in-progress attempt. Call /start first." });
        }

        const updated = await TaskRecordDB.upsert(req.user.id, taskId, {
            savedResponses,
            lastQuestionIndex: Number(lastQuestionIndex) || 0,
            lastSavedAt: isoNow(),
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error("saveTaskProgress error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

// ------------------------------------------------------------
// POST /submit
// Body: { responses: [{questionId, answer}] }
// - attemptCount++
// - bestScore = max(bestScore, score)
// - finalScore = bestScore
// ------------------------------------------------------------
export async function submitTaskAttempt(req, res) {
    try {
        const { courseId, taskId } = req.params;
        const { responses = [] } = req.body || {};

        const task = await TaskDB.findByCourseAndTask(courseId, taskId);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (isLearner(req)) {
            if (!task.isPublished) return res.status(403).json({ success: false, message: "Task is not published" });
            const avail = computeAvailability(task);
            if (!avail.canOpen) {
                return res.status(403).json({ success: false, message: `Task not available: ${avail.reason}` });
            }
        }

        const existing = await TaskRecordDB.findByUserAndTask(req.user.id, taskId);
        const attemptCount = existing?.attemptCount ?? 0;

        const maxAttempts = task.maxAttempts ?? 1;
        if (maxAttempts && attemptCount >= maxAttempts) {
            return res.status(403).json({ success: false, message: "No attempts remaining" });
        }

        // Grade: 1 point per question
        let correct = 0;
        for (const r of responses) {
            const qid = r?.questionId;
            if (!qid) continue;
            // eslint-disable-next-line no-await-in-loop
            const q = await QuestionDB.findById(qid);
            if (q && String(r.answer) === String(q.correctAnswer)) correct += 1;
        }

        const score = correct;
        const newAttemptCount = attemptCount + 1;
        const bestScore = Math.max(existing?.bestScore ?? 0, score);

        const updated = await TaskRecordDB.upsert(req.user.id, taskId, {
            attemptCount: newAttemptCount,
            lastScore: score,
            bestScore,
            responses,
            inProgress: false,
            startedAt: null,
            submittedAt: isoNow(),
            savedResponses: [],
            lastQuestionIndex: 0,
        });

        return res.status(200).json({
            success: true,
            data: {
                score,
                bestScore: updated.bestScore,
                finalScore: updated.bestScore,
                attemptCount: updated.attemptCount,
            },
        });
    } catch (err) {
        console.error("submitTaskAttempt error:", err);
        return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
}

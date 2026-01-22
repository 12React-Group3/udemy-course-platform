/**
 * Task Controller
 * Handles task and question CRUD operations
 * Tasks are linked to courses via courseUid
 */

import { TaskDB, QuestionDB, CourseDB, TaskRecordDB, UserDB } from '../models/index.js';

/**
 * GET /api/tasks
 * Get all tasks (for admin) or tasks for courses the user is associated with
 */
export async function getAllTasks(req, res) {
  try {
    const { role, id: userId } = req.user;

    let tasks;
    if (role === 'admin') {
      // Admin can see all tasks
      tasks = await TaskDB.findAll();
    } else if (role === 'tutor') {
      // Tutor sees tasks they created
      tasks = await TaskDB.findByCreator(userId);
    } else {
      // Learner sees tasks from enrolled courses - handled differently
      tasks = await TaskDB.findAll();
    }

    // Fetch questions for each task
    const tasksWithQuestions = await Promise.all(
      tasks.map(async (task) => {
        const questions = await QuestionDB.findByTaskId(task.taskId);
        return { ...task, questions };
      })
    );

    return res.status(200).json({
      success: true,
      data: tasksWithQuestions,
    });
  } catch (err) {
    console.error('getAllTasks error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * GET /api/tasks/course/:courseUid
 * Get all tasks for a specific course
 */
export async function getTasksByCourse(req, res) {
  try {
    const { courseUid } = req.params;

    // Verify course exists
    const course = await CourseDB.findByCourseUid(courseUid);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Get tasks for this course
    const tasks = await TaskDB.findByCourseUid(courseUid);

    // Fetch questions for each task
    const tasksWithQuestions = await Promise.all(
      tasks.map(async (task) => {
        const questions = await QuestionDB.findByTaskId(task.taskId);
        return { ...task, questions };
      })
    );

    return res.status(200).json({
      success: true,
      data: tasksWithQuestions,
    });
  } catch (err) {
    console.error('getTasksByCourse error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * GET /api/tasks/:taskId
 * Get a single task with its questions
 */
export async function getTaskById(req, res) {
  try {
    const { taskId } = req.params;

    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const questions = await QuestionDB.findByTaskId(taskId);

    return res.status(200).json({
      success: true,
      data: { ...task, questions },
    });
  } catch (err) {
    console.error('getTaskById error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * POST /api/tasks
 * Create a new task with questions (tutor only)
 * Body: { courseUid, title, description, dueDate, type, questions: [...] }
 */
export async function createTask(req, res) {
  try {
    const { courseUid, title, description, dueDate, type, questions } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!courseUid || !title) {
      return res.status(400).json({
        success: false,
        message: 'courseUid and title are required',
      });
    }

    // Verify course exists
    const course = await CourseDB.findByCourseUid(courseUid);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if tutor owns this course (instructor matches)
    const user = req.user;
    if (user.role === 'tutor') {
      // For now, allow any tutor to create tasks for any course
      // In production, you might want to verify course ownership
    }

    // Create the task
    const task = await TaskDB.create({
      courseUid,
      title,
      description: description || '',
      dueDate: dueDate || null,
      type: type || 'quiz',
      createdBy: userId,
    });

    // Create questions if provided
    const createdQuestions = [];
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        if (!q.questionText || !q.options || !q.correctAnswer) {
          continue; // Skip invalid questions
        }

        const question = await QuestionDB.create({
          taskId: task.taskId,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
        });
        createdQuestions.push(question);
      }
    }

    return res.status(201).json({
      success: true,
      data: { ...task, questions: createdQuestions },
      message: 'Task created successfully',
    });
  } catch (err) {
    console.error('createTask error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * PUT /api/tasks/:taskId
 * Update a task (tutor only, must be creator)
 */
export async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const { title, description, dueDate, type } = req.body;
    const userId = req.user.id;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check ownership (tutor must be the creator)
    if (req.user.role === 'tutor' && task.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks you created',
      });
    }

    // Build updates object
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (type !== undefined) updates.type = type;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const updatedTask = await TaskDB.update(task.courseUid, taskId, updates);
    const questions = await QuestionDB.findByTaskId(taskId);

    return res.status(200).json({
      success: true,
      data: { ...updatedTask, questions },
      message: 'Task updated successfully',
    });
  } catch (err) {
    console.error('updateTask error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * DELETE /api/tasks/:taskId
 * Delete a task and its questions (tutor only, must be creator)
 */
export async function deleteTask(req, res) {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check ownership (tutor must be the creator)
    if (req.user.role === 'tutor' && task.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks you created',
      });
    }

    // Delete all questions for this task
    await QuestionDB.removeByTaskId(taskId);

    // Delete the task
    await TaskDB.remove(task.courseUid, taskId);

    return res.status(200).json({
      success: true,
      message: 'Task and its questions deleted successfully',
    });
  } catch (err) {
    console.error('deleteTask error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * POST /api/tasks/:taskId/questions
 * Add a question to an existing task
 */
export async function addQuestion(req, res) {
  try {
    const { taskId } = req.params;
    const { questionText, options, correctAnswer, explanation, difficulty } = req.body;
    const userId = req.user.id;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check ownership
    if (req.user.role === 'tutor' && task.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only add questions to tasks you created',
      });
    }

    // Validate required fields
    if (!questionText || !options || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'questionText, options, and correctAnswer are required',
      });
    }

    const question = await QuestionDB.create({
      taskId,
      questionText,
      options,
      correctAnswer,
      explanation: explanation || '',
      difficulty: difficulty || 'medium',
    });

    return res.status(201).json({
      success: true,
      data: question,
      message: 'Question added successfully',
    });
  } catch (err) {
    console.error('addQuestion error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * PUT /api/tasks/:taskId/questions/:questionId
 * Update a question
 */
export async function updateQuestion(req, res) {
  try {
    const { taskId, questionId } = req.params;
    const { questionText, options, correctAnswer, explanation, difficulty } = req.body;
    const userId = req.user.id;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check ownership
    if (req.user.role === 'tutor' && task.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update questions in tasks you created',
      });
    }

    // Build updates
    const updates = {};
    if (questionText !== undefined) updates.questionText = questionText;
    if (options !== undefined) updates.options = options;
    if (correctAnswer !== undefined) updates.correctAnswer = correctAnswer;
    if (explanation !== undefined) updates.explanation = explanation;
    if (difficulty !== undefined) updates.difficulty = difficulty;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const updatedQuestion = await QuestionDB.update(taskId, questionId, updates);

    return res.status(200).json({
      success: true,
      data: updatedQuestion,
      message: 'Question updated successfully',
    });
  } catch (err) {
    console.error('updateQuestion error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * DELETE /api/tasks/:taskId/questions/:questionId
 * Delete a question
 */
export async function deleteQuestion(req, res) {
  try {
    const { taskId, questionId } = req.params;
    const userId = req.user.id;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check ownership
    if (req.user.role === 'tutor' && task.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete questions from tasks you created',
      });
    }

    await QuestionDB.remove(taskId, questionId);

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * POST /api/tasks/:taskId/submit
 * Submit answers for a task (learner)
 * Body: { responses: [{ questionId, answer }] }
 */
export async function submitTask(req, res) {
  try {
    const { taskId } = req.params;
    const { responses } = req.body;
    const userId = req.user.id;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if already submitted
    const existingRecord = await TaskRecordDB.findByUserAndTask(userId, taskId);
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this task',
      });
    }

    // Get questions to calculate score
    const questions = await QuestionDB.findByTaskId(taskId);

    // Calculate score
    let correctCount = 0;
    const gradedResponses = responses.map((r) => {
      const question = questions.find((q) => q.questionId === r.questionId);
      const isCorrect = question && question.correctAnswer === r.answer;
      if (isCorrect) correctCount++;
      return {
        questionId: r.questionId,
        answer: r.answer,
        isCorrect,
      };
    });

    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    // Create task record
    const taskRecord = await TaskRecordDB.create({
      userId,
      taskId,
      responses: gradedResponses,
      score,
    });

    return res.status(201).json({
      success: true,
      data: {
        ...taskRecord,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
      },
      message: 'Task submitted successfully',
    });
  } catch (err) {
    console.error('submitTask error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * GET /api/tasks/:taskId/records
 * Get all submission records for a task (tutor only)
 * Returns: completed learners, not completed learners (enrolled but didn't submit)
 */
export async function getTaskRecords(req, res) {
  try {
    const { taskId } = req.params;

    // Find the task
    const task = await TaskDB.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Get the course to find enrolled students
    const course = await CourseDB.findByCourseUid(task.courseUid);
    const enrolledStudentIds = course?.students || [];

    // Get task records (submissions)
    const records = await TaskRecordDB.findByTaskId(taskId) || [];
    const completedUserIds = new Set(records.map(r => r.userId));

    // Enrich records with user info
    const completedLearners = await Promise.all(
      records.map(async (record) => {
        const user = await UserDB.findById(record.userId);
        return {
          ...record,
          userName: user?.userName || 'Unknown User',
          email: user?.email || '',
        };
      })
    );

    // Find enrolled students who haven't completed
    const notCompletedIds = enrolledStudentIds.filter(id => !completedUserIds.has(id));
    const notCompletedLearners = await Promise.all(
      notCompletedIds.map(async (userId) => {
        const user = await UserDB.findById(userId);
        return {
          userId,
          userName: user?.userName || 'Unknown User',
          email: user?.email || '',
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        completedLearners,
        notCompletedLearners,
        totalEnrolled: enrolledStudentIds.length,
        totalCompleted: completedLearners.length,
      },
    });
  } catch (err) {
    console.error('getTaskRecords error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

/**
 * GET /api/tasks/my-submissions
 * Get current user's task submissions
 */
export async function getMySubmissions(req, res) {
  try {
    const userId = req.user.id;

    const records = await TaskRecordDB.findByUserId(userId);

    // Enrich with task info
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const task = await TaskDB.findById(record.taskId);
        return {
          ...record,
          task: task ? { taskId: task.taskId, title: task.title, courseUid: task.courseUid } : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enrichedRecords,
    });
  } catch (err) {
    console.error('getMySubmissions error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
}

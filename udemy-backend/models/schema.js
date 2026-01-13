// models.js (or separate into files)

const mongoose = require("mongoose");
const { Schema } = mongoose;

/** User */
const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, maxlength: 20 },
    userName: { type: String, required: true, maxlength: 20 },
    email: { type: String, required: true, unique: true, maxlength: 100, lowercase: true, trim: true },
    password: { type: String, required: true }, // store hashed password in real apps
    profileImage: { type: String }, // could be URL or path
    role: { type: String, enum: ["admin", "learner"], required: true, default: "learner" },
  },
  { timestamps: true }
);

/** Course */
const courseSchema = new Schema(
  {
    courseId: { type: String, required: true, unique: true, maxlength: 20 },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 1000 },
    videoURL: { type: String }, // TEXT in SQL → String in Mongo
    instructor: { type: String, ref: "User", required: true, maxlength: 20 },
    students: [{ type: String, ref: "User", required: true, maxlength: 20 }],
    createdAt: { type: Date, default: Date.now },
    courseTag: { type: String, maxlength: 50 },
  },
  { timestamps: false }
);

/** Question */
const questionSchema = new Schema(
  {
    questionId: { type: String, required: true, unique: true, maxlength: 20 },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true }, // "correctionAnswer" → "correctAnswer"
    explanation: { type: String },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  },
  { timestamps: true }
);

/** Task */
const taskSchema = new Schema(
  {
    taskId: { type: String, required: true, unique: true, maxlength: 20 },
    courseId: { type: String, ref: "Course", required: true, maxlength: 20 },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 1000 },
    dueDate: { type: Date },
    type: { type: String, enum: ["Quiz", "Homework"], required: true },
    questions: [{ type: String, ref: "Question" }], // array of questionId
  },
  { timestamps: true }
);

/** TaskRecord (attempt / result) */
const taskRecordSchema = new Schema(
  {
    userId: { type: String, ref: "User", required: true, maxlength: 20 },
    taskId: { type: String, ref: "Task", required: true, maxlength: 20 },

    // per-question answers for that task attempt
    responses: [
      {
        questionId: { type: String, ref: "Question", required: true, maxlength: 20 },
        selectedAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        answeredAt: { type: Date, default: Date.now },
      },
    ],

    // totals
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Helpful indexes (common queries)
taskSchema.index({ courseId: 1, dueDate: 1 });
taskRecordSchema.index({ userId: 1, taskId: 1 });

// Export models
module.exports = {
  User: mongoose.model("User", userSchema),
  Course: mongoose.model("Course", courseSchema),
  Task: mongoose.model("Task", taskSchema),
  Question: mongoose.model("Question", questionSchema),
  TaskRecord: mongoose.model("TaskRecord", taskRecordSchema),
};

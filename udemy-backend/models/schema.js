import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

/** User */
const userSchema = new Schema(
  {
    // use MongoDB _id; no separate userId needed
    userName: { type: String, required: true, maxlength: 20 },
    email: { type: String, required: true, unique: true, maxlength: 100, lowercase: true, trim: true },
    password: { type: String, required: true }, // store hashed password in real apps
    profileImage: { type: String }, // legacy field (URL/path)
    role: { type: String, enum: ["admin", "learner"], required: true, default: "learner" },
  },
  { timestamps: true }
);

/** Course */
const courseSchema = new Schema(
  {
    courseId: { type: String, required: true, unique: true, maxlength: 20, trim: true },
    title: { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, maxlength: 1000, default: "" },
    videoURL: { type: String, default: "" },

    // simple string for MVP
    instructor: { type: String, required: true, maxlength: 20, trim: true },

    // start empty
    students: { type: [String], default: [] },

    createdAt: { type: Date, default: Date.now },
    courseTag: { type: String, maxlength: 50, default: "", trim: true },
  },
  { timestamps: false }
);

/** Question */
const questionSchema = new Schema(
  {
    questionId: { type: String, required: true, unique: true, maxlength: 20 },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  },
  { timestamps: true }
);

/** Task */
const taskSchema = new Schema(
  {
    taskId: { type: String, required: true, unique: true, maxlength: 20 },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 1000 },
    dueDate: { type: Date },
    type: { type: String, enum: ["Quiz", "Homework"], required: true },
    questions: [{ type: String, ref: "Question" }],
  },
  { timestamps: true }
);

/** TaskRecord (attempt / result) */
const taskRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    responses: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        selectedAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        answeredAt: { type: Date, default: Date.now },
      },
    ],
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);


// hash password before saving user
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// macth password method using bcrypt
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


// Helpful indexes (common queries)
taskSchema.index({ courseId: 1, dueDate: 1 });
taskRecordSchema.index({ userId: 1, taskId: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);
export const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);
export const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
export const TaskRecord = mongoose.models.TaskRecord || mongoose.model("TaskRecord", taskRecordSchema);

export default {
  User,
  Course,
  Task,
  Question,
  TaskRecord,
};

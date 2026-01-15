import mongoose from "mongoose";

const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    courseId: {
      type: String,
      required: true,
      unique: true,
      maxlength: 20
    },
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    description: {
      type: String,
      maxlength: 1000
    },
    videoURL: {
      type: String
    },
    instructor: {
      type: String,
      ref: "User",
      required: true,
      maxlength: 20
    },
    students: [
      {
        type: String,
        ref: "User",
        maxlength: 20
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    },
    courseTag: {
      type: String,
      maxlength: 50
    }
  },
  {
    timestamps: false // using createdAt manually
  }
);

export default mongoose.model("Course", courseSchema);

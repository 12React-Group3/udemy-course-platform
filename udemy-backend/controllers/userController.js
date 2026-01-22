import { UserDB, CourseDB } from '../models/index.js';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "../config/s3.js";

/**
 * Helper to attach signed avatar URL to user object
 */
async function attachAvatarUrl(user) {
  if (!user || !S3_BUCKET_NAME) return user;

  const key = user.profileImageKey;
  if (!key) return user;

  try {
    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ResponseContentType: "image/*",
    });
    const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 60 }); // 1 hour
    return {
      ...user,
      profileImage: signedUrl,
    };
  } catch (err) {
    console.error("attachAvatarUrl error for", key, err);
    return user;
  }
}

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserDB.findAll();

    // Attach signed avatar URLs and remove password from response
    const usersWithAvatars = await Promise.all(
      users.map(user => attachAvatarUrl(user))
    );

    const sanitizedUsers = usersWithAvatars.map(user => ({
      id: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || null,
      enrolledCourses: user.enrolledCourses || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user (admin only)
 * @route   DELETE /api/users/:userId
 * @access  Private/Admin
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        statusCode: 400,
      });
    }

    const user = await UserDB.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });
    }

    // Prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin users',
        statusCode: 403,
      });
    }

    await UserDB.delete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role (admin only)
 * @route   PUT /api/users/:userId/role
 * @access  Private/Admin
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['tutor', 'learner'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be either "tutor" or "learner"',
        statusCode: 400,
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own role',
        statusCode: 400,
      });
    }

    const user = await UserDB.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });
    }

    // Prevent changing admin role
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot change admin role',
        statusCode: 403,
      });
    }

    const updatedUser = await UserDB.updateRole(userId, role);

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser._id,
        userName: updatedUser.userName,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
      },
      message: 'User role updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get students enrolled in tutor's courses (tutor only)
 * @route   GET /api/users/my-students
 * @access  Private/Tutor
 */
export const getMyStudents = async (req, res, next) => {
  try {
    const tutorName = req.user.userName;

    // Get all courses
    const allCourses = await CourseDB.findAll();

    // Filter courses where the tutor is the instructor (instructor field stores userName, not ID)
    const tutorCourses = allCourses.filter(
      course => course.instructor?.toLowerCase() === tutorName?.toLowerCase()
    );

    if (tutorCourses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No courses found for this tutor',
      });
    }

    // Collect all unique student IDs from all courses
    const studentIdSet = new Set();
    const courseStudentMap = {};

    for (const course of tutorCourses) {
      const students = course.students || [];
      courseStudentMap[course.courseId] = {
        courseId: course.courseId,
        courseTitle: course.title,
        studentIds: students,
      };
      students.forEach(studentId => studentIdSet.add(studentId));
    }

    // Get user details for all students
    const studentIds = Array.from(studentIdSet);
    const studentsRaw = await UserDB.findByIds(studentIds);

    // Attach signed avatar URLs to all students
    const students = await Promise.all(
      studentsRaw.map(student => attachAvatarUrl(student))
    );

    // Build response with students grouped by course
    const coursesWithStudents = tutorCourses.map(course => {
      const courseStudents = (course.students || [])
        .map(studentId => students.find(s => s._id === studentId))
        .filter(Boolean)
        .map(student => ({
          id: student._id,
          userName: student.userName,
          email: student.email,
          profileImage: student.profileImage || null,
          enrolledAt: student.createdAt, // We don't track enrollment date separately
        }));

      return {
        courseId: course.courseId,
        courseTitle: course.title,
        students: courseStudents,
        studentCount: courseStudents.length,
      };
    });

    res.status(200).json({
      success: true,
      data: coursesWithStudents,
      totalStudents: studentIds.length,
    });
  } catch (error) {
    next(error);
  }
};

// API response types - matches backend course data structure
export interface ApiCourse {
  courseId: string;
  title: string;
  instructor: string;
  videoURL?: string;
  videoKey?: string;
  courseTag?: string;
  createdAt?: string;
  description?: string;
  isHidden?: boolean;
}

// Transformed course for frontend display
export interface Course {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string;
  category: string;
  createdAt: Date;

  // Optional fields for management/edit flows
  description?: string;
  videoURL?: string;
  videoKey?: string;
  isHidden?: boolean;
}

// Time filter options
export type TimeFilterValue = 'all' | 'week' | 'month' | 'year';

export interface TimeFilterOption {
  label: string;
  value: TimeFilterValue;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// User types
export type UserRole = 'admin' | 'tutor' | 'learner';

export interface User {
  id: string;
  userName: string;
  email: string;
  role: UserRole;
  profileImage?: string | null;
  enrolledCourses?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// User management API responses
export interface GetAllUsersResponse {
  success: boolean;
  data: User[];
  count: number;
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

export interface UpdateRoleResponse {
  success: boolean;
  data: User;
  message: string;
}

// Course subscriber (student) info for tutors
export interface CourseSubscriber {
  id: string;
  userName: string;
  email: string;
  profileImage?: string | null;
  enrolledAt?: string;
}

export interface CourseWithStudents {
  courseId: string;
  courseTitle: string;
  students: CourseSubscriber[];
  studentCount: number;
}

export interface GetMyStudentsResponse {
  success: boolean;
  data: CourseWithStudents[];
  totalStudents: number;
}
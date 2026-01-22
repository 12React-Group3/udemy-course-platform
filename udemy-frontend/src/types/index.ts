// API response types - matches backend course data structure
export interface ApiCourse {
  courseUid?: string;
  courseId: string;
  title: string;
  instructor: string;
  instructorId?: string;
  videoURL?: string;
  videoKey?: string;
  courseTag?: string;
  createdAt?: string;
  description?: string;
  students?: string[];
  thumbnailUrl?: string;
}

// Transformed course for frontend display
export interface Course {
  id: string;
  title: string;
  instructor: string;
  instructorId: string;
  thumbnail: string;
  category: string;
  createdAt: Date;
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

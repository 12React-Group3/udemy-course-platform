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

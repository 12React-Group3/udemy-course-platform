import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyStudents } from '../../api/users';
import type { CourseWithStudents } from '../../types';
import { BookOpen, Users, UserX, Plus } from 'lucide-react';
import './SubscribersPage.css';

export default function SubscribersPage() {
  const [courses, setCourses] = useState<CourseWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyStudents();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Calculate totals
  const totals = useMemo(() => {
    const courseCount = courses.length;
    const studentCount = courses.reduce((acc, c) => acc + c.studentCount, 0);
    return { courseCount, studentCount };
  }, [courses]);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="subscribers-page">
        <header className="subscribers-header">
          <h1 className="subscribers-title">My Subscribers</h1>
          <p className="subscribers-subtitle">Students enrolled in your courses</p>
        </header>
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading subscribers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscribers-page">
        <header className="subscribers-header">
          <h1 className="subscribers-title">My Subscribers</h1>
          <p className="subscribers-subtitle">Students enrolled in your courses</p>
        </header>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadStudents}>Try Again</button>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="subscribers-page">
        <header className="subscribers-header">
          <h1 className="subscribers-title">My Subscribers</h1>
          <p className="subscribers-subtitle">Students enrolled in your courses</p>
        </header>
        <div className="empty-state">
          <BookOpen />
          <h3>No Courses Yet</h3>
          <p>Create your first course to start attracting students.</p>
          <Link to="/dashboard">
            <Plus size={18} />
            Create a Course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="subscribers-page">
      <header className="subscribers-header">
        <h1 className="subscribers-title">My Subscribers</h1>
        <p className="subscribers-subtitle">Students enrolled in your courses</p>
      </header>

      {/* Summary Stats */}
      <div className="subscribers-summary">
        <div className="summary-card">
          <div className="summary-icon courses">
            <BookOpen />
          </div>
          <div className="summary-info">
            <div className="summary-value">{totals.courseCount}</div>
            <div className="summary-label">Total Courses</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon students">
            <Users />
          </div>
          <div className="summary-info">
            <div className="summary-value">{totals.studentCount}</div>
            <div className="summary-label">Total Students</div>
          </div>
        </div>
      </div>

      {/* Courses with Students */}
      <div className="course-cards">
        {courses.map((course) => (
          <div className="course-card" key={course.courseId}>
            <div className="course-card-header">
              <h3 className="course-card-title">{course.courseTitle}</h3>
              <span className="course-card-badge">
                {course.studentCount} {course.studentCount === 1 ? 'student' : 'students'}
              </span>
            </div>
            <div className="course-card-body">
              {course.students.length === 0 ? (
                <div className="empty-course">
                  <UserX />
                  <p>No students enrolled yet</p>
                </div>
              ) : (
                <ul className="students-list">
                  {course.students.map((student) => (
                    <li className="student-item" key={student.id}>
                      <div className="student-avatar">
                        {student.profileImage ? (
                          <img src={student.profileImage} alt={student.userName} />
                        ) : (
                          getInitials(student.userName)
                        )}
                      </div>
                      <div className="student-info">
                        <div className="student-name">{student.userName}</div>
                        <div className="student-email">{student.email}</div>
                      </div>
                      <div className="student-enrolled">
                        <span className="student-enrolled-label">Enrolled</span>
                        {formatDate(student.enrolledAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

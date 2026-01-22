import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllTasks, fetchTaskRecords } from '../../api/tasks';
import { fetchAllCourses } from '../../api/courses';
import { getAllUsers } from '../../api/users';
import type { User, ApiCourse } from '../../types';
import {
  CheckSquare,
  BookOpen,
  FileText,
  ClipboardList,
  TrendingUp,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import './AdminTasksPage.css';

interface Question {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  explanation?: string;
}

interface Task {
  taskId: string;
  courseUid?: string;
  courseId?: string;
  title: string;
  description: string;
  type: string;
  dueDate: string | null;
  questions: Question[];
  createdAt: string;
  createdBy?: string;
  // Included from backend API
  courseTitle?: string;
  creatorName?: string;
  course?: {
    title?: string;
    courseId?: string;
    courseUid?: string;
    instructor?: string;
  };
}

interface TaskRecord {
  totalEnrolled: number;
  totalCompleted: number;
  completedLearners: Array<{
    userId: string;
    userName: string;
    email: string;
    score: number;
  }>;
  notCompletedLearners: Array<{
    userId: string;
    userName: string;
    email: string;
  }>;
}

interface TaskWithStats extends Task {
  courseName?: string;
  tutorName?: string;
  completionRate?: number;
  totalEnrolled?: number;
  totalCompleted?: number;
  averageScore?: number;
}

export default function AdminTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskRecords, setTaskRecords] = useState<Record<string, TaskRecord>>({});
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'completion' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksRes, coursesRes, usersData] = await Promise.all([
        fetchAllTasks(),
        fetchAllCourses(),
        getAllUsers(),
      ]);

      if (tasksRes.data?.success) {
        setTasks(tasksRes.data.data || []);
      }
      if (coursesRes.data?.success) {
        setCourses(coursesRes.data.data || []);
      }
      setUsers(usersData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load task records for completion stats
  const loadTaskRecords = useCallback(async (taskList: Task[]) => {
    if (taskList.length === 0) return;

    setLoadingRecords(true);
    const records: Record<string, TaskRecord> = {};

    // Load records in batches to avoid too many concurrent requests
    const batchSize = 5;
    for (let i = 0; i < taskList.length; i += batchSize) {
      const batch = taskList.slice(i, i + batchSize);
      const promises = batch.map(async (task) => {
        try {
          const res = await fetchTaskRecords(task.taskId);
          if (res.data?.success) {
            records[task.taskId] = res.data.data;
          }
        } catch {
          // Silently fail for individual task records
        }
      });
      await Promise.all(promises);
    }

    setTaskRecords(records);
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (tasks.length > 0) {
      loadTaskRecords(tasks);
    }
  }, [tasks, loadTaskRecords]);

  // Create lookup maps
  const courseMap = useMemo(() => {
    const map: Record<string, ApiCourse> = {};
    courses.forEach((c) => {
      if (c.courseUid) map[c.courseUid] = c;
      if (c.courseId) map[c.courseId] = c;
    });
    return map;
  }, [courses]);

  const userMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [users]);

  // Enrich tasks with additional data
  const enrichedTasks: TaskWithStats[] = useMemo(() => {
    return tasks.map((task) => {
      const record = taskRecords[task.taskId];

      let completionRate = 0;
      let averageScore = 0;
      if (record && record.totalEnrolled > 0) {
        completionRate = Math.round((record.totalCompleted / record.totalEnrolled) * 100);
        if (record.completedLearners.length > 0) {
          const totalScore = record.completedLearners.reduce((sum, l) => sum + l.score, 0);
          averageScore = Math.round(totalScore / record.completedLearners.length);
        }
      }

      // Use fields directly from API response (backend now includes these)
      // Fallback to courseMap lookup if API doesn't include them
      const courseId = task.courseUid || task.courseId;
      const courseFromMap = courseId ? courseMap[courseId] : undefined;
      const tutorFromMap = task.createdBy ? userMap[task.createdBy] : undefined;

      const courseName = task.courseTitle || task.course?.title || courseFromMap?.title || courseId || 'Unknown Course';
      const tutorName = task.creatorName || tutorFromMap?.userName || task.course?.instructor || courseFromMap?.instructor || 'Unknown Tutor';

      return {
        ...task,
        courseName,
        tutorName,
        completionRate,
        totalEnrolled: record?.totalEnrolled || 0,
        totalCompleted: record?.totalCompleted || 0,
        averageScore,
      };
    });
  }, [tasks, courseMap, userMap, taskRecords]);

  // Filter and search
  const filteredTasks = useMemo(() => {
    let result = enrichedTasks;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.courseName?.toLowerCase().includes(query) ||
          task.tutorName?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter((task) => task.type === filterType);
    }

    // Course filter
    if (filterCourse !== 'all') {
      result = result.filter(
        (task) => task.courseUid === filterCourse || task.courseId === filterCourse
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'completion':
          comparison = (a.completionRate || 0) - (b.completionRate || 0);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [enrichedTasks, searchQuery, filterType, filterCourse, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const quizzes = tasks.filter((t) => t.type === 'quiz').length;
    const assignments = tasks.filter((t) => t.type === 'assignment').length;
    const exams = tasks.filter((t) => t.type === 'exam').length;

    // Overall completion rate
    let totalEnrolled = 0;
    let totalCompleted = 0;
    Object.values(taskRecords).forEach((record) => {
      totalEnrolled += record.totalEnrolled;
      totalCompleted += record.totalCompleted;
    });
    const overallCompletionRate =
      totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

    return { total, quizzes, assignments, exams, overallCompletionRate, totalEnrolled, totalCompleted };
  }, [tasks, taskRecords]);

  // Get unique courses for filter
  const courseOptions = useMemo(() => {
    const uniqueCourses = new Map<string, string>();
    tasks.forEach((task) => {
      const courseId = task.courseUid || task.courseId || task.course?.courseUid || task.course?.courseId;
      if (courseId) {
        // Use API-provided courseTitle first, then fallback to courseMap lookup
        const courseFromMap = courseMap[courseId];
        const courseName = task.courseTitle || task.course?.title || courseFromMap?.title || courseId;
        uniqueCourses.set(courseId, courseName);
      }
    });
    return Array.from(uniqueCourses.entries());
  }, [tasks, courseMap]);

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

  // Get completion class
  const getCompletionClass = (rate: number) => {
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'average';
    return 'poor';
  };

  // Handle sort
  const handleSort = (column: 'title' | 'completion' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Get type badge class
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'type-quiz';
      case 'assignment':
        return 'type-assignment';
      case 'exam':
        return 'type-exam';
      default:
        return '';
    }
  };

  return (
    <div className="admin-tasks-page">
      <header className="admin-tasks-header">
        <h1 className="admin-tasks-title">Task Management</h1>
        <p className="admin-tasks-subtitle">
          Overview of all tasks, completion rates, and performance metrics
        </p>
      </header>

      {/* Stats Cards */}
      <div className="admin-tasks-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <CheckSquare />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon quizzes">
            <ClipboardList />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.quizzes}</div>
            <div className="stat-label">Quizzes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon assignments">
            <FileText />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.assignments}</div>
            <div className="stat-label">Assignments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon exams">
            <BookOpen />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.exams}</div>
            <div className="stat-label">Exams</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completion">
            <TrendingUp />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {loadingRecords ? '...' : `${stats.overallCompletionRate}%`}
            </div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <section className="tasks-section">
        <div className="tasks-header">
          <h2 className="tasks-title">All Tasks</h2>
          <div className="tasks-filters">
            <div className="tasks-search">
              <Search />
              <input
                type="text"
                placeholder="Search tasks, courses, tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
            </select>
            <select
              className="filter-select"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="all">All Courses</option>
              {courseOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={loadData}>Try Again</button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <CheckSquare />
            <p>{searchQuery || filterType !== 'all' || filterCourse !== 'all' ? 'No tasks match your filters' : 'No tasks found'}</p>
          </div>
        ) : (
          <div className="tasks-table-container">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('title')}>
                    <span className="sortable-header">
                      Task
                      {sortBy === 'title' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </span>
                  </th>
                  <th>Course</th>
                  <th>Tutor</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th className="sortable" onClick={() => handleSort('completion')}>
                    <span className="sortable-header">
                      Completion
                      {sortBy === 'completion' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </span>
                  </th>
                  <th>Avg Score</th>
                  <th className="sortable" onClick={() => handleSort('date')}>
                    <span className="sortable-header">
                      Created
                      {sortBy === 'date' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>
                      <div className="task-title-cell">
                        <div className="task-name">{task.title}</div>
                        {task.description && (
                          <div className="task-desc">{task.description.slice(0, 50)}...</div>
                        )}
                      </div>
                    </td>
                    <td className="course-cell">
                      {task.courseTitle || task.course?.title || task.courseName || 'No Course'}
                    </td>
                    <td className="tutor-cell">{task.tutorName}</td>
                    <td>
                      <span className={`type-badge ${getTypeBadgeClass(task.type)}`}>
                        {task.type}
                      </span>
                    </td>
                    <td className="questions-cell">{task.questions?.length || 0}</td>
                    <td>
                      <div className="completion-cell">
                        <div className={`completion-badge ${getCompletionClass(task.completionRate || 0)}`}>
                          {loadingRecords ? '...' : `${task.completionRate}%`}
                        </div>
                        <div className="completion-detail">
                          {task.totalCompleted}/{task.totalEnrolled}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`score-badge ${getCompletionClass(task.averageScore || 0)}`}>
                        {loadingRecords ? '...' : `${task.averageScore}%`}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(task.createdAt)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn view"
                          onClick={() => navigate(`/tasks/${task.taskId}`)}
                          title="View task details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Summary Footer */}
      {!loading && !error && filteredTasks.length > 0 && (
        <div className="tasks-summary">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
          {!loadingRecords && (
            <span>
              Total submissions: {stats.totalCompleted} / {stats.totalEnrolled} enrolled
            </span>
          )}
        </div>
      )}
    </div>
  );
}

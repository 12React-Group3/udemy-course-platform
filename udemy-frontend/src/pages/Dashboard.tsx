import { useState, useRef, useEffect, useMemo, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { fetchAllCourses } from "../api/courses";
import { getProfile } from "../api/profile";
import { getRole, isTutor, isLearner } from "../auth/authStore";
import AddCourse from "./Course/AddCourse";
import "./Dashboard.css";
import type { ApiCourse, Course, TimeFilterValue, TimeFilterOption, ApiResponse } from "../types";

const TIME_FILTERS: TimeFilterOption[] = [
  { label: "All Time", value: "all" },
  { label: "Last Week", value: "week" },
  { label: "Last Month", value: "month" },
  { label: "Last Year", value: "year" },
];

interface UserProfile {
  id: string;
  userName: string;
  email: string;
  role: string;
  enrolledCourses: string[];
}

// Helper function to extract YouTube video thumbnail from URL
function getVideoThumbnail(videoURL: string | undefined): string | null {
  if (!videoURL) return null;

  try {
    const url = new URL(videoURL);

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "");
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    return null;
  } catch {
    return null;
  }
}

// Transform backend course data to frontend format
function transformCourse(course: ApiCourse): Course {
  const thumbnail =
    course.thumbnailUrl || getVideoThumbnail(course.videoURL) || `https://picsum.photos/seed/${course.courseId}/300/170`;

  let createdAt = course.createdAt ? new Date(course.createdAt) : new Date();
  if (isNaN(createdAt.getTime())) createdAt = new Date();

  return {
    id: course.courseId,
    title: course.title,
    instructor: course.instructor,
    thumbnail,
    category: course.courseTag || "Uncategorized",
    createdAt,
  };
}

// Filter by time
function filterByTime(courses: Course[], timeFilter: TimeFilterValue): Course[] {
  if (timeFilter === "all") return courses;

  const now = new Date();
  const cutoffDate = new Date();

  switch (timeFilter) {
    case "week":
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case "month":
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return courses;
  }

  return courses.filter((course) => course.createdAt && course.createdAt >= cutoffDate);
}

interface CourseCardProps {
  course: Course;
}

function CourseCard({ course }: CourseCardProps) {
  return (
    <Link to={`/courses/${course.id}`} className="course-card">
      <div className="course-thumbnail">
        <img src={course.thumbnail} alt={course.title} />
      </div>
      <div className="course-info">
        <h3 className="course-title">{course.title}</h3>
        <p className="course-instructor">{course.instructor}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("all");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  const userRole = getRole();
  const isTutorUser = isTutor();
  const isLearnerUser = isLearner();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        // Fetch courses and profile in parallel
        const [coursesRes, profileRes] = await Promise.all([
          fetchAllCourses() as Promise<{ data: ApiResponse<ApiCourse[]> }>,
          getProfile().catch(() => null), // Profile might fail if not logged in
        ]);

        if (!coursesRes.data.success) {
          throw new Error(coursesRes.data.message || "Failed to load courses");
        }

        const transformed = coursesRes.data.data.map(transformCourse);
        setAllCourses(transformed);

        // Set user profile if available
        if (profileRes?.data?.success && profileRes.data.data?.user) {
          setUserProfile(profileRes.data.data.user);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter courses based on user role
  const roleCourses = useMemo(() => {
    if (isTutorUser && userProfile?.userName) {
      // Tutor: show courses they created (where instructor matches userName)
      return allCourses.filter(
        (c) => c.instructor?.toLowerCase() === userProfile.userName.toLowerCase()
      );
    }

    if (isLearnerUser && userProfile?.enrolledCourses) {
      // Learner: show subscribed courses
      const enrolledSet = new Set(userProfile.enrolledCourses);
      return allCourses.filter((c) => enrolledSet.has(c.id));
    }

    // Default: show all courses
    return allCourses;
  }, [allCourses, userProfile, isTutorUser, isLearnerUser]);

  // Get dashboard title based on role
  const dashboardTitle = useMemo(() => {
    if (isTutorUser) return "My Published Courses";
    if (isLearnerUser) return "My Subscribed Courses";
    return "All Courses";
  }, [isTutorUser, isLearnerUser]);

  // Get dashboard subtitle based on role
  const dashboardSubtitle = useMemo(() => {
    if (isTutorUser) return "Courses you have created and published";
    if (isLearnerUser) return "Courses you are enrolled in";
    return "Browse all available courses";
  }, [isTutorUser, isLearnerUser]);

  const categories = useMemo(() => {
    const unique = [...new Set(roleCourses.map((c) => c.category))];
    return unique.sort();
  }, [roleCourses]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const filteredCourses = useMemo(() => {
    if (!activeCategory) return [];
    return filterByTime(roleCourses.filter((c) => c.category === activeCategory), timeFilter);
  }, [roleCourses, activeCategory, timeFilter]);

  const checkScrollPosition = () => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollPosition();
    const el = carouselRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScrollPosition);
    return () => el.removeEventListener("scroll", checkScrollPosition);
  }, [filteredCourses]);

  useEffect(() => {
    const el = carouselRef.current;
    if (el) el.scrollLeft = 0;
  }, [activeCategory]);

  const scrollLeft = () => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  };

  const scrollRight = () => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleTimeFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTimeFilter(e.target.value as TimeFilterValue);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (roleCourses.length === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">{dashboardTitle}</h1>
          <p className="dashboard-subtitle">{dashboardSubtitle}</p>
        </div>
        <div className="empty-container">
          {isTutorUser ? (
            <>
              <p>You haven't published any courses yet.</p>
              <button
                className="show-all-link"
                onClick={() => setIsAddCourseModalOpen(true)}
              >
                Create your first course
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </>
          ) : isLearnerUser ? (
            <>
              <p>You haven't subscribed to any courses yet.</p>
              <Link to="/courses" className="show-all-link">
                Browse available courses
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          ) : (
            <>
              <p>No courses available yet.</p>
              <Link to="/courses" className="show-all-link">
                Browse all courses
              </Link>
            </>
          )}
        </div>

        <AddCourse
          isOpen={isAddCourseModalOpen}
          onClose={() => setIsAddCourseModalOpen(false)}
          onSuccess={() => window.location.reload()}
          defaultInstructor={userProfile?.userName || ""}
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">{dashboardTitle}</h1>
          <p className="dashboard-subtitle">{dashboardSubtitle}</p>
        </div>
        {isTutorUser && (
          <button
            className="create-course-btn"
            onClick={() => setIsAddCourseModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Course
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-tab ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="time-filter">
          <select value={timeFilter} onChange={handleTimeFilterChange} className="time-select">
            {TIME_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="course-section">
        <div className="carousel-container">
          {canScrollLeft && (
            <button className="carousel-arrow left" onClick={scrollLeft} aria-label="Scroll left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div className="course-carousel" ref={carouselRef}>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => <CourseCard key={course.id} course={course} />)
            ) : (
              <div className="no-courses">
                <p>No courses found for the selected filters.</p>
              </div>
            )}
          </div>

          {canScrollRight && filteredCourses.length > 0 && (
            <button className="carousel-arrow right" onClick={scrollRight} aria-label="Scroll right">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        <Link to="/courses" className="show-all-link">
          Show all courses
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        onSuccess={() => window.location.reload()}
        defaultInstructor={userProfile?.userName || ""}
      />
    </div>
  );
}

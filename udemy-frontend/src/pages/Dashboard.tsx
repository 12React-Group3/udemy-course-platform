import { useState, useRef, useEffect, useMemo, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { fetchAllCourses } from "../api/courses";
import "./Dashboard.css";
import type { ApiCourse, Course, TimeFilterValue, TimeFilterOption, ApiResponse } from "../types";

const TIME_FILTERS: TimeFilterOption[] = [
  { label: "All Time", value: "all" },
  { label: "Last Week", value: "week" },
  { label: "Last Month", value: "month" },
  { label: "Last Year", value: "year" },
];

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
    getVideoThumbnail(course.videoURL) || `https://picsum.photos/seed/${course.courseId}/300/170`;

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("all");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        const res = (await fetchAllCourses()) as { data: ApiResponse<ApiCourse[]> };

        if (!res.data.success) {
          throw new Error(res.data.message || "Failed to load courses");
        }

        const transformed = res.data.data.map(transformCourse);
        setCourses(transformed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const categories = useMemo(() => {
    const unique = [...new Set(courses.map((c) => c.category))];
    return unique.sort();
  }, [courses]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const filteredCourses = useMemo(() => {
    if (!activeCategory) return [];
    return filterByTime(courses.filter((c) => c.category === activeCategory), timeFilter);
  }, [courses, activeCategory, timeFilter]);

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

  if (courses.length === 0) {
    return (
      <div className="dashboard">
        <div className="empty-container">
          <p>No courses available yet.</p>
          <Link to="/courses" className="show-all-link">
            Browse all courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
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
    </div>
  );
}

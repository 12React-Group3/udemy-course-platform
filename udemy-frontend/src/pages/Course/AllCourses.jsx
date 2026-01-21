import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllCourses } from "../../api/courses";
import "./AllCourses.css";

// Helper function to extract YouTube thumbnail from URL
function getYouTubeThumbnail(videoURL) {
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

// Get thumbnail URL for a course (S3 thumbnail > YouTube thumbnail > null)
function getCourseThumbnail(course) {
  if (course.thumbnailUrl) return course.thumbnailUrl;
  if (course.videoURL) return getYouTubeThumbnail(course.videoURL);
  return null;
}

export default function AllCourses() {
  const [coursesRaw, setCoursesRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetchAllCourses();
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load courses");

      setCoursesRaw(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Show all courses
  const validCourses = useMemo(() => {
    return coursesRaw;
  }, [coursesRaw]);

  // Extract unique categories from courses
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(validCourses.map((c) => c.courseTag || "Uncategorized"))];
    return ["All", ...uniqueCategories.sort()];
  }, [validCourses]);

  // Filter courses by category and search query
  const courses = useMemo(() => {
    let filtered = validCourses;

    // Filter by category
    if (activeCategory !== "All") {
      filtered = filtered.filter((c) => (c.courseTag || "Uncategorized") === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title?.toLowerCase().includes(query) ||
          c.instructor?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [validCourses, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="all-courses-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-courses-page">
        <div className="error-container">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={loadCourses}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="all-courses-page">
      <div className="all-courses-header">
        <h1>All Courses</h1>
        <p>Explore our collection of video courses</p>
      </div>

      <div className="courses-filter-bar">
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

        <div className="filter-controls">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="courses-count">
            {courses.length} {courses.length === 1 ? "course" : "courses"}
          </span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty-container">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
          <h3>No courses found</h3>
          <p>
            {searchQuery
              ? "Try adjusting your search terms"
              : activeCategory !== "All"
              ? `No courses in "${activeCategory}" category`
              : "No video courses are available yet"}
          </p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <Link
              key={course.courseId}
              to={`/courses/${encodeURIComponent(course.courseId)}`}
              className="course-card"
            >
              <div className="course-thumbnail">
                {getCourseThumbnail(course) ? (
                  <img src={getCourseThumbnail(course)} alt={course.title} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="play-overlay">
                  <div className="play-button">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="course-info">
                <h3 className="course-title">{course.title}</h3>
                <div className="course-instructor">
                  <svg className="instructor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{course.instructor || "Unknown Instructor"}</span>
                </div>
                <div className="course-meta">
                  <span className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {course.courseTag || "Uncategorized"}
                  </span>
                  <span className="course-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Available
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllCourses, fetchCourseThumbnailUrl, subscribeCourse, unsubscribeCourse } from "../../api/courses";
import { getProfile } from "../../api/profile";
import { isLearner } from "../../auth/authStore";
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

async function attachSignedThumbnails(rawCourses) {
  const targets = rawCourses.filter((c) => c?.thumbnailKey);

  if (targets.length === 0) return rawCourses;

  const pairs = await Promise.all(
    targets.map(async (c) => {
      try {
        const res = await fetchCourseThumbnailUrl(c.courseId);
        const signedUrl = res.data?.data?.signedUrl;
        return [c.courseId, signedUrl || null];
      } catch {
        return [c.courseId, null];
      }
    })
  );

  const map = new Map();
  for (const [id, url] of pairs) if (url) map.set(id, url);

  // add a field the UI can use
  return rawCourses.map((c) =>
    map.has(c.courseId) ? { ...c, signedThumbnailUrl: map.get(c.courseId) } : c
  );
}

function getCourseThumbnail(course) {
  // signed URL first
  if (course.signedThumbnailUrl) return course.signedThumbnailUrl;

  // (optional) if you still sometimes store a public url, keep it as fallback
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
  const [visibility, setVisibility] = useState("visible");

  // NEW: subscription state
  const [enrolledSet, setEnrolledSet] = useState(new Set());
  const [busyCourseId, setBusyCourseId] = useState("");
  const [toast, setToast] = useState("");

  const learner = isLearner();

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const [coursesRes, profileRes] = await Promise.all([
        fetchAllCourses(),
        getProfile().catch(() => null), // if not logged in, still show courses
      ]);

      if (!coursesRes.data?.success) throw new Error(coursesRes.data?.message || "Failed to load courses");

      const raw = Array.isArray(coursesRes.data.data) ? coursesRes.data.data : [];
      const withThumbs = await attachSignedThumbnails(raw);
      setCoursesRaw(withThumbs);

      const enrolled = profileRes?.data?.data?.user?.enrolledCourses || [];
      setEnrolledSet(new Set(enrolled));
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Show only courses that are NOT hidden on Course Page
  const validCourses = useMemo(() => {
    // Backward compatible: if isHidden is missing, treat it as false (visible)
    return coursesRaw.filter((c) => c?.isHidden !== true);
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
        (c) => c.title?.toLowerCase().includes(query) || c.instructor?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [validCourses, activeCategory, searchQuery]);

  // Prevent Link navigation when clicking subscribe button
  const stopCardNav = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onToggleSubscribe = async (e, courseId) => {
    stopCardNav(e);

    try {
      setBusyCourseId(courseId);
      setToast("");

      const subscribed = enrolledSet.has(courseId);

      if (subscribed) {
        const res = await unsubscribeCourse(courseId);
        if (!res.data?.success) throw new Error(res.data?.message || "Unsubscribe failed");

        const next = new Set(enrolledSet);
        next.delete(courseId);
        setEnrolledSet(next);
        setToast("Unsubscribed. Removed from Dashboard.");
      } else {
        const res = await subscribeCourse(courseId);
        if (!res.data?.success) throw new Error(res.data?.message || "Subscribe failed");

        const next = new Set(enrolledSet);
        next.add(courseId);
        setEnrolledSet(next);
        setToast("Subscribed! You can access it in Dashboard now.");
      }
    } catch (err) {
      setToast(err.response?.data?.message || err.message || "Action failed");
    } finally {
      setBusyCourseId("");
      setTimeout(() => setToast(""), 2500);
    }
  };

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

      {/* NEW: toast message */}
      {toast ? <div className="subscribe-toast">{toast}</div> : null}

      {courses.length === 0 ? (
        <div className="empty-container">
          <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
            />
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
          {courses.map((course) => {
            const subscribed = enrolledSet.has(course.courseId);

            return (
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
                    <svg
                      className="instructor-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
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
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="12"
                        height="12"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Available
                    </span>
                  </div>

                  {/* NEW: subscribe / unsubscribe (learner only) */}
                  {learner && (
                    <div className="course-subscribe-row" onClick={stopCardNav}>
                      <button
                        className={`subscribe-btn ${subscribed ? "subscribed" : ""}`}
                        disabled={busyCourseId === course.courseId}
                        onClick={(e) => onToggleSubscribe(e, course.courseId)}
                      >
                        {busyCourseId === course.courseId
                          ? "Please wait..."
                          : subscribed
                            ? "Unsubscribe"
                            : "Subscribe"}
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

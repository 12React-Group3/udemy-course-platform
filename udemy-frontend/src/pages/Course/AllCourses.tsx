import { useEffect, useMemo, useState, MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchAllCourses, fetchCourseThumbnailUrl, subscribeCourse, unsubscribeCourse } from "../../api/courses";
import { getProfile } from "../../api/profile";
import { isLearner } from "../../auth/authStore";
import type { ApiCourse } from "../../types";
import "./AllCourses.css";

// Extended course type with signed thumbnail URL
interface CourseWithThumbnail extends ApiCourse {
  id?: string;
  signedThumbnailUrl?: string;
}

// Helper function to extract YouTube thumbnail from URL
function getYouTubeThumbnail(videoURL: string | undefined): string | null {
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

async function attachSignedThumbnails(rawCourses: CourseWithThumbnail[]): Promise<CourseWithThumbnail[]> {
  const targets = rawCourses.filter((c) => c?.thumbnailKey);

  if (targets.length === 0) return rawCourses;

  const pairs = await Promise.all(
    targets.map(async (c): Promise<[string, string | null]> => {
      // Use course.id (courseUid) for API calls
      const courseKey = c.id || c.courseUid || c.courseId;
      try {
        const res = await fetchCourseThumbnailUrl(courseKey);
        const signedUrl = res.data?.data?.signedUrl;
        return [courseKey, signedUrl || null];
      } catch {
        return [courseKey, null];
      }
    })
  );

  const map = new Map<string, string>();
  for (const [id, url] of pairs) if (url) map.set(id, url);

  // add a field the UI can use - use course.id (courseUid) as key
  return rawCourses.map((c) => {
    const courseKey = c.id || c.courseUid || c.courseId;
    return map.has(courseKey) ? { ...c, signedThumbnailUrl: map.get(courseKey) } : c;
  });
}

function getCourseThumbnail(course: CourseWithThumbnail): string | null {
  // signed URL first
  if (course.signedThumbnailUrl) return course.signedThumbnailUrl;

  // (optional) if you still sometimes store a public url, keep it as fallback
  if (course.thumbnailUrl) return course.thumbnailUrl;

  if (course.videoURL) return getYouTubeThumbnail(course.videoURL);
  return null;
}

export default function AllCourses() {
  const [coursesRaw, setCoursesRaw] = useState<CourseWithThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Subscription state
  const [enrolledSet, setEnrolledSet] = useState<Set<string>>(new Set());
  const [busyCourseId, setBusyCourseId] = useState("");
  const [toast, setToast] = useState("");

  const learner = isLearner();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const [coursesRes, profileRes] = await Promise.all([
        fetchAllCourses(),
        getProfile().catch(() => null), // if not logged in, still show courses
      ]);

      if (!coursesRes.data?.success) throw new Error(coursesRes.data?.message || "Failed to load courses");

      const raw: CourseWithThumbnail[] = Array.isArray(coursesRes.data.data) ? coursesRes.data.data : [];
      const withThumbs = await attachSignedThumbnails(raw);
      setCoursesRaw(withThumbs);

      const enrolled: string[] = profileRes?.data?.data?.user?.enrolledCourses || [];
      setEnrolledSet(new Set(enrolled));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Show only courses that are NOT hidden on Course Page
  const validCourses = useMemo((): CourseWithThumbnail[] => {
    // Backward compatible: if isHidden is missing, treat it as false (visible)
    return coursesRaw.filter((c: CourseWithThumbnail) => c?.isHidden !== true);
  }, [coursesRaw]);

  // Extract unique categories from courses
  const categories = useMemo((): string[] => {
    const uniqueCategories = [...new Set(validCourses.map((c: CourseWithThumbnail) => c.courseTag || "Uncategorized"))];
    return ["All", ...uniqueCategories.sort()];
  }, [validCourses]);

  // Filter courses by category and search query
  const courses = useMemo((): CourseWithThumbnail[] => {
    let filtered = validCourses;

    // Filter by category
    if (activeCategory !== "All") {
      filtered = filtered.filter((c: CourseWithThumbnail) => (c.courseTag || "Uncategorized") === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c: CourseWithThumbnail) => c.title?.toLowerCase().includes(query) || c.instructor?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [validCourses, activeCategory, searchQuery]);

  // Prevent Link navigation when clicking subscribe button
  const stopCardNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Use courseUid (course.id) for subscription API calls
  const onToggleSubscribe = async (e: MouseEvent, courseUid: string) => {
    stopCardNav(e);

    try {
      setBusyCourseId(courseUid);
      setToast("");

      const subscribed = enrolledSet.has(courseUid);

      if (subscribed) {
        const res = await unsubscribeCourse(courseUid);
        if (!res.data?.success) throw new Error(res.data?.message || "Unsubscribe failed");

        const next = new Set(enrolledSet);
        next.delete(courseUid);
        setEnrolledSet(next);
        setToast("Unsubscribed. Removed from Dashboard.");
      } else {
        const res = await subscribeCourse(courseUid);
        if (!res.data?.success) throw new Error(res.data?.message || "Subscribe failed");

        const next = new Set(enrolledSet);
        next.add(courseUid);
        setEnrolledSet(next);
        setToast("Subscribed! You can access it in Dashboard now.");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setToast(error.response?.data?.message || error.message || "Action failed");
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
          {categories.map((category: string) => (
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
          {courses.map((course: CourseWithThumbnail) => {
            // Use course.id (courseUid) for consistency
            const courseUid = course.id || course.courseUid || course.courseId;
            const subscribed = enrolledSet.has(courseUid);
            const thumbnail = getCourseThumbnail(course);

            return (
              <Link
                key={courseUid}
                to={`/courses/${encodeURIComponent(courseUid)}`}
                state={{ from: currentPath }}
                className="course-card"
              >
                <div className="course-thumbnail">
                  {thumbnail ? (
                    <img src={thumbnail} alt={course.title} />
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
                        disabled={busyCourseId === courseUid}
                        onClick={(e) => onToggleSubscribe(e, courseUid)}
                        aria-label={busyCourseId === courseUid ? "Please wait" : subscribed ? "Unsubscribe" : "Subscribe"}
                        data-hover-tip={subscribed ? "Unsubscribe" : "Subscribe"}
                      >
                        {busyCourseId === courseUid ? (
                          <div className="subscribe-spinner"></div>
                        ) : (
                          <span className="subscribe-icon" aria-hidden="true">
                            {subscribed ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            )}
                          </span>
                        )}
                        <span className="sr-only">
                          {subscribed ? "Unsubscribe from course" : "Subscribe to course"}
                        </span>
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

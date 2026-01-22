import { useState, useRef, useEffect, useMemo, ChangeEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchAllCourses, fetchCourseThumbnailUrl, updateCourse as apiUpdateCourse, deleteCourse as apiDeleteCourse } from "../api/courses";
import { getProfile } from "../api/profile";
import { getRole, isTutor, isLearner, isAdmin } from "../auth/authStore";
import AddCourse from "./Course/AddCourse";
import EditCourse from "./Course/EditCourse";
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

async function attachSignedThumbnails(courses: Course[]): Promise<Course[]> {
  // only courses that have thumbnailKey
  const targets = courses.filter((c: any) => typeof c.thumbnailKey === "string" && c.thumbnailKey.trim() !== "");

  if (targets.length === 0) return courses;

  const signedPairs = await Promise.all(
    targets.map(async (c) => {
      try {
        const res = await fetchCourseThumbnailUrl(c.id);
        const signedUrl =
          res.data?.data?.signedUrl ||
          res.data?.data?.data?.signedUrl;
        if (!signedUrl) return [c.id, null] as const;
        return [c.id, signedUrl] as const;
      } catch {
        return [c.id, null] as const;
      }
    })
  );

  const map = new Map<string, string>();
  for (const [courseId, signedUrl] of signedPairs) {
    if (signedUrl) map.set(courseId, signedUrl);
  }

  // overwrite thumbnail only for those we got a signed url for
  return courses.map((c) =>
    map.has(c.id) ? { ...c, thumbnail: map.get(c.id)! } : c
  );
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
  // Use courseUid if available, otherwise fallback to courseId (matches backend's formatCourse)
  const id = course.courseUid || course.courseId;

  // read key safely even if types aren't updated
  const thumbnailKey = (course as any).thumbnailKey || "";

  const thumbnail =
    getVideoThumbnail(course.videoURL) ||
    `https://picsum.photos/seed/${course.courseId}/300/170`;

  let createdAt = course.createdAt ? new Date(course.createdAt) : new Date();
  if (isNaN(createdAt.getTime())) createdAt = new Date();

  return {
    id,
    title: course.title,
    instructor: course.instructor,
    instructorId: course.instructorId || "",
    thumbnail,
    category: course.courseTag || "Uncategorized",
    createdAt,
    description: course.description,
    videoURL: course.videoURL,
    videoKey: course.videoKey,
    isHidden: course.isHidden === true,
    thumbnailKey,
  } as any;
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
  showManageActions: boolean;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onToggleHide: (course: Course) => void;
}

function CourseCard({ course, showManageActions, onEdit, onDelete, onToggleHide }: CourseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;

  const stop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className={`course-card ${course.isHidden ? "hidden" : ""}`}>
      <Link to={`/courses/${course.id}`} className="course-card-link" state={{ from: currentPath }}>
        <div className="course-thumbnail">
          <img src={course.thumbnail} alt={course.title} />
          {course.isHidden && <span className="course-badge">Hidden</span>}
        </div>
        <div className="course-info">
          <h3 className="course-title">{course.title}</h3>
          <p className="course-instructor">{course.instructor}</p>
          <p className="course-category">{course.category}</p>
          {course.description && <p className="course-description">{course.description}</p>}
        </div>
      </Link>

      {showManageActions && (
        <div className="course-menu" ref={menuRef} onClick={stop}>
          <button
            className="course-menu-trigger"
            type="button"
            aria-label="Course options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              stop(e);
              setMenuOpen((prev) => !prev);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="course-menu-dropdown" role="menu">
              <button
                className="course-menu-item"
                type="button"
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onEdit(course);
                }}
              >
                Edit
              </button>
              <button
                className="course-menu-item danger"
                type="button"
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onDelete(course);
                }}
              >
                Delete
              </button>
              <button
                className="course-menu-item"
                type="button"
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onToggleHide(course);
                }}
              >
                {course.isHidden ? "Unhide on Course Page" : "Hide on Course Page"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type VisibilityFilter = "all" | "visible" | "hidden";

export default function Dashboard() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("all");

  // ✅ NEW: visibility filter toggle
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);

  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  const isTutorUser = isTutor();
  const isLearnerUser = isLearner();
  const isAdminUser = isAdmin();

  async function reloadCourses() {
    const coursesRes = (await fetchAllCourses()) as { data: ApiResponse<ApiCourse[]> };
    if (!coursesRes.data.success) {
      throw new Error(coursesRes.data.message || "Failed to load courses");
    }
    const transformed = coursesRes.data.data.map(transformCourse);

    const withThumbs = await attachSignedThumbnails(transformed);

    setAllCourses(withThumbs);
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [coursesRes, profileRes] = await Promise.all([
          fetchAllCourses() as Promise<{ data: ApiResponse<ApiCourse[]> }>,
          getProfile().catch(() => null),
        ]);

        if (!coursesRes.data.success) {
          throw new Error(coursesRes.data.message || "Failed to load courses");
        }

        const transformed = coursesRes.data.data.map(transformCourse);

        const withThumbs = await attachSignedThumbnails(transformed);

        setAllCourses(withThumbs);

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

  const roleCourses = useMemo(() => {
    const base = allCourses;

    if (isTutorUser && userProfile?.userName) {
      return base.filter(
        (c) => c.instructor?.toLowerCase() === userProfile.userName.toLowerCase()
      );
    }

    if (isLearnerUser && userProfile?.enrolledCourses) {
      const enrolledSet = new Set(userProfile.enrolledCourses);
      return base.filter((c) => enrolledSet.has(c.id));
    }

    return base;
  }, [allCourses, isTutorUser, isLearnerUser, userProfile]);

  const dashboardTitle = useMemo(() => {
    if (isTutorUser) return "My Published Courses";
    if (isLearnerUser) return "My Subscribed Courses";
    if (isAdminUser) return "All Courses (Admin)";
    return "All Courses";
  }, [isTutorUser, isLearnerUser, isAdminUser]);

  const dashboardSubtitle = useMemo(() => {
    if (isTutorUser) return "Courses you have created and published";
    if (isLearnerUser) return "Courses you are enrolled in";
    if (isAdminUser) return "Manage and browse all courses";
    return "Browse all available courses";
  }, [isTutorUser, isLearnerUser, isAdminUser]);

  const categories = useMemo(() => {
    const unique = [...new Set(roleCourses.map((c) => c.category))].sort();
    return ["All", ...unique];
  }, [roleCourses]);

  // Category counts for displaying in tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: roleCourses.length };
    roleCourses.forEach((c) => {
      const cat = c.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [roleCourses]);

  // ✅ Apply category + visibility + time
  const filteredCourses = useMemo(() => {
    let base =
      activeCategory === "All"
        ? roleCourses
        : roleCourses.filter((c) => c.category === activeCategory);

    if (visibilityFilter === "hidden") {
      base = base.filter((c) => c.isHidden === true);
    } else if (visibilityFilter === "visible") {
      base = base.filter((c) => c.isHidden !== true);
    }

    return filterByTime(base, timeFilter);
  }, [roleCourses, activeCategory, visibilityFilter, timeFilter]);

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
    function onFocus() {
      reloadCourses().catch(() => { });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);


  useEffect(() => {
    const el = carouselRef.current;
    if (el) el.scrollLeft = 0;
  }, [activeCategory, visibilityFilter]);

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

  const canManageCourse = (course: Course) => {
    if (isAdminUser) return true;
    if (isTutorUser && userProfile?.userName) {
      return course.instructor?.toLowerCase() === userProfile.userName.toLowerCase();
    }
    return false;
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsEditCourseModalOpen(true);
  };

  const handleDelete = async (course: Course) => {
    const ok = window.confirm(`Delete course "${course.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await apiDeleteCourse(course.id);
      setAllCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete course";
      alert(msg);
    }
  };

  const handleToggleHide = async (course: Course) => {
    const nextHidden = !course.isHidden;

    try {
      const res = await apiUpdateCourse(course.id, { isHidden: nextHidden });
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to update course");
      }

      setAllCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isHidden: nextHidden } : c))
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update course";
      alert(msg);
    }
  };

  const cycleVisibility = () => {
    setVisibilityFilter((prev) => {
      if (prev === "all") return "visible";
      if (prev === "visible") return "hidden";
      return "all";
    });
  };

  const visibilityLabel =
    visibilityFilter === "all" ? "All" : visibilityFilter === "visible" ? "Visible" : "Hidden";

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
              <button className="show-all-link" onClick={() => setIsAddCourseModalOpen(true)}>
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

        <div className="dashboard-header-actions">
          {/* Only tutor/admin can use visibility filter */}
          {(isTutorUser || isAdminUser) && (
            <button
              className="create-course-btn"
              onClick={cycleVisibility}
              title="Toggle visibility filter"
            >
              {visibilityLabel}
            </button>
          )}

          {isTutorUser && (
            <button className="create-course-btn" onClick={() => setIsAddCourseModalOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create Course
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-tab ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}
            >
              <span>{category}</span>
              <span
                className="category-count"
                style={{
                  background: '#e0e7ff',
                  color: '#3730a3',
                  borderRadius: '1em',
                  padding: '0.2em 0.7em',
                  fontWeight: 'bold',
                  marginLeft: '0.3em',
                  fontSize: '0.95em',
                  boxShadow: '0 1px 4px rgba(55,48,163,0.08)'
                }}
              >
                {categoryCounts[category] || 0}
              </span>
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
              filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  showManageActions={canManageCourse(course)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleHide={handleToggleHide}
                />
              ))
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

      <AddCourse
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        onSuccess={() => window.location.reload()}
        defaultInstructor={userProfile?.userName || ""}
      />

      <EditCourse
        isOpen={isEditCourseModalOpen}
        onClose={() => {
          setIsEditCourseModalOpen(false);
          setEditingCourse(null);
        }}
        onSuccess={async () => {
          try {
            await reloadCourses();
          } catch {
            // ignore
          }
        }}
        course={
          editingCourse
            ? {
              ...editingCourse,
              courseId: editingCourse.id,
              courseTag: editingCourse.category,
            }
            : null
        }
      />
    </div>
  );
}

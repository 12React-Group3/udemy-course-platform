import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAllCourses } from '../api/courses';
import Topbar from '../components/Topbar';
import './Dashboard.css';

const TIME_FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Last Week', value: 'week' },
  { label: 'Last Month', value: 'month' },
  { label: 'Last Year', value: 'year' },
];

// Helper function to extract YouTube video thumbnail from URL
function getVideoThumbnail(videoURL) {
  if (!videoURL) return null;
  
  try {
    const url = new URL(videoURL);
    
    // Handle youtu.be/VIDEOID format
    if (url.hostname.includes('youtu.be')) {
      const videoId = url.pathname.replace('/', '');
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    // Handle youtube.com/watch?v=VIDEOID format
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    
    // For non-YouTube videos, return null (will use placeholder)
    return null;
  } catch {
    return null;
  }
}

// Helper function to transform backend course data to frontend format
function transformCourse(course) {
  const thumbnail = getVideoThumbnail(course.videoURL) || 
    `https://picsum.photos/seed/${course.courseId}/300/170`;
  
  // Handle createdAt - use current date as fallback if missing or invalid
  let createdAt = course.createdAt ? new Date(course.createdAt) : new Date();
  if (isNaN(createdAt.getTime())) {
    createdAt = new Date();
  }
  
  return {
    id: course.courseId,
    title: course.title,
    instructor: course.instructor,
    thumbnail,
    category: course.courseTag || 'Uncategorized',
    createdAt,
  };
}

// Helper function to filter courses by time based on createdAt
function filterByTime(courses, timeFilter) {
  if (timeFilter === 'all') return courses;
  
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timeFilter) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return courses;
  }
  
  return courses.filter(course => {
    const courseDate = course.createdAt;
    return courseDate && courseDate >= cutoffDate;
  });
}

// Course Card Component
function CourseCard({ course }) {
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

// Main Dashboard Component
function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const carouselRef = useRef(null);

  // Fetch courses from API on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError('');
        const res = await fetchAllCourses();
        if (!res.success) {
          throw new Error(res.message || 'Failed to load courses');
        }
        // Transform backend data to frontend format
        const transformedCourses = res.data.map(transformCourse);
        setCourses(transformedCourses);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  // Derive unique categories from courses
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(courses.map(course => course.category))];
    return uniqueCategories.sort();
  }, [courses]);

  // Set initial active category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Filter courses based on category and time
  const filteredCourses = useMemo(() => {
    if (!activeCategory) return [];
    return filterByTime(
      courses.filter(course => course.category === activeCategory),
      timeFilter
    );
  }, [courses, activeCategory, timeFilter]);

  // Check scroll position to show/hide arrows
  const checkScrollPosition = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollPosition);
      return () => carousel.removeEventListener('scroll', checkScrollPosition);
    }
  }, [filteredCourses]);

  // Reset scroll position when category changes
  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [activeCategory]);

  const scrollLeft = () => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8;
      carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Topbar onLogoClick={() => navigate("/")} />
        <div className="dashboard">
          <div className="loading-container">
            <p>Loading courses...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Topbar onLogoClick={() => navigate("/")} />
        <div className="dashboard">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        </div>
      </>
    );
  }

  // Empty state - no courses in database
  if (courses.length === 0) {
    return (
      <>
        <Topbar onLogoClick={() => navigate("/")} />
        <div className="dashboard">
          <div className="empty-container">
            <p>No courses available yet.</p>
            <Link to="/courses" className="show-all-link">
              Browse all courses
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar onLogoClick={() => navigate("/")} />
      <div className="dashboard">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="time-filter">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="time-select"
            >
              {TIME_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Section */}
        <div className="course-section">
          <div className="carousel-container">
            {/* Left Arrow */}
            {canScrollLeft && (
              <button className="carousel-arrow left" onClick={scrollLeft} aria-label="Scroll left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Course Carousel */}
            <div className="course-carousel" ref={carouselRef}>
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))
              ) : (
                <div className="no-courses">
                  <p>No courses found for the selected filters.</p>
                </div>
              )}
            </div>

            {/* Right Arrow */}
            {canScrollRight && filteredCourses.length > 0 && (
              <button className="carousel-arrow right" onClick={scrollRight} aria-label="Scroll right">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Show All Link */}
          <Link to="/courses" className="show-all-link">
            Show all courses
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}

export default Dashboard;

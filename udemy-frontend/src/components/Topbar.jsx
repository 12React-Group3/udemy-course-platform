import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Topbar.css'
import logo from '../assets/logo.png'
import { fetchAllCourses } from '../api/courses'

/**
 * Topbar
 * 
 * Props:
 * - onLogout: function - logout callback
 * - onLogoClick: function - click logo callback
 * - onToggleSidebar: function - toggle sidebar callback
 */
function Topbar({ 
  onLogout,
  onLogoClick,
  onToggleSidebar 
}) {
  const navigate = useNavigate()

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))
  const [searchQuery, setSearchQuery] = useState('')
  const [allCourses, setAllCourses] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  // Fetch all courses on mount for search functionality
  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetchAllCourses()
        if (response.success) {
          setAllCourses(response.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err)
      }
    }
    loadCourses()
  }, [])

  // Debounced search - filter courses locally
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery.trim() === '') {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      const query = searchQuery.toLowerCase()
      const filtered = allCourses.filter(course =>
        course.title?.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.courseTag?.toLowerCase().includes(query)
      )
      setSearchResults(filtered.slice(0, 5)) // Limit to 5 results
      setIsLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery, allCourses])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (course) => {
    setSearchQuery('')
    setIsSearchFocused(false)
    navigate(`/courses/${course.courseId}`)
  }

  const handleSignIn = () => {
    navigate('/login')
  }

  const handleSignUp = () => {
    navigate('/register')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')  // clear token
    setIsLoggedIn(false)
    if (onLogout) {
      onLogout()
    }
    navigate('/login')
  }

  const showDropdown = isSearchFocused && searchQuery.trim() !== ''

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img 
          src={logo} 
          alt="Logo" 
          className="topbar-logo" 
          onClick={onLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onLogoClick?.()}
        />
      </div>

      <div className="topbar-center" ref={searchRef}>
        <div className="search-container">
          <svg 
            className="search-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search for courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          {isLoading && <span className="search-loader" />}
        </div>

        {showDropdown && (
          <div className="search-dropdown">
            {searchResults.length > 0 ? (
              searchResults.map((course) => (
                <div
                  key={course.courseId || course._id}
                  className="search-result-item"
                  onClick={() => handleResultClick(course)}
                >
                  <div className="search-result-title">{course.title}</div>
                  <div className="search-result-description">
                    {course.description || 'No description available'}
                  </div>
                </div>
              ))
            ) : (
              <div className="search-no-results">No courses found</div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {isLoggedIn ? (
          <>
            <button className="btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
            <button className="btn btn-burger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-signin" onClick={handleSignIn}>
              Sign In
            </button>
            <button className="btn btn-signup" onClick={handleSignUp}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default Topbar

import { useState, useEffect, useRef } from 'react'
import './Topbar.css'
import logo from '../assets/logo.png'

function Topbar({ 
  isLoggedIn = false, 
  onToggleSidebar, 
  onSignIn, 
  onSignUp, 
  onLogout,
  onSearch,
  onLogoClick 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  // Mock search results for demonstration
  const mockCourses = [
    { courseId: '1', title: 'React - The Complete Guide', description: 'Learn React from scratch' },
    { courseId: '2', title: 'Node.js Masterclass', description: 'Backend development with Node' },
    { courseId: '3', title: 'MongoDB Fundamentals', description: 'NoSQL database essentials' },
    { courseId: '4', title: 'Express.js Deep Dive', description: 'Build REST APIs with Express' },
    { courseId: '5', title: 'JavaScript ES6+', description: 'Modern JavaScript features' },
  ]

  // Debounced search effect
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
      // Filter mock data (will replace with API call)
      // Example API call structure:
      // const response = await fetch(`/api/courses/search?q=${encodeURIComponent(searchQuery)}`)
      // const data = await response.json()
      // setSearchResults(data)
      
      const filtered = mockCourses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSearchResults(filtered)
      setIsLoading(false)
      
      if (onSearch) {
        onSearch(searchQuery)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery, onSearch])

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
    setSearchQuery(course.title)
    setIsSearchFocused(false)
    // add navigation logic here
    console.log('Selected course:', course)
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
                  key={course.courseId}
                  className="search-result-item"
                  onClick={() => handleResultClick(course)}
                >
                  <div className="search-result-title">{course.title}</div>
                  <div className="search-result-description">{course.description}</div>
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
            <button className="btn btn-logout" onClick={onLogout}>
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
            <button className="btn btn-signin" onClick={onSignIn}>
              Sign In
            </button>
            <button className="btn btn-signup" onClick={onSignUp}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default Topbar

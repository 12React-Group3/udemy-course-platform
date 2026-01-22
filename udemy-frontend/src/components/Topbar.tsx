import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Topbar.css";
import logo from "../assets/logo.png";
import { fetchAllCourses } from "../api/courses";
import { getProfile } from "../api/profile";
import { BASE_URL } from "../api/apiPaths";
import { Moon, Sun } from "lucide-react";

export interface TopbarProps {
  onLogout?: () => void;       // kept for backward compatibility (not used now)
  onLogoClick?: () => void;
  onToggleSidebar?: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

type CourseLike = {
  _id?: string;
  id?: string;
  courseUid?: string;
  courseId?: string;
  title?: string;
  description?: string;
  courseTag?: string;
};

type ProfileUser = {
  userName?: string;
  profileImage?: string | null;
};

function resolveProfileImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${BASE_URL}${path}`;
  return `${BASE_URL}/${path}`;
}

function DefaultAvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
      />
    </svg>
  );
}

/**
 * Topbar (TS)
 * - Removed Logout button
 * - Shows username + avatar (fallback icon)
 */
export default function Topbar({ onLogoClick, onToggleSidebar, theme = "light", onToggleTheme }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  const [searchQuery, setSearchQuery] = useState("");
  const [allCourses, setAllCourses] = useState<CourseLike[]>([]);
  const [searchResults, setSearchResults] = useState<CourseLike[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const searchRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Load courses once for search
  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const res = await fetchAllCourses();
        const payload = res.data; // { success, data, message }
        if (!cancelled && payload?.success) {
          setAllCourses(payload.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    }

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load profile when logged in; re-check on route changes (so login -> redirect updates UI)
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!isLoggedIn) {
        setProfileUser(null);
        setAvatarBroken(false);
        return;
      }

      try {
        const res = await getProfile();
        const d = res.data?.data; // { user, userName, profileImage, ... }
        const u: ProfileUser | null = d?.user || null;
        if (!cancelled) {
          setProfileUser(u);
          setAvatarBroken(false);
        }
      } catch (err) {
        // if profile fails, still show a fallback name
        if (!cancelled) {
          setProfileUser(null);
          setAvatarBroken(false);
        }
      }
    }

    loadProfile();
    const onProfileUpdated = () => loadProfile();
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("profile-updated", onProfileUpdated);
    };
    // include location.pathname to refresh state after login navigation
  }, [isLoggedIn, location.pathname]);

  // Debounced search (local filter)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = window.setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const filtered = allCourses.filter(
        (course) =>
          course.title?.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.courseTag?.toLowerCase().includes(query)
      );
      setSearchResults(filtered.slice(0, 5));
      setIsLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQuery, allCourses]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isSearchFocused && searchQuery.trim() !== "";

  const avatarUrl = useMemo(() => {
    const raw = profileUser?.profileImage ?? null;
    const resolved = resolveProfileImageUrl(raw);
    return resolved;
  }, [profileUser]);

  const themeButton = onToggleTheme ? (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  ) : null;

  const userName = profileUser?.userName || "User";

  function handleResultClick(course: CourseLike) {
    setSearchQuery("");
    setIsSearchFocused(false);
    if (course.courseUid) {
      navigate(`/courses/${course.courseUid}`, { state: { from: location.pathname } });
    }
  }

  function handleSignIn() {
    navigate("/login");
  }

  function handleSignUp() {
    navigate("/register");
  }

  function goToProfile() {
    navigate("/profile");
  }

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
          onKeyDown={(e) => e.key === "Enter" && onLogoClick?.()}
        />
      </div>

      <div className="topbar-center" ref={searchRef}>
        <div className="search-container">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  key={course.courseUid || course.courseId || course._id}
                  className="search-result-item"
                  onClick={() => handleResultClick(course)}
                >
                  <div className="search-result-title">{course.title}</div>
                  <div className="search-result-description">{course.description || "No description available"}</div>
                </div>
              ))
            ) : (
              <div className="search-no-results">No courses found</div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {themeButton}
        {isLoggedIn ? (
          <>
            <button className="topbar-user" type="button" onClick={goToProfile} aria-label="Open profile">
              {avatarUrl && !avatarBroken ? (
                <img
                  className="topbar-avatar"
                  src={avatarUrl}
                  alt="Avatar"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span className="topbar-avatarFallback" aria-hidden="true">
                  <DefaultAvatarIcon />
                </span>
              )}

              <span className="topbar-username" title={userName}>
                {userName}
              </span>
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
  );
}

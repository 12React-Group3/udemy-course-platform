# Udemy Course Platform - Frontend

A React-based learning platform frontend built with Vite and Tailwind CSS.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
  api/                    # API layer
    apiPaths.js           # All API endpoints
    apiClient.js          # Axios instance with interceptors
    auth.js               # Auth functions
    profile.js            # Profile functions
    courses.js            # Course functions
  components/             # Reusable components
    ProtectedRoute.jsx    # Route guard for authentication
  pages/                  # Page components
    Auth/
      Login.jsx
      Register.jsx
      Logout.jsx
      AuthFooter.jsx
      AuthAvatar.jsx
    Course/
    Profile/
  routes/
    AppRoutes.jsx         # Route definitions
```

---

## API Structure Guide

### Overview

The API layer is organized into separate files for maintainability:

| File | Purpose |
|------|---------|
| `apiPaths.js` | Centralized API endpoints |
| `apiClient.js` | Axios instance with auto token handling |
| `auth.js` | Authentication functions |
| `profile.js` | User profile functions |
| `courses.js` | Course-related functions |

### How It Works

1. **apiClient.js** - Axios instance that automatically adds the auth token to every request
2. **apiPaths.js** - Single source of truth for all API URLs
3. **Feature files** (auth.js, profile.js, etc.) - Export functions for specific features

---

## Adding New API Endpoints

### Step 1: Add endpoint to `apiPaths.js`

```js
// src/api/apiPaths.js
export const BASE_URL = "http://localhost:5000";

export const API_PATHS = {
    AUTH: { ... },
    COURSES: { ... },

    // Add new feature endpoints
    TASKS: {
        GET_ALL: `${BASE_URL}/api/tasks`,
        GET_BY_ID: (id) => `${BASE_URL}/api/tasks/${id}`,
        CREATE: `${BASE_URL}/api/tasks`,
        UPDATE: (id) => `${BASE_URL}/api/tasks/${id}`,
        DELETE: (id) => `${BASE_URL}/api/tasks/${id}`,
    }
};
```

### Step 2: Create feature API file

```js
// src/api/tasks.js
import apiClient from "./apiClient";
import { API_PATHS } from "./apiPaths";

export function fetchAllTasks() {
    return apiClient.get(API_PATHS.TASKS.GET_ALL);
}

export function fetchTaskById(taskId) {
    return apiClient.get(API_PATHS.TASKS.GET_BY_ID(taskId));
}

export function createTask(taskData) {
    return apiClient.post(API_PATHS.TASKS.CREATE, taskData);
}

export function updateTask(taskId, taskData) {
    return apiClient.put(API_PATHS.TASKS.UPDATE(taskId), taskData);
}

export function deleteTask(taskId) {
    return apiClient.delete(API_PATHS.TASKS.DELETE(taskId));
}
```

### Step 3: Use in components

```jsx
// src/pages/Tasks/TaskList.jsx
import { useEffect, useState } from 'react';
import { fetchAllTasks, deleteTask } from '../../api/tasks';

export default function TaskList() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTasks();
    }, []);

    async function loadTasks() {
        try {
            const response = await fetchAllTasks();
            setTasks(response.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(taskId) {
        try {
            await deleteTask(taskId);
            setTasks(tasks.filter(t => t._id !== taskId));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete task');
        }
    }

    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <ul>
            {tasks.map(task => (
                <li key={task._id}>
                    {task.title}
                    <button onClick={() => handleDelete(task._id)}>Delete</button>
                </li>
            ))}
        </ul>
    );
}
```

---

## Authentication

### Token Handling

The `apiClient.js` automatically:
- Adds `Authorization: Bearer <token>` header to all requests
- Removes token and can redirect on 401 Unauthorized responses

### Available Auth Functions

```js
import { login, register, logout } from '../api/auth';

// Login
const response = await login(email, password);
localStorage.setItem('token', response.data.token);

// Register
const response = await register(formData);
localStorage.setItem('token', response.data.data.token);

// Logout
logout(); // Clears token from localStorage
```

### Protected Routes

Use `ProtectedRoute` component to guard pages:

```jsx
// src/routes/AppRoutes.jsx
import ProtectedRoute from "../components/ProtectedRoute";

<Route path="/dashboard" element={
    <ProtectedRoute>
        <Dashboard />
    </ProtectedRoute>
} />
```

---

## Available API Functions

### Auth (`src/api/auth.js`)

| Function | Description |
|----------|-------------|
| `login(email, password)` | User login |
| `register(formData)` | User registration |
| `logout()` | Clear token |

### Profile (`src/api/profile.js`)

| Function | Description |
|----------|-------------|
| `getProfile()` | Get current user profile |
| `changePassword(payload)` | Change user password |

### Courses (`src/api/courses.js`)

| Function | Description |
|----------|-------------|
| `fetchAllCourses()` | Get all courses |
| `fetchCourseById(id)` | Get course by ID |
| `createCourse(data)` | Create new course |

---

## Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/login` | Login | No |
| `/register` | Register | No |
| `/logout` | Logout | No |
| `/` | AllCourses | Yes |
| `/courses` | AllCourses | Yes |
| `/courses/:id` | CoursePage | Yes |
| `/add-course` | AddCourse | Yes |
| `/profile` | ProfilePage | Yes |

---

## Styling

This project uses **Tailwind CSS v4** with custom theme colors:

```css
/* src/index.css */
@import "tailwindcss";

@theme {
    --color-brand: #007bff;
    --color-accent: #f59e0b;
}
```

Usage:
```jsx
<button className="bg-brand text-white">Click me</button>
<span className="text-accent">Highlighted</span>
```

---

## Environment Variables

Create `.env` file in project root:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

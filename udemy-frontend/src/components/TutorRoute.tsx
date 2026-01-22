import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isTutor, isAdmin } from '../auth/authStore';

export default function TutorRoute({ children }: { children: ReactElement }) {
  // Allow both tutors and admins to access tutor routes
  if (!isTutor() && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

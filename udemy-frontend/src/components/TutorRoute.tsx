import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isTutor } from '../auth/authStore';

export default function TutorRoute({ children }: { children: ReactElement }) {
  if (!isTutor()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

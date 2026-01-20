import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdmin } from '../auth/authStore';

export default function AdminRoute({ children }: { children: ReactElement }) {
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

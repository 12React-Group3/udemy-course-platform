import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { isLearner } from "../auth/authStore";

export default function LearnerRoute({ children }: { children: ReactElement }) {
  if (!isLearner()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

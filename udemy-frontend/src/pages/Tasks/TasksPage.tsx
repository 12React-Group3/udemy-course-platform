import TutorTasksPage from "./TutorTasksPage";
import LearnerTasksPage from "./LearnerTasksPage";
import AdminTasksPage from "./AdminTasksPage";
import { isTutor, isLearner, isAdmin } from "../../auth/authStore";
import "./TutorTasksPage.css";

export default function TasksPage() {
  if (isAdmin()) {
    return <AdminTasksPage />;
  }

  if (isTutor()) {
    return <TutorTasksPage />;
  }

  if (isLearner()) {
    return <LearnerTasksPage />;
  }

  return (
    <div className="tutor-tasks-page">
      <div className="tasks-error">
        <p>You do not have permission to view this page.</p>
      </div>
    </div>
  );
}

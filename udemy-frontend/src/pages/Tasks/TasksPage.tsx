import TutorTasksPage from "./TutorTasksPage";
import LearnerTasksPage from "./LearnerTasksPage";
import { isTutor, isLearner } from "../../auth/authStore";
import "./TutorTasksPage.css";

export default function TasksPage() {
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

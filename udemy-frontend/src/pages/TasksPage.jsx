import "./TasksPage.css";

export default function TasksPage() {
    return (
        <div className="tasks-page">
            <div className="tasks-header">
                <h1>Tasks</h1>
                <p>Select a course to view tasks.</p>
            </div>

            <div className="tasks-empty card">
                <div className="tasks-empty-title">No course selected</div>
                <div className="tasks-empty-text">
                    Please select a course first. Tasks will show Homework and Exam for that course.
                </div>

                <div className="tasks-empty-actions">
                    <a className="btn btn-primary" href="/courses">Go to Courses</a>
                </div>
            </div>
        </div>
    );
}

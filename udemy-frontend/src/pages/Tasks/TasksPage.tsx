export default function TasksPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Tasks</h1>
      <p style={{ marginBottom: 16, opacity: 0.85 }}>
        Placeholder page. Wire your task features here (e.g., todo list, course assignments, due dates).
      </p>

      <div
        style={{
          border: '1px dashed #d1d7dc',
          borderRadius: 12,
          padding: 16,
          background: '#fff',
        }}
      >
        <p style={{ margin: 0, opacity: 0.8 }}>
          Next step: create your real Tasks UI/component and replace this placeholder.
        </p>
      </div>
    </div>
  );
}

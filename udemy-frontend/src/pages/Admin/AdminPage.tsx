export default function AdminPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Admin</h1>
      <p style={{ marginBottom: 16, opacity: 0.85 }}>
        Placeholder admin area. Put admin-only features here (e.g., manage users/courses, reports, approvals).
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
          This route is protected by <code>AdminRoute</code> and only shows up in the sidebar when your JWT role is
          <code> admin</code>.
        </p>
      </div>
    </div>
  );
}

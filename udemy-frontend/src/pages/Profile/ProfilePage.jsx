import { useEffect, useState } from "react";
import { getProfile, changePassword } from "../../api/profile";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [user, setUser] = useState(null);

  const [pw, setPw] = useState({
    currentPassword: "",
    newPassword: "",
  });

  async function loadProfile() {
    setErr("");
    setLoading(true);
    try {
      const res = await getProfile();
      setUser(res.data.data.user);
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function onPwChange(e) {
    const { name, value } = e.target;
    setPw((p) => ({ ...p, [name]: value }));
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!pw.currentPassword || !pw.newPassword) {
      setErr("Please enter current password and new password");
      return;
    }

    try {
      const res = await changePassword(pw);
      setMsg(res.data.message || "Password changed successfully");
      setPw({ currentPassword: "", newPassword: "" });
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Change password failed"
      );
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading profile...</div>;

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <h2>Profile</h2>

      {!!err && (
        <div style={{ marginBottom: 12, color: "red" }}>{err}</div>
      )}
      {!!msg && (
        <div style={{ marginBottom: 12, color: "green" }}>{msg}</div>
      )}

      {/* Profile info */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <p>
          <strong>Username:</strong> {user?.userName || "-"}
        </p>
        <p>
          <strong>Email:</strong> {user?.email || "-"}
        </p>
        <p>
          <strong>Role:</strong> {user?.role || "-"}
        </p>
      </div>

      {/* Change password */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h3>Change Password</h3>

        <form onSubmit={onChangePassword}>
          <div style={{ marginBottom: 10 }}>
            <input
              type="password"
              name="currentPassword"
              placeholder="Current password"
              value={pw.currentPassword}
              onChange={onPwChange}
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <input
              type="password"
              name="newPassword"
              placeholder="New password"
              value={pw.newPassword}
              onChange={onPwChange}
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <button type="submit" style={{ padding: 8 }}>
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}

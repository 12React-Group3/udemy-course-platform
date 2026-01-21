import { useEffect, useMemo, useRef, useState } from "react";
import { getProfile, changePassword, uploadAvatar } from "../../api/profile";
import { Camera, RefreshCcw } from "lucide-react";
import "./ProfilePage.css";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState(null);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const joinedDate = useMemo(() => {
    if (!user?.createdAt) return "-";
    const d = new Date(user.createdAt);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  }, [user]);

  const avatarUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    return user.profileImage;
  }, [user]);

  const enrolledCount = user?.enrolledCourses?.length || 0;

  function handleAvatarKeyDown(e) {
    if (uploading) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setMsg("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const resp = await uploadAvatar(formData);
      const upd = resp.data?.data?.user || resp.data?.data;
      const updatedUser = upd?.user || upd;

      setUser(updatedUser);
      setMsg("Avatar updated");
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Avatar upload failed"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div
          className="profile-avatar"
          role="button"
          tabIndex={0}
          aria-label={uploading ? "Uploading avatar" : "Change avatar"}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={handleAvatarKeyDown}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.userName || "Profile"} />
          ) : (
            <span className="avatar-initial">{user?.userName?.charAt(0)?.toUpperCase() || "U"}</span>
          )}
          <div className={`avatar-overlay ${uploading ? "show" : ""}`}>
            {uploading ? <RefreshCcw size={18} className="spin" /> : <Camera size={18} />}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />

        <div className="profile-meta">
          <div className="profile-name">{user?.userName || "-"}</div>
          <div className="profile-email">{user?.email || "-"}</div>
          <div className="profile-badges">
            <span className="badge role">{user?.role || "-"}</span>
            <span className="badge subtle">Joined {joinedDate}</span>
          </div>
        </div>
      </div>

      {(err || msg) && (
        <div className="profile-alerts">
          {err && <div className="alert error">{err}</div>}
          {msg && <div className="alert success">{msg}</div>}
        </div>
      )}

      <div className="profile-grid">
        <div className="profile-card">
          <div className="card-title">Account</div>
          <div className="info-row">
            <span className="info-label">Username</span>
            <span className="info-value">{user?.userName || "-"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{user?.email || "-"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className="info-value badge ghost">{user?.role || "-"}</span>
          </div>
        </div>

        <div className="profile-card">
          <div className="card-title">Learning</div>
          <div className="stat-row">
            <div className="stat-number">{enrolledCount}</div>
            <div className="stat-label">Enrolled courses</div>
          </div>
          {enrolledCount > 0 ? (
            <div className="chip-row">
              {user.enrolledCourses.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <div className="muted">No courses yet. Start learning!</div>
          )}
        </div>

        <div className="profile-card">
          <div className="card-title">Security</div>
          <form className="pw-form" onSubmit={onChangePassword}>
            <label className="form-label" htmlFor="currentPassword">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              name="currentPassword"
              placeholder="Current password"
              value={pw.currentPassword}
              onChange={onPwChange}
              className="input"
            />

            <label className="form-label" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              placeholder="New password"
              value={pw.newPassword}
              onChange={onPwChange}
              className="input"
            />

            <button type="submit" className="btn-primary">
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

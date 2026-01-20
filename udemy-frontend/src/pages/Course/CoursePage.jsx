// src/pages/Course/CoursePage.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { fetchCourseById, fetchCourseVideoUrl } from "../../api/courses";

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [videoSrc, setVideoSrc] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        setVideoSrc("");

        // 1) 先拿 course
        const res = await fetchCourseById(courseId);
        if (!res.data?.success) throw new Error(res.data?.message || "Failed to load course");

        const c = res.data.data;
        if (!cancelled) setCourse(c);

        // 2) 再用 videoKey 去拿 presigned GET url
        if (c?.videoKey) {
          const v = await fetchCourseVideoUrl(courseId);
          if (!v.data?.success) throw new Error(v.data?.message || "Failed to get video url");
          if (!cancelled) setVideoSrc(v.data.data.signedUrl);
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || e?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: "crimson" }}>Error: {err}</p>
        <Link to="/">Back</Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: 16 }}>
        <p>Course not found.</p>
        <Link to="/">Back</Link>
      </div>
    );
  }

  return (
    <>
      <Topbar onLogoClick={() => navigate("/")} />
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <Link to="/courses" style={{ display: "inline-block", marginBottom: 12 }}>
          ← Back
        </Link>

        <h1 style={{ margin: "6px 0" }}>{course.title}</h1>
        <div style={{ opacity: 0.8, marginBottom: 12 }}>
          <span>CourseId: {course.courseId}</span>
          {" · "}
          <span>Instructor: {course.instructor}</span>
          {course.courseTag ? (
            <>
              {" · "}
              <span>Tag: {course.courseTag}</span>
            </>
          ) : null}
        </div>

        {course.description ? (
          <p style={{ lineHeight: 1.6 }}>{course.description}</p>
        ) : (
          <p style={{ opacity: 0.8 }}>No description yet.</p>
        )}

        <div style={{ marginTop: 18 }}>
          <h2 style={{ marginBottom: 10 }}>Course Video</h2>

          {!course.videoKey ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              No video uploaded yet.
            </div>
          ) : !videoSrc ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              Loading video...
            </div>
          ) : (
            <VideoPlayer url={videoSrc} />
          )}
        </div>
      </div>
    </>
  );
}

function VideoPlayer({ url }) {
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      style={{ width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
    />
  );
}

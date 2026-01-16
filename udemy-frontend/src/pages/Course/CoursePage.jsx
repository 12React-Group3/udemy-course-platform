import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { fetchCourseById } from "../../api/courses";

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        const res = await fetchCourseById(courseId);
        if (!res.data?.success) throw new Error(res.data?.message || "Failed to load course");

        if (!cancelled) setCourse(res.data.data);
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

          {!course.videoURL ? (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              No videoURL yet.
            </div>
          ) : (
            <VideoPlayer url={course.videoURL} />
          )}
        </div>
      </div>
    </>
  );
}

function VideoPlayer({ url }) {
  const isYoutube = /youtube\.com|youtu\.be/.test(url);

  // Simple approach for your 1-week project:
  // - If it’s YouTube, embed
  // - Otherwise use HTML5 <video> (works if URL is a direct .mp4 etc.)
  if (isYoutube) {
    const embedUrl = toYoutubeEmbed(url);
    return (
      <div style={{ position: "relative", paddingTop: "56.25%" }}>
        <iframe
          src={embedUrl}
          title="Course video"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            borderRadius: 10,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      style={{ width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
    />
  );
}

function toYoutubeEmbed(url) {
  // Handles:
  // https://www.youtube.com/watch?v=VIDEOID
  // https://youtu.be/VIDEOID
  try {
    const u = new URL(url);

    // youtu.be/VIDEOID
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }

    // youtube.com/watch?v=VIDEOID
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;

    // already embed or other formats
    return url;
  } catch {
    return url;
  }
}

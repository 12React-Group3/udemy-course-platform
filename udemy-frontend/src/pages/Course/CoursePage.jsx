import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCourseById } from "../../api/courses";

export default function CoursePage() {
  const { courseId } = useParams();

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
        if (!res?.success) throw new Error(res?.message || "Failed to load course");

        if (!cancelled) setCourse(res.data);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  /* ---------- states ---------- */

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-500">
        Loading course…
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-500 mb-4">Error: {err}</p>
        <Link to="/courses" className="text-blue-600 hover:underline">
          ← Back to courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-600 mb-4">Course not found.</p>
        <Link to="/courses" className="text-blue-600 hover:underline">
          ← Back to courses
        </Link>
      </div>
    );
  }

  /* ---------- main ---------- */

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* back */}
      <Link
        to="/courses"
        className="inline-block mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Back to courses
      </Link>

      {/* header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {course.title}
      </h1>

      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-6">
        <span>Course ID: {course.courseId}</span>
        <span>• Instructor: {course.instructor}</span>
        {course.courseTag && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
            {course.courseTag}
          </span>
        )}
      </div>

      {/* description */}
      <div className="mb-10">
        {course.description ? (
          <p className="text-gray-700 leading-relaxed">
            {course.description}
          </p>
        ) : (
          <p className="text-gray-400 italic">No description yet.</p>
        )}
      </div>

      {/* video */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Course Video</h2>

        {!course.videoURL ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-gray-500">
            No video available yet.
          </div>
        ) : (
          <VideoPlayer url={course.videoURL} />
        )}
      </div>
    </div>
  );
}

/* ---------- Video ---------- */

function VideoPlayer({ url }) {
  const isYoutube = /youtube\.com|youtu\.be/.test(url);

  if (isYoutube) {
    const embedUrl = toYoutubeEmbed(url);
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border">
        <iframe
          src={embedUrl}
          title="Course video"
          className="absolute inset-0 h-full w-full"
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
      className="w-full rounded-xl border"
    />
  );
}

/* ---------- utils ---------- */

function toYoutubeEmbed(url) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }

    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;

    return url;
  } catch {
    return url;
  }
}

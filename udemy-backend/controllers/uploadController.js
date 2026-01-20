import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

// POST /api/uploads/video  (你已有的话保留)
export async function presignVideoUpload(req, res) {
  try {
    const { courseId, fileName, contentType } = req.body;

    if (!courseId || !fileName) {
      return res.status(400).json({ success: false, message: "courseId and fileName required" });
    }

    const safeName = String(fileName).replace(/\s+/g, "-");
    const key = `courses/${courseId}/${Date.now()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || "video/mp4",
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 min

    return res.json({ success: true, data: { uploadUrl, key } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "presign upload failed" });
  }
}

// ✅ GET /api/uploads/video/play?key=...
export async function presignVideoPlay(req, res) {
  try {
    const key = String(req.query.key || "").trim();
    if (!key) {
      return res.status(400).json({ success: false, message: "key is required" });
    }

    const cmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    // 10 minutes play link
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });

    return res.json({ success: true, data: { url } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "presign play failed" });
  }
}

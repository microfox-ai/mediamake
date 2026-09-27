/**
 * Client-side helpers to capture a video frame and upload it as a JPEG thumbnail to S3.
 */

/** Capture a JPEG blob from a local video File around `timeInSeconds`. */
export async function captureVideoThumbnailBlob(
  file: File,
  timeInSeconds = 1,
  maxWidth = 640,
): Promise<Blob | null> {
  if (!file.type.startsWith("video/")) return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onError = () => reject(new Error("Failed to load video for thumbnail"));
      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const seekTo =
      duration > 0
        ? Math.min(Math.max(0, timeInSeconds), Math.max(0, duration - 0.05))
        : 0;

    if (seekTo > 0) {
      await new Promise<void>((resolve) => {
        const onSeeked = () => resolve();
        video.addEventListener("seeked", onSeeked, { once: true });
        try {
          video.currentTime = seekTo;
        } catch {
          resolve();
        }
      });
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    if (vw <= 0 || vh <= 0) return null;

    const scale = Math.min(1, maxWidth / vw);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(vw * scale));
    canvas.height = Math.max(1, Math.round(vh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
    return blob;
  } catch (err) {
    console.warn("captureVideoThumbnailBlob failed:", err);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Upload a blob to S3 via the existing `/api/upload-url` presign flow. */
export async function uploadBlobToS3(
  blob: Blob,
  filename: string,
  contentType: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const presignedResponse = await fetch(
      `/api/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`,
      { signal },
    );
    if (!presignedResponse.ok) return null;
    const { uploadUrl, publicUrl } = await presignedResponse.json();

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "public-read",
      },
      body: blob,
      signal,
    });
    if (!put.ok) return null;
    return publicUrl as string;
  } catch (err) {
    console.warn("uploadBlobToS3 failed:", err);
    return null;
  }
}

/** Capture a video thumbnail and upload it; returns the public S3 URL or null. */
export async function generateAndUploadVideoThumbnail(
  file: File,
  signal?: AbortSignal,
): Promise<string | null> {
  const blob = await captureVideoThumbnailBlob(file);
  if (!blob) return null;
  const base = file.name.replace(/\.[^.]+$/, "") || "video";
  const thumbName = `${base}-thumb.jpg`;
  return uploadBlobToS3(blob, thumbName, "image/jpeg", signal);
}

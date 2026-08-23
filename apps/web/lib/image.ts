/**
 * Photo handling for the capture screens.
 *
 * A phone camera hands back a 3–8 MB JPEG, and base64 adds another third on
 * top. Next.js caps a Server Action request body at 1 MB by default, so a
 * full-size shot is rejected by the framework before `analyseFoundItem` ever
 * runs — on mobile the spinner just sat there. Scaling the photo down in the
 * browser keeps the post well under the cap, and gives the vision model less to
 * read for the same answer.
 */

/** Longest edge of the photo we send. Plenty for "what is this object". */
const MAX_EDGE = 1280;

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function photoToDataUrl(file: File, maxEdge = MAX_EDGE, quality = 0.8): Promise<string> {
  // "from-image" applies the EXIF rotation phones write instead of rotating
  // the pixels, so a portrait shot does not arrive on its side.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}

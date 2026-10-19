import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

let configured = false;

function getCloudinary() {
  if (!configured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary is not configured");
    }
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
  return cloudinary;
}

export function uploadImage(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
      else resolve(result);
    });
    stream.end(buffer);
  });
}

export async function destroyImage(publicId: string) {
  await getCloudinary().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}

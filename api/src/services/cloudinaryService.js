import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Checked by Cloudinary against what the file really is, not the type the browser sent:
// an SVG can carry a script, and calling one a PNG gets it past the upload's own check.
const PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif'];

export class CloudinaryService {
    async uploadImageFromBuffer(fileBuffer, folder = "itineraries") {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { resource_type: "image", folder, allowed_formats: PHOTO_FORMATS },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(fileBuffer);
        });
    }

    async deleteImage(publicId) {
        if (!publicId) throw new Error("publicId is required to delete image");

        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw error; // propagates to errorHandler + Sentry
        }
    }
}

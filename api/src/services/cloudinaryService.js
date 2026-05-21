import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
    async uploadImageFromBuffer(fileBuffer, folder = "itineraries") {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { resource_type: "image", folder },
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
            console.error("Cloudinary delete error:", error);
            throw error;
        }
    }
}

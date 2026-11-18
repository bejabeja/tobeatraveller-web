import multer from "multer";
import { ValidationError } from "../errors/ValidationError.js";

const storage = multer.memoryStorage(); // save in memory

// An SVG is an image to the browser but can carry a script, and photos are shown to everyone.
const SCRIPTABLE_IMAGE_TYPE = "image/svg+xml";

// The type is whatever the browser sent, so it is read without case or parameters. This
// only turns the plain cases away early; Cloudinary holds to the real format of the file.
export const imageFileFilter = (req, file, cb) => {
    const type = file.mimetype.toLowerCase().split(";")[0].trim();
    if (!type.startsWith("image/") || type === SCRIPTABLE_IMAGE_TYPE) {
        return cb(new ValidationError("Only image files are allowed"));
    }
    cb(null, true);
};

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFileFilter,
});


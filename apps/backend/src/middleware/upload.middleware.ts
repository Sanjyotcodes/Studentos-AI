// Multipart file upload handling — Phase 16's timetable-photo/PDF upload is
// the first route in the app that needs one. Memory storage only: the file
// is forwarded to Gemini as base64 and never written to disk or persisted
// anywhere.
import multer from 'multer';
import { BadRequestError } from '../errors/AppError';

// Deliberately larger than the global 100kb JSON body limit every other
// route keeps (Phase 15) — a real timetable photo or scanned PDF is
// routinely a few MB. This is a documented, scoped exception for exactly
// one route, not a change to the default.
const TIMETABLE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export const uploadTimetableImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TIMETABLE_UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestError(
        'Unsupported file type. Upload a JPEG, PNG, WebP, HEIC/HEIF image, or a PDF.',
        undefined,
        'UNSUPPORTED_FILE_TYPE',
      ),
    );
  },
}).single('file');

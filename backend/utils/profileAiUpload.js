const multer = require('multer');
const os = require('os');

const profileAiUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const safe = (file.originalname || 'doc').replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `profile-ai-${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    if (isPdf) return cb(null, true);
    cb(new Error('Only PDF files are allowed for AI extraction'));
  },
}).array('documents', 10);

function mapAiErrorResponse(res, error) {
  const code = error.code;
  if (code === 'AI_NOT_CONFIGURED') {
    return res.status(503).json({ message: 'AI service is not configured', code });
  }
  if (code === 'AI_UNAVAILABLE' || code === 'AI_TIMEOUT') {
    return res.status(503).json({
      message: error.message || 'AI service is unavailable. Start your GPU server and try again.',
      code,
    });
  }
  return res.status(500).json({
    message: error.message || 'Error generating AI suggestions',
    code: code || 'AI_ERROR',
  });
}

module.exports = { profileAiUpload, mapAiErrorResponse };

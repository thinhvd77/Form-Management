const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

const fileFilter = (req, file, cb) => {
  // Accept only Excel files
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream', // Sometimes files are sent as octet-stream, we'll validate extension
  ];
  
  console.log('Received file:', file.originalname, 'MIME type:', file.mimetype);
  
  if (allowedMimes.includes(file.mimetype)) {
    // For octet-stream, check file extension
    if (file.mimetype === 'application/octet-stream') {
      const ext = file.originalname.toLowerCase().split('.').pop();
      if (!['xlsx', 'xls'].includes(ext)) {
        cb(new Error(`Only Excel files (.xlsx, .xls) are allowed. Invalid extension: .${ext}`), false);
        return;
      }
    }
    cb(null, true);
  } else {
    cb(new Error(`Only Excel files (.xlsx, .xls) are allowed. Received: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = {
  upload,
};
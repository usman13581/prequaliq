const db = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept common document types
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter
});

// Upload document (Supplier)
const uploadDocument = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = await db.Document.create({
      supplierId: supplier.id,
      documentType: req.body.documentType || 'general',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

// Upload document (Procuring Entity)
const uploadProcuringEntityDocument = async (req, res) => {
  try {
    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });
    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = await db.Document.create({
      procuringEntityId: procuringEntity.id,
      documentType: req.body.documentType || 'general',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

// Get documents
const getDocuments = async (req, res) => {
  try {
    let documents;

    if (req.user.role === 'supplier') {
      const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      documents = await db.Document.findAll({
        where: { supplierId: supplier.id }
      });
    } else if (req.user.role === 'procuring_entity') {
      const procuringEntity = await db.ProcuringEntity.findOne({
        where: { userId: req.user.id }
      });
      if (!procuringEntity) {
        return res.status(404).json({ message: 'Procuring entity not found' });
      }
      documents = await db.Document.findAll({
        where: { procuringEntityId: procuringEntity.id }
      });
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await db.Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check ownership
    if (req.user.role === 'supplier') {
      const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
      if (document.supplierId !== supplier.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'procuring_entity') {
      const procuringEntity = await db.ProcuringEntity.findOne({
        where: { userId: req.user.id }
      });
      if (document.procuringEntityId !== procuringEntity.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await document.destroy();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};

module.exports = {
  upload,
  uploadDocument,
  uploadProcuringEntityDocument,
  getDocuments,
  deleteDocument
};

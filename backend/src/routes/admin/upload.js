const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const Note = require('../../models/Note');
const PYQ = require('../../models/PYQ');
const Subject = require('../../models/Subject');

// ============================================================
// GEMINI VISION FOR IMAGE/PDF EXTRACTION
// ============================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only PDFs and images are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

// ============================================================
// HELPER: Extract text from image using Gemini Vision
// ============================================================
const extractTextFromImage = async (filePath) => {
    console.log('📄 [Gemini Vision] Starting extraction for:', filePath);
    
    try {
        // Read the file as base64
        const imageData = fs.readFileSync(filePath);
        const base64Image = imageData.toString('base64');

        // Determine MIME type
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

        // Use Gemini Vision model
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        const prompt = `
You are a text extraction assistant. Extract ALL the text from this image/PDF exactly as you see it.

If this is a handwritten note, carefully read and transcribe all handwritten text.
If this is a printed document, extract all the text accurately.
If there are questions, list them clearly.
If there are diagrams, describe them briefly.

OUTPUT ONLY THE EXTRACTED TEXT. DO NOT ADD ANY EXTRA COMMENTS.
`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                },
            },
        ]);

        const text = result.response.text();
        console.log('📄 [Gemini Vision] Extracted text length:', text.length);
        console.log('📄 [Gemini Vision] Preview:', text.substring(0, 200) + '...');
        
        return text;
    } catch (error) {
        console.error('❌ [Gemini Vision] Error:', error);
        throw error;
    }
};

// ============================================================
// ROUTE: Upload PYQ
// ============================================================

router.post('/pyq', upload.single('file'), async (req, res) => {
    try {
        console.log('📤 Upload PYQ Request');
        console.log('Body:', req.body);
        console.log('File:', req.file);

        const { subjectId, title, year, examType, description } = req.body;

        if (!subjectId || !title || !year || !req.file) {
            return res.status(400).json({
                error: 'Subject ID, title, year, and file are required',
            });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const filePath = req.file.path;
        console.log('📄 File path:', filePath);

        // Use Gemini Vision to extract text
        const text = await extractTextFromImage(filePath);

        // Split into chunks for better search
        const words = text.split(/\s+/);
        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }

        const pyq = new PYQ({
            subject: subjectId,
            title,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            chunkCount: chunks.length,
            content: text,
            uploadedBy: req.userId,
            year: parseInt(year),
            examType: examType || 'End Sem',
            description: description || '',
        });

        await pyq.save();

        res.status(201).json({
            message: '✅ PYQ uploaded successfully!',
            pyq: {
                id: pyq._id,
                title: pyq.title,
                fileName: pyq.fileName,
                originalName: pyq.originalName,
                year: pyq.year,
                examType: pyq.examType,
                contentLength: text.length,
            },
        });

    } catch (error) {
        console.error('Upload PYQ error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload PYQ: ' + error.message });
    }
});

// ============================================================
// ROUTE: Upload Note
// ============================================================

router.post('/note', upload.single('file'), async (req, res) => {
    try {
        console.log('📤 Upload Note Request');
        console.log('Body:', req.body);
        console.log('File:', req.file);

        const { subjectId, title, module, description } = req.body;

        if (!subjectId || !title || !req.file) {
            return res.status(400).json({
                error: 'Subject ID, title, and file are required',
            });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const filePath = req.file.path;
        console.log('📄 File path:', filePath);

        // Use Gemini Vision to extract text
        const text = await extractTextFromImage(filePath);

        const words = text.split(/\s+/);
        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }

        const note = new Note({
            subject: subjectId,
            title,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            chunkCount: chunks.length,
            content: text,
            uploadedBy: req.userId,
            module: module || '',
            description: description || '',
        });

        await note.save();

        res.status(201).json({
            message: '✅ Note uploaded successfully!',
            note: {
                id: note._id,
                title: note.title,
                fileName: note.fileName,
                originalName: note.originalName,
                fileSize: note.fileSize,
                chunkCount: note.chunkCount,
                module: note.module,
                contentLength: text.length,
            },
        });

    } catch (error) {
        console.error('Upload note error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload note: ' + error.message });
    }
});

// ============================================================
// ROUTE: Get Notes for a Subject
// ============================================================

router.get('/notes/:subjectId', async (req, res) => {
    try {
        const notes = await Note.find({ subject: req.params.subjectId })
            .populate('uploadedBy', 'name email')
            .sort({ uploadedAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// ============================================================
// ROUTE: Get PYQs for a Subject
// ============================================================

router.get('/pyqs/:subjectId', async (req, res) => {
    try {
        const pyqs = await PYQ.find({ subject: req.params.subjectId })
            .populate('uploadedBy', 'name email')
            .sort({ year: -1 });
        res.json(pyqs);
    } catch (error) {
        console.error('Get PYQs error:', error);
        res.status(500).json({ error: 'Failed to fetch PYQs' });
    }
});

// ============================================================
// ROUTE: Delete Note
// ============================================================

router.delete('/note/:id', async (req, res) => {
    try {
        const note = await Note.findByIdAndDelete(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ============================================================
// ROUTE: Delete PYQ
// ============================================================

router.delete('/pyq/:id', async (req, res) => {
    try {
        const pyq = await PYQ.findByIdAndDelete(req.params.id);
        if (!pyq) {
            return res.status(404).json({ error: 'PYQ not found' });
        }
        res.json({ message: 'PYQ deleted successfully' });
    } catch (error) {
        console.error('Delete PYQ error:', error);
        res.status(500).json({ error: 'Failed to delete PYQ' });
    }
});

module.exports = router;
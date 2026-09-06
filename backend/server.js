// Imported all the packages needed for the backend server to run.
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const chatRoutes = require('./src/routes/chat');
const adminUploadRoutes = require('./src/routes/admin/upload');

const adminSubjectRoutes = require('./src/routes/admin/subjects');
const cors = require('cors');
require('dotenv').config();
console.log('🔑 GEMINI_API_KEY from .env:', process.env.GEMINI_API_KEY);
console.log('📏 Key length:', process.env.GEMINI_API_KEY?.length || 0);
console.log('📂 Current directory:', __dirname);
// Import routes
const authRoutes = require('./src/routes/auth');

// Import middleware
const authMiddleware = require('./src/middleware/auth');
const adminMiddleware = require('./src/middleware/admin');

// Import models (for protected routes)
const User = require('./src/models/User');

// Add this line right after it:
const Subject = require('./src/models/Subject');
const Note = require('./src/models/Note');
const PYQ = require('./src/models/PYQ');

// Created an object of express to use the express methods.
const app = express(); // express() is a function that returns an object of express.
const PORT = process.env.PORT || 5000; 
// process.env.PORT is used to get the port number from the environment variable in the .env file.
// If the environment variable is not set, it will use 5000 as the default port number.
//writing this way allows us to deploy our app to a cloud service like Heroku, 
// which will set the PORT environment variable for us.

// Middleware (functions that run on every request)
// functions that are called before the request is sent to the server.
app.use(cors()); // cors() is a function that allows cross-origin requests.
app.use(express.json()); // express.json() is a function that parses the incoming request body as JSON.

//MongoDB connection

mongoose.connect(process.env.MONGO_URI)
    .then(()=>{console.log('MongoDB connected')})
    .catch((err)=>{console.log('MongoDB Error:', err)});


// PUBLIC ROUTES (No login required)
// ============================================================

// Auth routes (register, login)
app.use('/api/auth', authRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'StudyAssist Backend is working!' });
});

// PROTECTED ROUTES (Login required)
// ============================================================

// Get current user profile
app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password')
            .populate('branch', 'name code');  // ← This fetches branch details

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add this after the profile route
app.put('/api/profile/update', authMiddleware, async (req, res) => {
    try {
        const { name, branch, program, semester } = req.body;

        // Validate required fields
        if (!name || !branch || !program || !semester) {
            return res.status(400).json({
                error: 'All fields are required: name, branch, program, semester',
            });
        }

        // Update user
        const user = await User.findByIdAndUpdate(
            req.userId,
            {
                name,
                branch,
                program,
                semester: parseInt(semester),
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: user,
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Add this after the profile route
app.get('/api/subjects/student', authMiddleware, async (req, res) => {
    try {
        const { semester } = req.query;

        // Get the user's branch from the database (it's already an ObjectId)
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('User:', user.name, 'Branch:', user.branch, 'Semester:', user.semester);

        // Find subjects for this user's branch and semester
        const subjects = await Subject.find({
            branch: user.branch,  // This is the ObjectId from the user
            semester: parseInt(semester),
        }).populate('branch', 'name code');

        console.log(`Found ${subjects.length} subjects for ${user.name}`);

        res.json(subjects);
    } catch (error) {
        console.error('Error fetching student subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});
// Get subject by ID
app.get('/api/subjects/:id', authMiddleware, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id).populate('branch', 'name code');
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        res.json(subject);
    } catch (error) {
        console.error('Error fetching subject:', error);
        res.status(500).json({ error: 'Failed to fetch subject' });
    }
});
// ============================================================
// ADMIN ROUTES (Login + Admin role required)
// ============================================================
app.use('/api/admin/subjects', authMiddleware, adminMiddleware, adminSubjectRoutes);

app.use('/api/admin/upload', authMiddleware, adminUploadRoutes);
// Test admin route
app.get('/api/admin/test', authMiddleware, adminMiddleware, (req, res) => {
    res.json({ 
        message: '✅ Admin access granted!',
        admin: {
            id: req.userId,
            email: req.userEmail,
            role: req.userRole
        }
    });
});

const path = require('path');
const fs = require('fs');

// ============================================================
// VIEW PDF - NOTE (Accept token from query params)
// ============================================================
app.get('/api/upload/note/:id', async (req, res) => {
    try {
        // Check token from query param
        const token = req.query.token;
        if (!token) {
            return res.status(401).json({ error: 'No token provided. Please login.' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const uploadsDir = path.join(__dirname, 'uploads');
        const filePath = path.join(uploadsDir, note.fileName);

        if (!fs.existsSync(filePath)) {
            console.log('❌ File not found:', filePath);
            return res.status(404).json({ error: 'File not found on server' });
        }

        // Send the file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${note.originalName || note.fileName}"`);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// ============================================================
// VIEW PDF - PYQ (Accept token from query params)
// ============================================================
app.get('/api/upload/pyq/:id', async (req, res) => {
    try {
        // Check token from query param
        const token = req.query.token;
        if (!token) {
            return res.status(401).json({ error: 'No token provided. Please login.' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        const pyq = await PYQ.findById(req.params.id);
        if (!pyq) {
            return res.status(404).json({ error: 'PYQ not found' });
        }

        const uploadsDir = path.join(__dirname, 'uploads');
        const filePath = path.join(uploadsDir, pyq.fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        // Send the file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${pyq.originalName || pyq.fileName}"`);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Error fetching PYQ:', error);
        res.status(500).json({ error: 'Failed to fetch PYQ' });
    }
});

app.use('/api/chat', authMiddleware, chatRoutes);


app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Branch = require('../models/Branch');
// ============================================================
// REGISTER ROUTE: POST /api/auth/register
// ============================================================

router.post('/register', async (req, res) => {
    try {
        // 1. Get user data from request body
        const { email, password, name, branch, program, semester } = req.body;

        // 2. Validate required fields
        if (!email || !password || !name || !branch || !program || !semester) {
            return res.status(400).json({
                error: 'All fields are required!'
            });
        }

        // ============================================================
        // EMAIL VALIDATION
        // ============================================================

        // Remove extra spaces and convert email to lowercase
        const normalizedEmail = email.trim().toLowerCase();

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                error: 'Please enter a valid email address.'
            });
        }

        // ============================================================
        // PASSWORD VALIDATION
        // ============================================================

        // At least:
        // 8 characters
        // 1 uppercase letter
        // 1 lowercase letter
        // 1 number
        // 1 special character
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.'
            });
        }

        // ============================================================
        // NAME VALIDATION
        // ============================================================

        const normalizedName = name.trim();

        if (normalizedName.length < 2) {
            return res.status(400).json({
                error: 'Name must contain at least 2 characters.'
            });
        }

        // ============================================================
        // BRANCH VALIDATION
        // ============================================================

        // Find the Branch document using the branch code (e.g. "EE")
        const branchDoc = await Branch.findOne({
            code: branch.toUpperCase().trim()
        });

        if (!branchDoc) {
            return res.status(400).json({
                error: `Invalid branch code: ${branch}`
            });
        }

        // ============================================================
        // CHECK EXISTING USER
        // ============================================================

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Email already registered. Please login.'
            });
        }

        // ============================================================
        // HASH PASSWORD
        // ============================================================

        const hashedPassword = await bcrypt.hash(password, 10);

        // ============================================================
        // CREATE USER
        // ============================================================

        const user = new User({
            email: normalizedEmail,
            password: hashedPassword,
            name: normalizedName,
            branch: branchDoc._id,
            program,
            semester,
        });

        await user.save();

        // ============================================================
        // CREATE JWT TOKEN
        // ============================================================

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role,
                branch: user.branch,
                program: user.program,
                semester: user.semester
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // ============================================================
        // SEND RESPONSE
        // ============================================================

        res.status(201).json({
            message: '✅ Registration successful!',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                branch: user.branch,
                program: user.program,
                semester: user.semester,
                role: user.role,
            }
        });

    } catch (error) {
        console.error('Register error:', error);

        res.status(500).json({
            error: 'Server error. Please try again.'
        });
    }
});


// ============================================================
// LOGIN ROUTE: POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
    try {
        // 1. Get credentials from request
        const { email, password } = req.body;

        // 2. Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required.' 
            });
        }

        // 3. Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid email or password.' 
            });
        }

        // 4. Check if password is correct
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Invalid email or password.' 
            });
        }

        // 5. Create a new JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role,
                branch: user.branch,
                program: user.program,
                semester: user.semester
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 6. Send response
        res.json({
            message: '✅ Login successful!',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                branch: user.branch,
                program: user.program,
                semester: user.semester,
                role: user.role,
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ============================================================
// GET CURRENT USER: GET /api/auth/me
// ============================================================
router.get('/me', async (req, res) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user (exclude password)
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            branch: user.branch,
            program: user.program,
            semester: user.semester,
            role: user.role,
        });

    } catch (error) { // JsonWebTokenError, TokenExpiredError, or other errors thrown by jwt.verify
        //These error names are built-in error types thrown by the jsonwebtoken library when token verification fails. 
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.' });
        }
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
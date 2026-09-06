const jwt = require('jsonwebtoken');

// This function checks if the user has a valid token
const authMiddleware = async (req, res, next) => {
    try {
        // 1. Get token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'No token provided. Please login.' 
            });
        }

        // 2. Extract the token (remove "Bearer " part)
        const token = authHeader.split(' ')[1];

        // 3. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Attach user info to the request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        req.userBranch = decoded.branch;
        req.userProgram = decoded.program;
        req.userSemester = decoded.semester;

        // 5. Continue to the next function
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token. Please login again.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        res.status(401).json({ error: 'Authentication failed.' });
    }
};

module.exports = authMiddleware;
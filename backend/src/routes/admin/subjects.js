const express = require('express');
const router = express.Router();
const Branch = require('../../models/Branch');
const Subject = require('../../models/Subject');

// ============================================================
// BRANCH ROUTES
// ============================================================

// Get all branches
router.get('/branches', async (req, res) => {
    try {
        const branches = await Branch.find().sort({ name: 1 });
        res.json(branches);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// Create a new branch
router.post('/branches', async (req, res) => {
    try {
        const { name, code, description } = req.body;

        // Validate required fields
        if (!name || !code) {
            return res.status(400).json({ error: 'Name and code are required' });
        }

        const branch = new Branch({
            name,
            code: code.toUpperCase(),
            description: description || '',
        });

        await branch.save();
        res.status(201).json(branch);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Branch with this name or code already exists' });
        }
        console.error('Error creating branch:', error);
        res.status(500).json({ error: 'Failed to create branch' });
    }
});

// Delete a branch
router.delete('/branches/:id', async (req, res) => {
    try {
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Also delete all subjects associated with this branch
        await Subject.deleteMany({ branch: req.params.id });

        res.json({ message: 'Branch and associated subjects deleted successfully' });

    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ error: 'Failed to delete branch' });
    }
});

// ============================================================
// SUBJECT ROUTES
// ============================================================

// Get all subjects for a branch
router.get('/subjects', async (req, res) => {
    try {
        const { branchId } = req.query;
        let query = {};

        if (branchId) {
            query.branch = branchId;
        }

        const subjects = await Subject.find(query)
            .populate('branch', 'name code')
            .sort({ semester: 1, name: 1 });

        res.json(subjects);

    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

// Get subjects for a specific semester and branch
router.get('/subjects/filter', async (req, res) => {
    try {
        const { branchId, semester } = req.query;

        if (!branchId || !semester) {
            return res.status(400).json({ error: 'Branch ID and semester are required' });
        }

        const subjects = await Subject.find({
            branch: branchId,
            semester: parseInt(semester),
        })
        .populate('branch', 'name code')
        .sort({ name: 1 });

        res.json(subjects);

    } catch (error) {
        console.error('Error filtering subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

// Create a new subject
router.post('/subjects', async (req, res) => {
    try {
        const { name, code, branch, semester, description } = req.body;

        // Validate required fields
        if (!name || !code || !branch || !semester) {
            return res.status(400).json({ error: 'Name, code, branch, and semester are required' });
        }

        // Check if branch exists
        const branchExists = await Branch.findById(branch);
        if (!branchExists) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        const subject = new Subject({
            name,
            code: code.toUpperCase(),
            branch,
            semester: parseInt(semester),
            description: description || '',
        });

        await subject.save();

        // Populate branch info for response
        await subject.populate('branch', 'name code');

        res.status(201).json(subject);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Subject with this code already exists for this branch and semester' });
        }
        console.error('Error creating subject:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
});

// Delete a subject
router.delete('/subjects/:id', async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.id);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        res.json({ message: 'Subject deleted successfully' });

    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: 'Failed to delete subject' });
    }
});

module.exports = router;
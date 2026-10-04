const express = require('express');
const router = express.Router();
const QuizResult = require('../models/QuizResult');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const User = require('../models/User');


router.get('/branches', async (req, res) => {
    try {
        const Branch = require('../models/Branch');
        const branches = await Branch.find().sort({ name: 1 });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});
// ============================================================
// GET STUDENT STATS
// ============================================================
router.get('/student', async (req, res) => {
    try {
        const userId = req.userId;

        // Get all quiz results for this student
        const results = await QuizResult.find({ student: userId })
            .populate('quiz', 'subject title')
            .sort({ completedAt: -1 });

        // Get subject-wise stats
        const subjectStats = {};
        let totalQuizzes = 0;
        let totalCorrect = 0;
        let totalAttempted = 0;

        for (const result of results) {
            totalQuizzes++;
            totalCorrect += result.score;
            totalAttempted += result.totalQuestions;

            const subjectId = result.quiz?.subject;
            if (subjectId) {
                if (!subjectStats[subjectId]) {
                    subjectStats[subjectId] = {
                        quizzes: 0,
                        correct: 0,
                        attempted: 0,
                    };
                }
                subjectStats[subjectId].quizzes++;
                subjectStats[subjectId].correct += result.score;
                subjectStats[subjectId].attempted += result.totalQuestions;
            }
        }

        // Get subject names
        const subjectIds = Object.keys(subjectStats);
        const subjects = await Subject.find({ _id: { $in: subjectIds } });
        const subjectNameMap = {};
        subjects.forEach(s => {
            subjectNameMap[s._id] = s.name;
        });

        // Format subject stats
        const formattedSubjectStats = Object.keys(subjectStats).map(id => ({
            subjectId: id,
            subjectName: subjectNameMap[id] || 'Unknown Subject',
            quizzes: subjectStats[id].quizzes,
            accuracy: subjectStats[id].attempted > 0
                ? Math.round((subjectStats[id].correct / subjectStats[id].attempted) * 100)
                : 0,
        }));

        const overallAccuracy = totalAttempted > 0
            ? Math.round((totalCorrect / totalAttempted) * 100)
            : 0;

        // Get user stats
        const user = await User.findById(userId);
        const studyStreak = user?.stats?.studyStreak || 0;

        // Get recent quiz history (last 5)
        const recentHistory = results.slice(0, 5).map(r => ({
            quizId: r.quiz?._id,
            quizTitle: r.quiz?.title || 'Untitled Quiz',
            subjectName: subjectNameMap[r.quiz?.subject] || 'Unknown',
            score: r.score,
            totalQuestions: r.totalQuestions,
            percentage: r.percentage,
            completedAt: r.completedAt,
        }));

        res.json({
            totalQuizzes,
            totalCorrect,
            totalAttempted,
            overallAccuracy,
            studyStreak,
            subjectStats: formattedSubjectStats,
            recentHistory,
        });

    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});


// ============================================================
// UPDATE STUDY STREAK
// ============================================================
router.post('/streak', async (req, res) => {
    try {
        const userId = req.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const lastActivity = user.stats?.lastActivityDate;
        let streak = user.stats?.studyStreak || 0;

        if (lastActivity) {
            const lastDate = new Date(lastActivity);
            lastDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Already updated today
                return res.json({ streak });
            } else if (diffDays === 1) {
                // Consecutive day
                streak++;
            } else {
                // Break in streak
                streak = 1;
            }
        } else {
            // First activity
            streak = 1;
        }

        // Update user
        await User.findByIdAndUpdate(userId, {
            $set: {
                'stats.studyStreak': streak,
                'stats.lastActivityDate': today,
            },
        });

        res.json({ streak });

    } catch (error) {
        console.error('❌ Streak error:', error);
        res.status(500).json({ error: 'Failed to update streak' });
    }
});

// ============================================================
// GET LEADERBOARD
// ============================================================
router.get('/leaderboard', async (req, res) => {
    try {
        const { branch, semester } = req.query;

        console.log('📤 Leaderboard request:', { branch, semester });

        let query = {};
        if (branch) {
            query.branch = branch;
        }
        if (semester) {
            query.semester = parseInt(semester);
        }

        console.log('🔍 Query:', JSON.stringify(query));

        const users = await User.find(query)
            .select('name email branch semester stats role')
            .populate('branch', 'code name');

        console.log('👤 Users found:', users.length);
        console.log('👤 Users:', users.map(u => ({ name: u.name, semester: u.semester, branch: u.branch })));
        // Calculate stats for each user
        const leaderboard = users.map(user => {
            const stats = user.stats || {};
            const totalAttempted = stats.totalAttempted || 0;
            const totalCorrect = stats.totalCorrect || 0;
            const totalQuizzes = stats.totalQuizzes || 0;
            
            const accuracy = totalAttempted > 0
                ? Math.round((totalCorrect / totalAttempted) * 100)
                : 0;

            return {
                userId: user._id,
                name: user.name,
                email: user.email,
                branch: user.branch,
                semester: user.semester,
                totalQuizzes,
                totalCorrect,
                totalAttempted,
                accuracy,
                studyStreak: stats.studyStreak || 0,
                role: user.role,
            };
        });

        // Sort by accuracy (descending), then by total quizzes
        leaderboard.sort((a, b) => {
            if (b.accuracy !== a.accuracy) {
                return b.accuracy - a.accuracy;
            }
            return b.totalQuizzes - a.totalQuizzes;
        });

        // Add rank
        const ranked = leaderboard.map((user, index) => ({
            ...user,
            rank: index + 1,
        }));

        res.json({
            leaderboard: ranked,
            totalUsers: ranked.length,
        });

    } catch (error) {
        console.error('❌ Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    answers: [{
        type: Number, // Selected option index (0, 1, 2, 3)
    }],
    score: {
        type: Number,
        default: 0,
    },
    totalQuestions: {
        type: Number,
        required: true,
    },
    percentage: {
        type: Number,
        default: 0,
    },
    completedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);
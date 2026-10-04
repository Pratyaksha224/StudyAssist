const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    questions: [{
        question: {
            type: String,
            required: true,
        },
        options: {
            type: [String],
            required: true,
        },
        correctAnswer: {
            type: Number, // Index of the correct option (0, 1, 2, 3)
            required: true,
        },
        explanation: {
            type: String,
            default: '',
        },
    }],
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    },
    totalQuestions: {
        type: Number,
        default: 10,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Quiz', QuizSchema);
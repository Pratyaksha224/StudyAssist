const mongoose = require('mongoose');

const PYQSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        default: '',
    },
    fileName: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    chunkCount: {
        type: Number,
        default: 0,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    year: {
        type: Number,
        required: true,
    },
    examType: {
        type: String,
        enum: ['Mid Sem', 'End Sem', 'Quiz', 'Other'],
        default: 'End Sem',
    },
});

module.exports = mongoose.model('PYQ', PYQSchema);
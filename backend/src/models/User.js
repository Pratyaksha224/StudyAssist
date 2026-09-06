const mongoose = require('mongoose');

// This defines what a User looks like in the database
const UserSchema = new mongoose.Schema({
    // Email - must be unique
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    // Password - hashed, not plain text
    password: {
        type: String,
        required: true,
    },
    // Student's full name
    name: {
        type: String,
        required: true,
        trim: true,
    },
    // Which branch (EE, CS, ME, CE, ECE, Other)
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
},
 
    program: {
        type: String,
        enum: ['BTECH', 'DUAL', 'MTECH'],
        required: true
    },

    semester: {
        type: Number,
        required: true,
        min: 1,
        max:10
   },
    // Role: admin or student
    role: {
        type: String,
        enum: ['admin', 'student'],
        default: 'student',
    },
    // When the user registered
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Create the model from the schema
module.exports = mongoose.model('User', UserSchema);
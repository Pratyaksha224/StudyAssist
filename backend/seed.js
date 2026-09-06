const mongoose = require('mongoose');
require('dotenv').config();
const Branch = require('./models/Branch');

const branches = [
    { name: 'Electrical Engineering', code: 'EE' },
    { name: 'Computer Science', code: 'CS' },
    { name: 'Mechanical Engineering', code: 'ME' },
    { name: 'Civil Engineering', code: 'CE' },
    { name: 'Electronics & Communication', code: 'ECE' },
];

const seedBranches = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing branches
        await Branch.deleteMany({});
        console.log('Cleared existing branches');

        // Insert new branches
        await Branch.insertMany(branches);
        console.log('✅ Branches seeded successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding branches:', error);
        process.exit(1);
    }
};

seedBranches();
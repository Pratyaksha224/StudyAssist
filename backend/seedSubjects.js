const mongoose = require('mongoose');
require('dotenv').config();
const Branch = require('./src/models/Branch');
const Subject = require('./src/models/Subject');

const subjects = [
    // Semester 1
    { code: 'CS16105', name: 'Introduction to Computing', semester: 1 },
    { code: 'PH16101', name: 'Engineering Physics', semester: 1 },
    { code: 'HS16101', name: 'Communicative English', semester: 1 },
    { code: 'EE16106', name: 'Elements of Electrical Engineering - I', semester: 1 },
    { code: 'EC16102', name: 'Elements of Electronics Engineering', semester: 1 },

    // Semester 2
    { code: 'MA26101', name: 'Engineering Mathematics - I', semester: 2 },
    { code: 'CH26101', name: 'Engineering Chemistry', semester: 2 },
    { code: 'EE26105', name: 'Elements of Electrical Engineering - II', semester: 2 },
    { code: 'EE26106', name: 'Electrical Workshop', semester: 2 },
    { code: 'EC26105', name: 'Electronics Workshop', semester: 2 },
    { code: 'ME26101', name: 'Engineering Graphics', semester: 2 },

    // Semester 3
    { code: 'EE36101', name: 'Electrical Machines-I', semester: 3 },
    { code: 'EE36102', name: 'Network Analysis and Synthesis', semester: 3 },
    { code: 'EE36103', name: 'Electrical Measurement and Instrumentation', semester: 3 },
    { code: 'EE36104', name: 'Electromagnetic Field Theory', semester: 3 },
    { code: 'EC36102', name: 'Analog Electronics', semester: 3 },
    { code: 'MA36101', name: 'Engineering Mathematics - II', semester: 3 },

    // Semester 4
    { code: 'EE46101', name: 'Electrical Machine-II', semester: 4 },
    { code: 'EE46102', name: 'Power Transmission and Distribution', semester: 4 },
    { code: 'EE46103', name: 'Linear Control System', semester: 4 },
    { code: 'EC46102', name: 'Digital Electronics', semester: 4 },
    { code: 'CS46101', name: 'Object Oriented Programming', semester: 4 },

    // Semester 5
    { code: 'EE56101', name: 'Power System Analysis', semester: 5 },
    { code: 'EE56102', name: 'Power Electronics', semester: 5 },
    { code: 'EE56103', name: 'Microprocessor, Microcontroller and its Application', semester: 5 },
    { code: 'EC56101', name: 'Signal and System Analysis', semester: 5 },
    { code: 'HS56101', name: 'Professional Ethics', semester: 5 },

    // Semester 6
    { code: 'EE66101', name: 'Industrial Drives and Control', semester: 6 },
    { code: 'EE66102', name: 'Power System Protection and Switchgear', semester: 6 },
    { code: 'EE66103', name: 'Minor Project', semester: 6 },

    // Semester 7
    { code: 'EE76101', name: 'Electric Vehicle and Energy Storage System', semester: 7 },
    { code: 'EE76102', name: 'Power Converters and its Applications', semester: 7 },
    { code: 'EE76108', name: 'Industrial Training', semester: 7 },
    { code: 'EE76109', name: 'Research Project-I', semester: 7 },

    // Semester 8
    { code: 'EE86101', name: 'Research Project - II', semester: 8 },
];

const seedSubjects = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find EE branch
        const eeBranch = await Branch.findOne({ code: 'EE' });
        if (!eeBranch) {
            console.log('❌ EE Branch not found. Please create it first.');
            process.exit(1);
        }

        console.log(`✅ Found EE Branch: ${eeBranch.name}`);

        // Clear existing subjects for EE
        await Subject.deleteMany({ branch: eeBranch._id });
        console.log('✅ Cleared existing EE subjects');

        // Add all subjects
        let count = 0;
        for (const sub of subjects) {
            const subject = new Subject({
                name: sub.name,
                code: sub.code,
                branch: eeBranch._id,
                semester: sub.semester,
                description: '',
            });
            await subject.save();
            count++;
            console.log(`  ✅ Added: ${sub.code} - ${sub.name} (Sem ${sub.semester})`);
        }

        console.log(`\n✅ Successfully added ${count} subjects!`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedSubjects();
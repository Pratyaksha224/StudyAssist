const mongoose = require('mongoose');
require('dotenv').config();

export const mongo=mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.log('❌ Error:', err));

const User = require('./src/models/User');
const Branch = require('./src/models/Branch');

const convertUsers = async () => {
  try {
    // Get all branches
    const branches = await Branch.find({});
    console.log('📚 Branches found:', branches.length);

    // Create a mapping from branch code to ObjectId
    const branchMap = {};
    branches.forEach(b => {
      branchMap[b.code] = b._id;
    });
    console.log('📋 Branch mapping:', branchMap);

    // Find all users
    const users = await User.find({});
    console.log('👤 Total users:', users.length);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if branch is a string (like "EE", "CS", etc.)
      if (typeof user.branch === 'string' && branchMap[user.branch]) {
        const oldBranch = user.branch;
        user.branch = branchMap[user.branch];
        await user.save();
        updatedCount++;
        console.log(`✅ Updated ${user.name}: ${oldBranch} → ${user.branch}`);
      } else if (typeof user.branch === 'string') {
        console.log(`⚠️ Branch "${user.branch}" not found for ${user.name}`);
        skippedCount++;
      } else {
        console.log(`ℹ️ ${user.name} already has ObjectId: ${user.branch}`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} users!`);
    console.log(`ℹ️ Skipped ${skippedCount} users with unknown branches`);

    // Verify the conversion
    const updatedUsers = await User.find({}).populate('branch', 'code name');
    console.log('\n👤 Users after conversion:');
    updatedUsers.forEach(u => {
      console.log(`  - ${u.name}: Branch = ${u.branch?.code || u.branch || 'NULL'}`);
    });

    mongoose.disconnect();
  } catch (err) {
    console.log('❌ Error:', err);
    mongoose.disconnect();
  }
};

convertUsers();
import { sequelize } from '../config/database.js';
import User from '../models/User.js';
import { hashPassword } from '../services/passwordService.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const addUser = async () => {
  try {
    console.log('\n=== Add New User to Database ===\n');

    // Get campuses
    const campuses = await sequelize.query(
      `SELECT id, code, name FROM campuses ORDER BY code;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (campuses.length === 0) {
      console.error('❌ No campuses found. Please run campus seeder first.');
      process.exit(1);
    }

    // Display campuses
    console.log('Available Campuses:');
    campuses.forEach((campus, index) => {
      console.log(`  ${index + 1}. ${campus.name} (${campus.code})`);
    });
    console.log('');

    // Get user input
    const name = await question('Enter name: ');
    const email = await question('Enter email: ');
    const phone = await question('Enter phone (format: +919876543210): ');
    const password = await question('Enter password: ');
    
    console.log('\nAvailable Roles:');
    console.log('  1. Super_Admin');
    console.log('  2. Admin');
    console.log('  3. Teacher');
    console.log('  4. Student');
    console.log('  5. Parent');
    const roleChoice = await question('\nSelect role (1-5): ');
    
    const roles = ['Super_Admin', 'Admin', 'Teacher', 'Student', 'Parent'];
    const role = roles[parseInt(roleChoice) - 1];

    if (!role) {
      console.error('❌ Invalid role selection');
      process.exit(1);
    }

    const campusChoice = await question(`\nSelect campus (1-${campuses.length}): `);
    const campus = campuses[parseInt(campusChoice) - 1];

    if (!campus) {
      console.error('❌ Invalid campus selection');
      process.exit(1);
    }

    const address = await question('Enter address (optional, press Enter to skip): ');

    rl.close();

    // Validate required fields
    if (!name || !email || !phone || !password) {
      console.error('❌ Name, email, phone, and password are required');
      process.exit(1);
    }

    // Connect to database
    await sequelize.authenticate();
    console.log('\n✓ Database connection established');

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      console.error(`❌ User with phone ${phone} already exists`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      phone,
      password_hash: passwordHash,
      name,
      role,
      campus_id: campus.id,
      profile_picture_url: null,
      address: address || null,
      account_status: 'active',
      failed_login_attempts: 0,
      locked_until: null,
      token_version: 0,
      last_login_at: null
    });

    console.log('\n✓ User created successfully!');
    console.log('\nUser Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phone}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Campus: ${campus.name} (${campus.code})`);
    console.log(`  Status: ${user.account_status}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error adding user:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    process.exit(1);
  }
};

addUser();

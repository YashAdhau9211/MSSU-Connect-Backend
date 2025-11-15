import bcrypt from 'bcrypt';

/**
 * Seeder: Create Sample Users for Development
 * 
 * This seeder creates sample users for each role to facilitate development and testing.
 * 
 * IMPORTANT: This seeder is OPTIONAL and should ONLY be used in development environments.
 * DO NOT run this seeder in staging or production environments.
 * 
 * Sample Users Created:
 * - 1 Admin per campus (4 total)
 * - 2 Teachers per campus (8 total)
 * - 2 Students per campus (8 total)
 * - 1 Parent per campus (4 total)
 * 
 * All sample users have the password: Test@123456
 */

export const up = async (queryInterface, Sequelize) => {
  // Check environment - only run in development
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Skipping sample users seeder in production environment');
    return;
  }

  // Get all campuses
  const campuses = await queryInterface.sequelize.query(
    `SELECT id, code, name FROM campuses ORDER BY code;`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  if (campuses.length === 0) {
    throw new Error('No campuses found. Please run campus seeder first.');
  }

  // Hash the default password for all sample users
  const defaultPassword = 'Test@123456';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const sampleUsers = [];
  let userCounter = 1;

  // Create sample users for each campus
  for (const campus of campuses) {
    const campusCode = campus.code.toLowerCase();

    // 1 Admin per campus
    sampleUsers.push({
      id: Sequelize.literal('gen_random_uuid()'),
      email: `admin.${campusCode}@mssu.ac.in`,
      phone: `+9198765${String(userCounter).padStart(5, '0')}`,
      password_hash: passwordHash,
      name: `${campus.name} Admin`,
      role: 'Admin',
      campus_id: campus.id,
      profile_picture_url: null,
      address: `${campus.name} Campus Address`,
      account_status: 'active',
      failed_login_attempts: 0,
      locked_until: null,
      token_version: 0,
      last_login_at: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    userCounter++;

    // 2 Teachers per campus
    for (let i = 1; i <= 2; i++) {
      sampleUsers.push({
        id: Sequelize.literal('gen_random_uuid()'),
        email: `teacher${i}.${campusCode}@mssu.ac.in`,
        phone: `+9198765${String(userCounter).padStart(5, '0')}`,
        password_hash: passwordHash,
        name: `${campus.name} Teacher ${i}`,
        role: 'Teacher',
        campus_id: campus.id,
        profile_picture_url: null,
        address: `${campus.name} Teacher Address ${i}`,
        account_status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        token_version: 0,
        last_login_at: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      userCounter++;
    }

    // 2 Students per campus
    for (let i = 1; i <= 2; i++) {
      sampleUsers.push({
        id: Sequelize.literal('gen_random_uuid()'),
        email: `student${i}.${campusCode}@mssu.ac.in`,
        phone: `+9198765${String(userCounter).padStart(5, '0')}`,
        password_hash: passwordHash,
        name: `${campus.name} Student ${i}`,
        role: 'Student',
        campus_id: campus.id,
        profile_picture_url: null,
        address: `${campus.name} Student Address ${i}`,
        account_status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        token_version: 0,
        last_login_at: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      userCounter++;
    }

    // 1 Parent per campus
    sampleUsers.push({
      id: Sequelize.literal('gen_random_uuid()'),
      email: `parent.${campusCode}@mssu.ac.in`,
      phone: `+9198765${String(userCounter).padStart(5, '0')}`,
      password_hash: passwordHash,
      name: `${campus.name} Parent`,
      role: 'Parent',
      campus_id: campus.id,
      profile_picture_url: null,
      address: `${campus.name} Parent Address`,
      account_status: 'active',
      failed_login_attempts: 0,
      locked_until: null,
      token_version: 0,
      last_login_at: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    userCounter++;
  }

  // Insert all sample users
  await queryInterface.bulkInsert('users', sampleUsers);

  console.log(`✓ Created ${sampleUsers.length} sample users for development`);
  console.log('  Default password for all users: Test@123456');
  console.log('\n  Sample user emails by role:');
  console.log('  - Admins: admin.nm@mssu.ac.in, admin.th@mssu.ac.in, admin.ng@mssu.ac.in, admin.pn@mssu.ac.in');
  console.log('  - Teachers: teacher1.nm@mssu.ac.in, teacher2.nm@mssu.ac.in, etc.');
  console.log('  - Students: student1.nm@mssu.ac.in, student2.nm@mssu.ac.in, etc.');
  console.log('  - Parents: parent.nm@mssu.ac.in, parent.th@mssu.ac.in, etc.');
};

export const down = async (queryInterface, Sequelize) => {
  // Get all campuses
  const campuses = await queryInterface.sequelize.query(
    `SELECT code FROM campuses ORDER BY code;`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  // Build list of sample user emails to delete
  const emailsToDelete = [];

  for (const campus of campuses) {
    const campusCode = campus.code.toLowerCase();
    
    // Admin
    emailsToDelete.push(`admin.${campusCode}@mssu.ac.in`);
    
    // Teachers
    emailsToDelete.push(`teacher1.${campusCode}@mssu.ac.in`);
    emailsToDelete.push(`teacher2.${campusCode}@mssu.ac.in`);
    
    // Students
    emailsToDelete.push(`student1.${campusCode}@mssu.ac.in`);
    emailsToDelete.push(`student2.${campusCode}@mssu.ac.in`);
    
    // Parent
    emailsToDelete.push(`parent.${campusCode}@mssu.ac.in`);
  }

  await queryInterface.bulkDelete('users', {
    email: emailsToDelete,
  });

  console.log(`✓ Removed ${emailsToDelete.length} sample users`);
};

import bcrypt from 'bcrypt';

/**
 * Seeder: Create Super_Admin User Account
 * 
 * This seeder creates the initial Super_Admin user account for system administration.
 * 
 * Default Credentials:
 * - Email: admin@mssu.ac.in
 * - Password: Admin@123456 (MUST be changed after first login in production)
 * - Role: Super_Admin
 * - Campus: Navi Mumbai (first campus)
 * 
 * SECURITY WARNING: Change the default password immediately after deployment!
 */

export const up = async (queryInterface, Sequelize) => {
  // Get the first campus (Navi Mumbai) to assign to Super_Admin
  const campuses = await queryInterface.sequelize.query(
    `SELECT id FROM campuses WHERE code = 'NM' LIMIT 1;`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  if (campuses.length === 0) {
    throw new Error('No campuses found. Please run campus seeder first.');
  }

  const campusId = campuses[0].id;

  // Hash the default password
  const defaultPassword = 'Admin@123456';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  // Check if Super_Admin already exists
  const existingAdmin = await queryInterface.sequelize.query(
    `SELECT id FROM users WHERE email = 'admin@mssu.ac.in' LIMIT 1;`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  if (existingAdmin.length > 0) {
    console.log('Super_Admin user already exists. Skipping...');
    return;
  }

  // Create Super_Admin user
  const superAdmin = {
    id: Sequelize.literal('gen_random_uuid()'),
    email: 'admin@mssu.ac.in',
    phone: '+919999999999', // Placeholder phone number
    password_hash: passwordHash,
    name: 'System Administrator',
    role: 'Super_Admin',
    campus_id: campusId,
    profile_picture_url: null,
    address: null,
    account_status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    token_version: 0,
    last_login_at: null,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await queryInterface.bulkInsert('users', [superAdmin]);

  console.log('✓ Super_Admin user created successfully');
  console.log('  Email: admin@mssu.ac.in');
  console.log('  Password: Admin@123456');
  console.log('  ⚠️  WARNING: Change this password immediately after first login!');
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.bulkDelete('users', {
    email: 'admin@mssu.ac.in',
  });

  console.log('✓ Super_Admin user removed');
};

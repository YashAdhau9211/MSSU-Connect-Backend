import { sequelize } from '../config/database.js';
import Campus from '../models/Campus.js';

async function seedCampuses() {
  try {
    console.log('🌱 Seeding campuses...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if campuses already exist
    const existingCount = await Campus.count();
    if (existingCount > 0) {
      console.log(`ℹ️  ${existingCount} campus(es) already exist. Skipping seed.\n`);
      return;
    }

    const campuses = [
      {
        name: 'Navi Mumbai',
        code: 'NM',
        address: 'Navi Mumbai Campus Address',
        contact_email: 'navimumbai@mssu.ac.in',
        contact_phone: '+912227123456',
        is_active: true,
      },
      {
        name: 'Thane',
        code: 'TH',
        address: 'Thane Campus Address',
        contact_email: 'thane@mssu.ac.in',
        contact_phone: '+912225123456',
        is_active: true,
      },
      {
        name: 'Nagpur',
        code: 'NG',
        address: 'Nagpur Campus Address',
        contact_email: 'nagpur@mssu.ac.in',
        contact_phone: '+917122123456',
        is_active: true,
      },
      {
        name: 'Pune',
        code: 'PN',
        address: 'Pune Campus Address',
        contact_email: 'pune@mssu.ac.in',
        contact_phone: '+912026123456',
        is_active: true,
      },
    ];

    await Campus.bulkCreate(campuses);
    console.log('✅ Successfully seeded 4 campuses\n');

    const allCampuses = await Campus.findAll();
    allCampuses.forEach(campus => {
      console.log(`   - ${campus.name} (${campus.code})`);
    });
    console.log();

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed');
  }
}

seedCampuses();

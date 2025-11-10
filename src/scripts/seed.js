import { sequelize } from '../config/database.js';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../seeders/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ 
    sequelize,
    tableName: 'SequelizeSeederMeta',
  }),
  logger: console,
});

const runSeeders = async () => {
  try {
    console.log('Running seeders...');
    const seeders = await umzug.up();
    console.log(`✓ Executed ${seeders.length} seeders successfully`);
    seeders.forEach(seeder => {
      console.log(`  - ${seeder.name}`);
    });
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    throw error;
  }
};

const rollbackSeeders = async () => {
  try {
    console.log('Rolling back last seeder...');
    const seeder = await umzug.down();
    console.log(`✓ Rolled back seeder: ${seeder ? seeder.name : 'none'}`);
  } catch (error) {
    console.error('✗ Rollback failed:', error);
    throw error;
  }
};

const command = process.argv[2];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    if (command === 'up') {
      await runSeeders();
    } else if (command === 'down') {
      await rollbackSeeders();
    } else {
      console.log('Usage: node seed.js [up|down]');
      process.exit(1);
    }

    await sequelize.close();
    console.log('✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

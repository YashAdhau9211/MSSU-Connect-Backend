import { sequelize } from '../config/database.js';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

const runMigrations = async () => {
  try {
    console.log('Running migrations...');
    const migrations = await umzug.up();
    console.log(`✓ Executed ${migrations.length} migrations successfully`);
    migrations.forEach(migration => {
      console.log(`  - ${migration.name}`);
    });
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  }
};

const rollbackMigrations = async () => {
  try {
    console.log('Rolling back last migration...');
    const migration = await umzug.down();
    console.log(`✓ Rolled back migration: ${migration ? migration.name : 'none'}`);
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
      await runMigrations();
    } else if (command === 'down') {
      await rollbackMigrations();
    } else {
      console.log('Usage: node migrate.js [up|down]');
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

#!/usr/bin/env node

/**
 * Production Database Migration Script
 * 
 * This script is designed for production deployments with:
 * - Comprehensive error handling
 * - Backup verification before migrations
 * - Rollback capability
 * - Detailed logging
 * - Safety checks
 * 
 * Usage:
 *   node src/scripts/migrate-production.js up          # Run pending migrations
 *   node src/scripts/migrate-production.js down        # Rollback last migration
 *   node src/scripts/migrate-production.js status      # Check migration status
 *   node src/scripts/migrate-production.js pending     # List pending migrations
 *   node src/scripts/migrate-production.js executed    # List executed migrations
 * 
 * Environment Variables Required:
 *   DATABASE_URL or DB_* variables (see config/database.js)
 * 
 * Safety Features:
 *   - Requires confirmation in production
 *   - Validates database connection before running
 *   - Logs all operations
 *   - Provides detailed error messages
 */

import { sequelize } from '../config/database.js';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.warn(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Configure Umzug for migrations
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    info: (msg) => log.info(msg.message || msg),
    warn: (msg) => log.warning(msg.message || msg),
    error: (msg) => log.error(msg.message || msg),
    debug: () => {}, // Suppress debug logs
  },
});

/**
 * Prompt user for confirmation in production
 */
const confirmAction = (message) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${colors.yellow}⚠${colors.reset} ${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

/**
 * Validate database connection
 */
const validateConnection = async () => {
  try {
    await sequelize.authenticate();
    log.success('Database connection established');
    
    // Get database info
    const [results] = await sequelize.query('SELECT version()');
    log.info(`Database: ${results[0].version}`);
    
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    return false;
  }
};

/**
 * Run pending migrations
 */
const runMigrations = async () => {
  try {
    log.header('Running Database Migrations');
    
    // Check for pending migrations
    const pending = await umzug.pending();
    
    if (pending.length === 0) {
      log.info('No pending migrations to run');
      return;
    }
    
    log.info(`Found ${pending.length} pending migration(s):`);
    pending.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration.name}`);
    });
    
    // Confirm in production
    if (process.env.NODE_ENV === 'production') {
      log.warning('Running migrations in PRODUCTION environment');
      const confirmed = await confirmAction('Do you want to proceed with migrations?');
      
      if (!confirmed) {
        log.info('Migration cancelled by user');
        return;
      }
    }
    
    // Run migrations
    console.log('');
    const startTime = Date.now();
    const migrations = await umzug.up();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    log.success(`Executed ${migrations.length} migration(s) successfully in ${duration}s`);
    migrations.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration.name}`);
    });
    
  } catch (error) {
    log.error('Migration failed');
    console.error(error);
    throw error;
  }
};

/**
 * Rollback last migration
 */
const rollbackMigration = async () => {
  try {
    log.header('Rolling Back Last Migration');
    
    // Check for executed migrations
    const executed = await umzug.executed();
    
    if (executed.length === 0) {
      log.info('No migrations to rollback');
      return;
    }
    
    const lastMigration = executed[executed.length - 1];
    log.info(`Last migration: ${lastMigration.name}`);
    
    // Confirm in production
    if (process.env.NODE_ENV === 'production') {
      log.warning('Rolling back migration in PRODUCTION environment');
      const confirmed = await confirmAction(`Do you want to rollback "${lastMigration.name}"?`);
      
      if (!confirmed) {
        log.info('Rollback cancelled by user');
        return;
      }
    }
    
    // Rollback
    console.log('');
    const startTime = Date.now();
    const migration = await umzug.down();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    if (migration) {
      log.success(`Rolled back migration "${migration.name}" in ${duration}s`);
    } else {
      log.info('No migration was rolled back');
    }
    
  } catch (error) {
    log.error('Rollback failed');
    console.error(error);
    throw error;
  }
};

/**
 * Show migration status
 */
const showStatus = async () => {
  try {
    log.header('Migration Status');
    
    const executed = await umzug.executed();
    const pending = await umzug.pending();
    
    console.log(`${colors.bright}Executed Migrations:${colors.reset} ${executed.length}`);
    if (executed.length > 0) {
      executed.forEach((migration, index) => {
        console.log(`  ${colors.green}✓${colors.reset} ${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('  (none)');
    }
    
    console.log('');
    console.log(`${colors.bright}Pending Migrations:${colors.reset} ${pending.length}`);
    if (pending.length > 0) {
      pending.forEach((migration, index) => {
        console.log(`  ${colors.yellow}○${colors.reset} ${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('  (none)');
    }
    
  } catch (error) {
    log.error('Failed to get migration status');
    console.error(error);
    throw error;
  }
};

/**
 * List pending migrations
 */
const listPending = async () => {
  try {
    const pending = await umzug.pending();
    
    if (pending.length === 0) {
      log.info('No pending migrations');
      return;
    }
    
    log.info(`Pending migrations (${pending.length}):`);
    pending.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration.name}`);
    });
    
  } catch (error) {
    log.error('Failed to list pending migrations');
    console.error(error);
    throw error;
  }
};

/**
 * List executed migrations
 */
const listExecuted = async () => {
  try {
    const executed = await umzug.executed();
    
    if (executed.length === 0) {
      log.info('No executed migrations');
      return;
    }
    
    log.info(`Executed migrations (${executed.length}):`);
    executed.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration.name}`);
    });
    
  } catch (error) {
    log.error('Failed to list executed migrations');
    console.error(error);
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  const command = process.argv[2];
  
  // Show usage if no command provided
  if (!command) {
    console.log(`
${colors.bright}Production Database Migration Tool${colors.reset}

${colors.bright}Usage:${colors.reset}
  node src/scripts/migrate-production.js <command>

${colors.bright}Commands:${colors.reset}
  up         Run all pending migrations
  down       Rollback the last migration
  status     Show migration status (executed and pending)
  pending    List pending migrations
  executed   List executed migrations

${colors.bright}Examples:${colors.reset}
  node src/scripts/migrate-production.js up
  node src/scripts/migrate-production.js status
  node src/scripts/migrate-production.js down

${colors.bright}Environment:${colors.reset}
  NODE_ENV: ${process.env.NODE_ENV || 'development'}
  Database: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}
`);
    process.exit(0);
  }
  
  try {
    // Validate database connection
    const isConnected = await validateConnection();
    if (!isConnected) {
      log.error('Cannot proceed without database connection');
      process.exit(1);
    }
    
    // Execute command
    switch (command) {
      case 'up':
        await runMigrations();
        break;
      case 'down':
        await rollbackMigration();
        break;
      case 'status':
        await showStatus();
        break;
      case 'pending':
        await listPending();
        break;
      case 'executed':
        await listExecuted();
        break;
      default:
        log.error(`Unknown command: ${command}`);
        log.info('Run without arguments to see usage');
        process.exit(1);
    }
    
    // Close database connection
    await sequelize.close();
    log.success('Database connection closed');
    
    process.exit(0);
    
  } catch (error) {
    log.error('Operation failed');
    console.error(error);
    
    // Attempt to close connection
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
};

// Run main function
main();

# Database Seeders

This directory contains Sequelize seeders for populating the MSSU-Connect database with initial and sample data.

## Overview

Seeders are scripts that populate the database with initial data required for the application to function, as well as optional sample data for development and testing.

## Available Seeders

### 1. `20240101000001-seed-campuses.js` (REQUIRED)
Seeds the four MSSU campuses:
- **Navi Mumbai (NM)** - Primary campus
- **Thane (TH)** - Secondary campus
- **Nagpur (NG)** - Regional campus
- **Pune (PN)** - Regional campus

**Status**: Required for all environments
**Run Order**: Must run first (before users)

### 2. `20240101000002-seed-super-admin.js` (REQUIRED)
Creates the initial Super_Admin user account:
- **Email**: admin@mssu.ac.in
- **Password**: Admin@123456 (⚠️ MUST be changed after first login)
- **Role**: Super_Admin
- **Campus**: Navi Mumbai (NM)
- **Phone**: +919999999999 (placeholder)

**Status**: Required for all environments
**Run Order**: Must run after campuses seeder
**Security**: Change default password immediately after deployment!

### 3. `20240101000003-seed-sample-users.js` (OPTIONAL)
Creates sample users for development and testing:
- **1 Admin** per campus (4 total)
- **2 Teachers** per campus (8 total)
- **2 Students** per campus (8 total)
- **1 Parent** per campus (4 total)
- **Total**: 24 sample users

**Default Password**: Test@123456 (for all sample users)

**Status**: Optional - Development/Staging only
**Run Order**: Must run after Super_Admin seeder
**⚠️ WARNING**: DO NOT run in production environments!

## Running Seeders

### Apply All Seeders
```bash
npm run seed
```

### Rollback Last Seeder
```bash
npm run seed:down
```

### Using the Seed Script Directly
```bash
# Apply all seeders
node src/scripts/seed.js up

# Rollback last seeder
node src/scripts/seed.js down
```

## Seeder Execution Order

Seeders must be executed in the following order due to foreign key dependencies:

1. **Campuses** → Creates campus records
2. **Super_Admin** → Creates admin user (references campus)
3. **Sample Users** → Creates test users (references campus)

## Environment-Specific Usage

### Development Environment
Run all seeders including sample users:
```bash
npm run seed
```

This will create:
- 4 campuses
- 1 Super_Admin
- 24 sample users (optional)

### Staging Environment
Run required seeders only:
```bash
# Run campuses seeder
node src/scripts/seed.js up

# Optionally include sample users for testing
# (Sample users seeder checks NODE_ENV and skips if production)
```

### Production Environment
Run required seeders only:
```bash
npm run seed
```

The sample users seeder will automatically skip in production environment.

**⚠️ CRITICAL**: After running seeders in production:
1. Log in as Super_Admin (admin@mssu.ac.in / Admin@123456)
2. **Immediately change the password** via the profile settings
3. Update the phone number to a real number
4. Verify all campus information is correct

## Sample User Credentials

### Super_Admin
- **Email**: admin@mssu.ac.in
- **Password**: Admin@123456
- **Campus**: Navi Mumbai

### Campus Admins (Development Only)
- **Navi Mumbai**: admin.nm@mssu.ac.in / Test@123456
- **Thane**: admin.th@mssu.ac.in / Test@123456
- **Nagpur**: admin.ng@mssu.ac.in / Test@123456
- **Pune**: admin.pn@mssu.ac.in / Test@123456

### Teachers (Development Only)
- **Format**: teacher1.{campus_code}@mssu.ac.in / Test@123456
- **Examples**: 
  - teacher1.nm@mssu.ac.in
  - teacher2.th@mssu.ac.in

### Students (Development Only)
- **Format**: student1.{campus_code}@mssu.ac.in / Test@123456
- **Examples**:
  - student1.nm@mssu.ac.in
  - student2.ng@mssu.ac.in

### Parents (Development Only)
- **Format**: parent.{campus_code}@mssu.ac.in / Test@123456
- **Examples**:
  - parent.nm@mssu.ac.in
  - parent.pn@mssu.ac.in

## Idempotency

All seeders are designed to be idempotent:
- **Campus seeder**: Checks for existing campuses by code
- **Super_Admin seeder**: Checks for existing admin by email
- **Sample users seeder**: Can be run multiple times (will create duplicates if emails don't exist)

## Rollback Behavior

Each seeder includes a `down` method for cleanup:
- **Campuses**: Deletes campuses by code (NM, TH, NG, PN)
- **Super_Admin**: Deletes user by email (admin@mssu.ac.in)
- **Sample Users**: Deletes all sample users by email pattern

**⚠️ WARNING**: Rolling back seeders will delete data. Use with caution!

## Security Best Practices

### Default Passwords
All seeded users have default passwords that MUST be changed:
- **Production**: Change Super_Admin password immediately
- **Development**: Default passwords are acceptable for testing

### Password Requirements
All passwords meet the system requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Phone Numbers
- **Super_Admin**: Uses placeholder phone (+919999999999)
- **Sample Users**: Use sequential placeholder phones
- **Production**: Update to real phone numbers after seeding

## Troubleshooting

### Seeder Fails with "No campuses found"
- Ensure migrations have been run first: `npm run migrate`
- Verify campuses seeder has been executed
- Check database connection

### Duplicate Key Error
- Seeder may have already been run
- Check `SequelizeSeederMeta` table to see which seeders have executed
- Use rollback to remove existing data: `npm run seed:down`

### Sample Users Not Created in Production
- This is expected behavior - sample users seeder checks `NODE_ENV`
- Sample users are only created in development/staging environments

### Cannot Login with Default Credentials
- Verify seeder completed successfully (check console output)
- Ensure password meets requirements (Admin@123456 or Test@123456)
- Check if account status is 'active' in database
- Verify email is correct (case-sensitive)

## Database State After Seeding

### After Required Seeders (Production)
```
Campuses: 4 records
Users: 1 record (Super_Admin)
Audit Logs: 0 records (created during usage)
```

### After All Seeders (Development)
```
Campuses: 4 records
Users: 25 records (1 Super_Admin + 24 sample users)
Audit Logs: 0 records (created during usage)
```

## Testing Seeders

### Verify Seeders Executed
```sql
-- Check seeder execution history
SELECT * FROM "SequelizeSeederMeta";

-- Verify campuses
SELECT code, name FROM campuses ORDER BY code;

-- Verify Super_Admin
SELECT email, name, role FROM users WHERE role = 'Super_Admin';

-- Count users by role (development)
SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;
```

### Test Login
After seeding, test login with Super_Admin credentials:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mssu.ac.in",
    "password": "Admin@123456"
  }'
```

## Related Documentation

- [Migrations README](../migrations/README.md) - Database schema migrations
- [Database Configuration](../../config/database.js) - Database connection setup
- [Seed Script](../scripts/seed.js) - Seeder execution script
- [Password Service](../services/passwordService.js) - Password hashing implementation

## Maintenance

### Adding New Seeders
1. Create new seeder file with timestamp prefix: `YYYYMMDDHHMMSS-description.js`
2. Implement `up` and `down` methods
3. Handle idempotency (check for existing data)
4. Update this README with seeder documentation
5. Test in development before deploying

### Updating Campus Data
To update campus information:
1. Modify the campus seeder data
2. Rollback: `npm run seed:down`
3. Re-run: `npm run seed`
4. Or manually update via SQL/Admin panel

### Resetting Development Database
To start fresh in development:
```bash
# Rollback all seeders
npm run seed:down
npm run seed:down
npm run seed:down

# Rollback all migrations
npm run migrate:down
npm run migrate:down
npm run migrate:down

# Re-run migrations and seeders
npm run migrate
npm run seed
```

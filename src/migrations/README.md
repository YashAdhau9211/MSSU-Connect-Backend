# Database Migrations

This directory contains Sequelize migrations for the MSSU-Connect database schema.

## Overview

Migrations are version-controlled database schema changes that can be applied and rolled back in a consistent manner across all environments.

## Available Migrations

### 1. `20240101000001-create-campuses.js`
Creates the `campuses` table with the following structure:
- **Fields**: id, name, code, address, contact_email, contact_phone, is_active, timestamps
- **Indexes**: Unique index on `code` field
- **Purpose**: Store information about the four MSSU campuses (Navi Mumbai, Thane, Nagpur, Pune)

### 2. `20240101000002-create-users.js`
Creates the `users` table with the following structure:
- **Fields**: id, email, phone, password_hash, name, role, campus_id, profile_picture_url, address, account_status, failed_login_attempts, locked_until, token_version, last_login_at, deleted_at, timestamps
- **Indexes**: 
  - Unique index on `email`
  - Composite index on `(campus_id, role)`
  - Composite index on `(account_status, campus_id)`
  - Index on `deleted_at` for soft delete queries
- **Foreign Keys**: `campus_id` references `campuses(id)`
- **Purpose**: Store user accounts for all roles (Student, Teacher, Parent, Admin, Super_Admin)

### 3. `20240101000003-create-audit-logs.js`
Creates the `audit_logs` table with the following structure:
- **Fields**: id, user_id, admin_id, action_type, resource_type, resource_id, ip_address, user_agent, details (JSONB), created_at
- **Indexes**:
  - Composite index on `(user_id, created_at)`
  - Composite index on `(action_type, created_at)`
  - Composite index on `(admin_id, created_at)`
- **Foreign Keys**: `user_id` and `admin_id` reference `users(id)`
- **Purpose**: Immutable audit trail for security and compliance

## Running Migrations

### Apply All Pending Migrations
```bash
npm run migrate
```

### Rollback Last Migration
```bash
npm run migrate:down
```

### Using the Migration Script Directly
```bash
# Apply migrations
node src/scripts/migrate.js up

# Rollback last migration
node src/scripts/migrate.js down
```

## Migration Order

Migrations are executed in chronological order based on their timestamp prefix:
1. Campuses (must run first - referenced by users)
2. Users (must run second - referenced by audit_logs)
3. Audit Logs (must run last - references users)

## Idempotency

All migrations are designed to be idempotent:
- **Up migrations**: Create tables and indexes if they don't exist
- **Down migrations**: Drop tables and indexes safely

## Rollback Safety

Each migration includes a `down` method that safely reverses the changes:
- Tables are dropped in reverse dependency order
- Foreign key constraints are handled automatically
- Indexes are removed with their parent tables

## Best Practices

1. **Never modify existing migrations** - Create new migrations for schema changes
2. **Test migrations** in development before applying to staging/production
3. **Backup database** before running migrations in production
4. **Run migrations** during maintenance windows for production
5. **Monitor execution** - Migrations log their progress to console

## Database Schema Diagram

```
┌─────────────┐
│  campuses   │
│─────────────│
│ id (PK)     │
│ name        │
│ code (UK)   │
│ ...         │
└─────────────┘
       ▲
       │
       │ campus_id (FK)
       │
┌─────────────┐
│    users    │
│─────────────│
│ id (PK)     │
│ email (UK)  │
│ phone (UK)  │
│ role        │
│ campus_id   │◄────┐
│ ...         │     │
└─────────────┘     │
       ▲            │
       │            │
       │ user_id    │ admin_id
       │ (FK)       │ (FK)
       │            │
┌─────────────┐     │
│ audit_logs  │     │
│─────────────│     │
│ id (PK)     │     │
│ user_id     │─────┘
│ admin_id    │─────┘
│ action_type │
│ ...         │
└─────────────┘
```

## Troubleshooting

### Migration Fails
- Check database connection in `.env` file
- Verify database user has CREATE/ALTER/DROP permissions
- Check migration logs for specific error messages
- Ensure previous migrations completed successfully

### Cannot Rollback
- Some migrations may fail to rollback if data exists
- Consider manual cleanup or data migration before rollback
- Check foreign key constraints

### Duplicate Key Errors
- Migrations may fail if tables already exist
- Check `SequelizeMeta` table to see which migrations have run
- Manually mark migrations as complete if needed:
  ```sql
  INSERT INTO "SequelizeMeta" (name) VALUES ('migration-name.js');
  ```

## Environment-Specific Considerations

### Development
- Migrations can be freely applied and rolled back
- Use `npm run migrate:down` to test rollback functionality

### Staging
- Test all migrations before production deployment
- Verify data integrity after migration

### Production
- **Always backup database first**
- Run migrations during low-traffic periods
- Monitor application logs during and after migration
- Have rollback plan ready
- Test rollback procedure in staging first

## Related Documentation

- [Seeders README](../seeders/README.md) - Database seeding documentation
- [Database Configuration](../../config/database.js) - Database connection setup
- [Migration Script](../scripts/migrate.js) - Migration execution script

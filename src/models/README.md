# Database Models

This directory contains the Sequelize models for the Authentication & User Management module.

## Models

### 1. Campus Model (`Campus.js`)

Represents the four physical campus locations of MSSU.

**Fields:**
- `id` (UUID) - Primary key
- `name` (String) - Campus name (e.g., "Navi Mumbai")
- `code` (String) - Unique campus code (e.g., "NM")
- `address` (Text) - Campus address
- `contact_email` (String) - Campus contact email
- `contact_phone` (String) - Campus contact phone
- `is_active` (Boolean) - Whether campus is active
- `created_at`, `updated_at` (Timestamps)

**Indexes:**
- Unique index on `code`

**Associations:**
- Has many Users

### 2. User Model (`User.js`)

Represents all users in the system (Students, Teachers, Parents, Admins, Super_Admins).

**Fields:**
- `id` (UUID) - Primary key
- `email` (String) - Unique email address
- `phone` (Text) - Encrypted phone number
- `password_hash` (String) - Bcrypt hashed password
- `name` (String) - User's full name
- `role` (Enum) - User role: Student, Teacher, Parent, Admin, Super_Admin
- `campus_id` (UUID) - Foreign key to Campus
- `profile_picture_url` (Text) - URL to profile picture
- `address` (Text) - Encrypted address
- `account_status` (Enum) - active, inactive, locked
- `failed_login_attempts` (Integer) - Count of failed login attempts
- `locked_until` (Date) - Account lock expiry timestamp
- `token_version` (Integer) - For invalidating all tokens
- `last_login_at` (Date) - Last successful login timestamp
- `deleted_at` (Date) - Soft delete timestamp
- `created_at`, `updated_at` (Timestamps)

**Indexes:**
- Unique index on `email`
- Composite index on `(campus_id, role)`
- Composite index on `(account_status, campus_id)`
- Index on `deleted_at`

**Associations:**
- Belongs to Campus

**Hooks:**
- `beforeCreate` - Automatically hashes password using bcrypt (10 salt rounds)
- `beforeUpdate` - Hashes password if changed

**Instance Methods:**
- `verifyPassword(password)` - Verify password against hash
- `isLocked()` - Check if account is currently locked
- `toSafeObject()` - Return user object without password_hash

**Field-Level Encryption:**
- `phone` field is encrypted/decrypted using AES-256-CBC
- `address` field is encrypted/decrypted using AES-256-CBC

### 3. AuditLog Model (`AuditLog.js`)

Immutable audit trail for security and compliance.

**Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to User (subject of action)
- `admin_id` (UUID) - Foreign key to User (performer of action)
- `action_type` (String) - Type of action (e.g., 'login', 'user_created')
- `resource_type` (String) - Type of resource affected
- `resource_id` (UUID) - ID of affected resource
- `ip_address` (String) - IP address of request
- `user_agent` (Text) - User agent string
- `details` (JSONB) - Additional context data
- `created_at` (Date) - Timestamp (no updated_at)

**Indexes:**
- Composite index on `(user_id, created_at)`
- Composite index on `(action_type, created_at)`
- Composite index on `(admin_id, created_at)`

**Associations:**
- Belongs to User (as 'user')
- Belongs to User (as 'admin')

**Immutability:**
- `update()` and `destroy()` methods throw errors
- `beforeUpdate` and `beforeDestroy` hooks prevent modifications
- No `updated_at` timestamp field

## Migrations

Migration files are located in `src/migrations/`:

1. `20240101000001-create-campuses.js` - Creates campuses table
2. `20240101000002-create-users.js` - Creates users table with foreign key to campuses
3. `20240101000003-create-audit-logs.js` - Creates audit_logs table

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:down
```

## Seeders

Seeder files are located in `src/seeders/`:

1. `20240101000001-seed-campuses.js` - Seeds initial campus data:
   - Navi Mumbai (NM)
   - Thane (TH)
   - Nagpur (NG)
   - Pune (PN)

### Running Seeders

```bash
# Run all seeders
npm run seed

# Rollback last seeder
npm run seed:down
```

## Utilities

### Encryption Utility (`src/utils/encryption.js`)

Provides AES-256-CBC encryption for sensitive PII fields.

**Functions:**
- `encrypt(plainText)` - Encrypts plain text, returns format: `iv:encryptedData`
- `decrypt(cipherText)` - Decrypts cipher text back to plain text

**Usage:**
```javascript
import { encrypt, decrypt } from '../utils/encryption.js';

const encrypted = encrypt('+919876543210');
const decrypted = decrypt(encrypted);
```

## Testing

### Verify Models Structure

```bash
npm run verify:models
```

This command verifies:
- All models are loaded correctly
- Table names are correct
- All fields are defined
- Associations are set up
- Hooks are configured
- Encryption works correctly
- Immutability is enforced

### Test with Database Connection

```bash
npm run test:models
```

This requires a configured database connection in `.env` file.

## Configuration

Models use configuration from `src/config/env.js`:

- **Database**: PostgreSQL connection settings
- **Encryption**: AES-256 key and algorithm
- **Security**: Bcrypt salt rounds (default: 10)

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 1.1, 1.2**: User model with email, password, role, campus
- **Requirement 2.1**: Campus-based user segmentation
- **Requirement 7.1**: Multi-campus data model
- **Requirement 13.1-13.4**: Audit logging for security events
- **Requirement 14.2**: Password hashing with bcrypt
- **Requirement 14.3**: PII encryption with AES-256

## Notes

- All models use UUID primary keys for better security and scalability
- Timestamps are automatically managed by Sequelize
- The User model implements soft delete via `deleted_at` field
- Phone numbers must be stored in encrypted format
- Passwords are automatically hashed before storage
- Audit logs are completely immutable once created

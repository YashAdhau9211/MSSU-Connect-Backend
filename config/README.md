# Configuration Directory

This directory contains all configuration files for the MSSU-Connect backend application. Each file is organized by service or functionality and supports multiple environments (development, staging, production).

## Files Overview

### `database.js`
Sequelize configuration for PostgreSQL database connections across different environments.

**Features:**
- Environment-specific configurations (development, staging, production)
- Support for both `DATABASE_URL` and individual connection parameters
- Connection pooling settings
- SSL/TLS configuration for cloud databases
- Automatic environment detection

**Usage:**
```javascript
import databaseConfig from './config/database.js';
// or
import { config } from './config/database.js';
const prodConfig = config.production;
```

### `redis.js`
Redis connection configuration with retry strategies and key management utilities.

**Features:**
- Environment-specific Redis configurations
- Automatic reconnection with exponential backoff
- TLS support for production environments
- Predefined key prefixes for data organization
- TTL (Time To Live) constants
- Helper functions for building Redis keys

**Usage:**
```javascript
import redisConfig, { REDIS_KEY_PREFIXES, buildRedisKey } from './config/redis.js';

// Build a Redis key
const otpKey = buildRedisKey(REDIS_KEY_PREFIXES.OTP, phoneNumber);
```

### `jwt.js`
JWT (JSON Web Token) configuration for authentication and authorization.

**Features:**
- Token signing and verification settings
- Configurable expiry times for access and refresh tokens
- Support for multiple signing algorithms (HS256, RS256)
- Token payload structure definitions
- Helper functions for token generation and validation
- Configuration validation

**Usage:**
```javascript
import jwtConfig, { buildTokenPayload, getSignOptions } from './config/jwt.js';

// Build token payload
const payload = buildTokenPayload(user, TOKEN_TYPES.ACCESS);

// Get sign options
const options = getSignOptions(TOKEN_TYPES.ACCESS);
```

### `aws.js`
AWS services configuration for S3 (storage) and SES (email).

**Features:**
- S3 configuration for file uploads (profile pictures)
- SES configuration for transactional emails
- Environment-specific settings
- File upload validation settings
- Helper functions for S3 key generation and URL building
- Configuration validation

**Usage:**
```javascript
import awsConfig, { buildS3Key, getS3Url } from './config/aws.js';

// Build S3 key for profile picture
const key = buildS3Key('profiles', userId, 'avatar.jpg');

// Get public URL
const url = getS3Url(key);
```

### `index.js`
Central export point that aggregates all configuration modules.

**Features:**
- Single import point for all configurations
- Configuration validation function
- Configuration summary printer
- Aggregated configuration object

**Usage:**
```javascript
import config, { validateAllConfigs, printConfigSummary } from './config/index.js';

// Validate all configurations on startup
validateAllConfigs();

// Print configuration summary
printConfigSummary();

// Access specific configurations
console.log(config.jwt.secret);
console.log(config.database.host);
```

## Environment Variables

All configuration files read from environment variables defined in the `.env` file. See `.env.example` for a complete list of required variables.

### Critical Environment Variables

**Production Requirements:**
- `JWT_SECRET` - Must be a strong random string (min 32 characters)
- `ENCRYPTION_KEY` - Must be exactly 32 characters for AES-256
- `DATABASE_URL` or individual DB credentials
- `REDIS_PASSWORD` - Redis authentication
- AWS credentials for S3 and SES

### Generating Secure Keys

```bash
# Generate JWT secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Environment-Specific Configuration

The application supports three environments:
- **development** - Local development with relaxed security
- **staging** - Pre-production testing environment
- **production** - Production environment with strict security

Set the environment using the `NODE_ENV` environment variable:
```bash
NODE_ENV=production node server.js
```

## Configuration Validation

All configuration files include validation functions that run on application startup:

```javascript
import { validateAllConfigs } from './config/index.js';

// Validate all configurations
if (!validateAllConfigs()) {
  console.error('Configuration validation failed');
  process.exit(1);
}
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Rotate secrets regularly** - JWT secrets and encryption keys should be rotated every 90 days
3. **Use strong random keys** - Generate keys using cryptographically secure methods
4. **Enable TLS in production** - Always use TLS for Redis and database connections
5. **Restrict CORS origins** - Only allow trusted frontend domains
6. **Use environment-specific buckets** - Separate S3 buckets for dev/staging/prod
7. **Verify SES email addresses** - Ensure sender emails are verified in AWS SES

## Troubleshooting

### Configuration Validation Errors

If you see configuration validation errors on startup:
1. Check that all required environment variables are set
2. Verify that secrets meet minimum length requirements
3. Ensure database and Redis credentials are correct
4. Validate AWS credentials have proper permissions

### Database Connection Issues

- Verify `DATABASE_URL` format or individual DB parameters
- Check SSL/TLS settings for cloud databases
- Ensure connection pool settings are appropriate for your load

### Redis Connection Issues

- Verify Redis host and port
- Check if Redis password is required
- Ensure Redis is running and accessible
- Review retry strategy settings

### AWS Service Issues

- Verify AWS credentials are correct
- Check IAM permissions for S3 and SES
- Ensure S3 bucket exists and is accessible
- Verify SES sender email is verified

## Additional Resources

- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [Redis Documentation](https://redis.io/documentation)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)

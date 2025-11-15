# Middleware Documentation

This directory contains all middleware implementations for the Authentication & User Management module.

## Overview

The middleware layer provides cross-cutting concerns including:
- Authentication and authorization
- Request validation
- Rate limiting
- Error handling

## Middleware Components

### 1. Authentication Middleware (`auth.js`)

Handles JWT token verification and user authentication.

#### `authenticate()`

Verifies JWT token from Authorization header and attaches user to request.

**Usage:**
```javascript
import { authenticate } from './middleware/auth.js';

router.get('/profile', authenticate(), (req, res) => {
  // req.user is now available
  res.json({ user: req.user });
});
```

**Features:**
- Extracts Bearer token from Authorization header
- Verifies token using tokenService
- Checks if token is blacklisted
- Validates user exists and account is active
- Checks for account lockout
- Attaches user object to `req.user`

**Error Responses:**
- `401 UNAUTHORIZED` - Missing or invalid token
- `401 TOKEN_EXPIRED` - Token has expired
- `401 TOKEN_INVALID` - Token is malformed
- `401 TOKEN_REVOKED` - Token has been blacklisted
- `401 USER_NOT_FOUND` - User no longer exists
- `403 ACCOUNT_LOCKED` - Account is locked
- `403 ACCOUNT_INACTIVE` - Account is inactive

#### `requireRole(...allowedRoles)`

Checks if authenticated user has one of the required roles.

**Usage:**
```javascript
import { authenticate, requireRole } from './middleware/auth.js';

// Only Admin and Super_Admin can access
router.post('/users', 
  authenticate(), 
  requireRole('Admin', 'Super_Admin'),
  createUser
);
```

**Error Responses:**
- `401 UNAUTHORIZED` - User not authenticated
- `403 FORBIDDEN` - User role not authorized

#### `requireCampusAccess()`

Validates user can access the requested campus.

**Usage:**
```javascript
import { authenticate, requireCampusAccess } from './middleware/auth.js';

// Validates campus_id from params/body/query
router.get('/campuses/:campus_id/users',
  authenticate(),
  requireCampusAccess(),
  listCampusUsers
);
```

**Features:**
- Extracts campus_id from params, body, or query
- Super_Admin can access all campuses
- Other roles can only access their assigned campus
- If no campus_id specified, allows request to proceed

**Error Responses:**
- `401 UNAUTHORIZED` - User not authenticated
- `403 FORBIDDEN` - Access denied to campus

---

### 2. Validation Middleware (`validation.js`)

Provides request validation using express-validator.

#### Available Validators

| Validator | Purpose | Usage |
|-----------|---------|-------|
| `validateRegistration` | User registration | POST /auth/register |
| `validateLogin` | Email/password login | POST /auth/login |
| `validateOTPRequest` | OTP request | POST /auth/otp/request |
| `validateOTPVerification` | OTP verification | POST /auth/otp/verify |
| `validateTokenRefresh` | Token refresh | POST /auth/refresh |
| `validatePasswordResetRequest` | Password reset request | POST /auth/password/forgot |
| `validatePasswordReset` | Password reset completion | POST /auth/password/reset |
| `validatePasswordChange` | Password change | PUT /profile/password |
| `validateProfileUpdate` | Profile update | PUT /profile |
| `validateUserUpdate` | User update (admin) | PUT /users/:id |
| `validateStatusChange` | Account status change | PATCH /users/:id/status |
| `validateUserDeletion` | User deletion | DELETE /users/:id |
| `validateUserListQuery` | User list query params | GET /users |
| `validateAuditLogQuery` | Audit log query params | GET /audit-logs |
| `validateUUIDParam(name)` | UUID parameter | Any route with UUID param |
| `validateMFARequest` | MFA code request | POST /mfa/request |
| `validateMFAVerification` | MFA code verification | POST /mfa/verify |

**Usage:**
```javascript
import { validateLogin } from './middleware/validation.js';

router.post('/auth/login', validateLogin, loginController);
```

**Validation Rules:**

**Email:**
- Required
- Valid email format
- Normalized (lowercase)

**Password:**
- Required
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Phone:**
- Required
- Indian format: +91XXXXXXXXXX
- Must start with 6-9 after country code

**OTP/MFA Code:**
- Required
- Exactly 6 digits
- Numeric only

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

---

### 3. Rate Limiting Middleware (`rateLimit.js`)

Implements Redis-backed rate limiting to prevent abuse.

#### Available Rate Limiters

| Rate Limiter | Limit | Window | Usage |
|--------------|-------|--------|-------|
| `authRateLimiter` | 10 req | 1 minute | Authentication endpoints |
| `otpRateLimiter` | 3 req | 1 hour | OTP request endpoints |
| `passwordResetRateLimiter` | 3 req | 1 hour | Password reset endpoints |
| `generalRateLimiter` | 100 req | 1 minute | General API endpoints |
| `sensitiveOperationRateLimiter` | 5 req | 1 hour | Sensitive operations |
| `uploadRateLimiter` | 10 req | 1 hour | File upload endpoints |

**Usage:**
```javascript
import { authRateLimiter, otpRateLimiter } from './middleware/rateLimit.js';

// Apply to authentication routes
router.post('/auth/login', authRateLimiter, loginController);

// Apply to OTP routes
router.post('/auth/otp/request', otpRateLimiter, requestOTPController);
```

**Custom Rate Limiter:**
```javascript
import { customRateLimiter } from './middleware/rateLimit.js';

// 5 requests per 10 minutes
const customLimit = customRateLimiter(10 * 60 * 1000, 5, 'rl:custom:');
router.post('/custom-endpoint', customLimit, controller);
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

**Headers:**
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - Time when limit resets

---

### 4. Error Handling Middleware (`errorHandler.js`)

Global error handler that catches all unhandled errors.

#### `errorHandler(error, req, res, next)`

Catches and formats all errors with standardized response.

**Usage:**
```javascript
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import express from 'express';

const app = express();

// ... routes ...

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);
```

**Features:**
- Maps error codes to HTTP status codes
- Sanitizes error messages in production
- Logs errors with context
- Handles Sequelize errors
- Provides validation error details
- Includes stack trace in development

**Error Code Mapping:**

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| INVALID_CREDENTIALS | 401 | Authentication failed |
| TOKEN_EXPIRED | 401 | JWT token expired |
| TOKEN_INVALID | 401 | JWT token invalid |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| ACCOUNT_LOCKED | 403 | Account locked |
| USER_NOT_FOUND | 404 | User not found |
| EMAIL_EXISTS | 409 | Email already registered |
| PHONE_EXISTS | 409 | Phone already registered |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

#### `asyncHandler(fn)`

Wraps async route handlers to catch errors.

**Usage:**
```javascript
import { asyncHandler } from './middleware/errorHandler.js';

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json({ users });
}));
```

#### `createError(message, code, statusCode)`

Creates custom error with code.

**Usage:**
```javascript
import { createError } from './middleware/errorHandler.js';

if (!user) {
  throw createError('User not found', 'USER_NOT_FOUND', 404);
}
```

---

## Complete Example

Here's a complete example showing how to use all middleware together:

```javascript
import express from 'express';
import { 
  authenticate, 
  requireRole, 
  requireCampusAccess 
} from './middleware/auth.js';
import { 
  validateRegistration,
  validateUserListQuery 
} from './middleware/validation.js';
import { 
  authRateLimiter,
  generalRateLimiter 
} from './middleware/rateLimit.js';
import { 
  errorHandler, 
  notFoundHandler,
  asyncHandler 
} from './middleware/errorHandler.js';

const router = express.Router();

// Public route with rate limiting and validation
router.post('/auth/register',
  authRateLimiter,
  validateRegistration,
  asyncHandler(registerController)
);

// Protected route with authentication
router.get('/profile',
  generalRateLimiter,
  authenticate(),
  asyncHandler(getProfileController)
);

// Admin-only route with role check
router.get('/users',
  generalRateLimiter,
  authenticate(),
  requireRole('Admin', 'Super_Admin'),
  validateUserListQuery,
  asyncHandler(listUsersController)
);

// Campus-specific route with campus access check
router.get('/campuses/:campus_id/users',
  generalRateLimiter,
  authenticate(),
  requireCampusAccess(),
  asyncHandler(listCampusUsersController)
);

// 404 handler
router.use(notFoundHandler);

// Global error handler
router.use(errorHandler);

export default router;
```

## Best Practices

1. **Order Matters**: Apply middleware in this order:
   - Rate limiting (first)
   - Validation
   - Authentication
   - Authorization (role/campus checks)
   - Route handler
   - Error handler (last)

2. **Use asyncHandler**: Wrap all async route handlers with `asyncHandler` to catch errors.

3. **Specific Rate Limits**: Use appropriate rate limiters for different endpoint types.

4. **Validation First**: Validate requests before authentication to save resources.

5. **Error Codes**: Use consistent error codes from the error handler mapping.

6. **Campus Filtering**: Let service layer handle campus filtering when no specific campus_id is provided.

7. **Testing**: Test middleware with various scenarios including edge cases.

## Environment Variables

Rate limiting requires Redis connection configured in `src/config/redis.js`.

## Dependencies

- `express-validator` - Request validation
- `express-rate-limit` - Rate limiting
- `rate-limit-redis` - Redis store for rate limiting
- `jsonwebtoken` - JWT verification
- `redis` - Redis client

## Testing

Run middleware tests:
```bash
node src/scripts/test-middleware.js
```

## Troubleshooting

**Rate Limiting Not Working:**
- Ensure Redis is running and connected
- Check Redis connection in `src/config/redis.js`
- Verify rate limiter is applied before route handler

**Authentication Failing:**
- Check JWT secret in environment variables
- Verify token format: `Bearer <token>`
- Ensure user exists and account is active

**Validation Not Working:**
- Ensure validation middleware is applied before route handler
- Check validation rules match your requirements
- Verify `handleValidationErrors` is included in validation chain

**Errors Not Formatted:**
- Ensure error handler is last middleware
- Use `asyncHandler` for async route handlers
- Throw errors with proper error codes

# API Routes Documentation

This directory contains all API route definitions for the MSSU-Connect Authentication & User Management module.

## Overview

All routes are mounted under the `/api/v1` prefix and follow RESTful conventions. The routes are organized into separate modules based on functionality.

## Route Modules

### 1. Authentication Routes (`auth.js`)
**Base Path:** `/api/v1/auth`

| Method | Endpoint | Description | Access | Rate Limit |
|--------|----------|-------------|--------|------------|
| POST | `/register` | Register a new user | Admin/Super_Admin | 10/min |
| POST | `/login` | Login with email/password | Public | 10/min |
| POST | `/otp/request` | Request OTP for mobile login | Public | 3/hour |
| POST | `/otp/verify` | Verify OTP and login | Public | 10/min |
| POST | `/refresh` | Refresh access token | Public | 10/min |
| POST | `/logout` | Logout current session | Private | 10/min |
| POST | `/logout-all` | Logout from all devices | Private | 10/min |
| POST | `/password/forgot` | Request password reset | Public | 3/hour |
| POST | `/password/reset` | Reset password with token | Public | 10/min |

**Middleware Applied:**
- Rate limiting (auth: 10/min, OTP: 3/hour, password reset: 3/hour)
- Request validation (express-validator)
- Authentication (for protected routes)
- Role-based authorization (register requires Admin/Super_Admin)

### 2. User Management Routes (`users.js`)
**Base Path:** `/api/v1/users`

| Method | Endpoint | Description | Access | Rate Limit |
|--------|----------|-------------|--------|------------|
| GET | `/` | List users with filters | Admin/Super_Admin | 100/min |
| GET | `/:id` | Get user by ID | Admin/Super_Admin | 100/min |
| PUT | `/:id` | Update user | Admin/Super_Admin | 100/min |
| DELETE | `/:id` | Delete user (requires MFA) | Admin/Super_Admin | 5/hour |
| PATCH | `/:id/status` | Update account status | Admin/Super_Admin | 5/hour |

**Middleware Applied:**
- Rate limiting (general: 100/min, sensitive ops: 5/hour)
- Authentication (all routes)
- Role-based authorization (Admin/Super_Admin only)
- Campus access control
- Request validation

### 3. Profile Management Routes (`profile.js`)
**Base Path:** `/api/v1/profile`

| Method | Endpoint | Description | Access | Rate Limit |
|--------|----------|-------------|--------|------------|
| GET | `/` | Get current user's profile | Private | 100/min |
| PUT | `/` | Update current user's profile | Private | 100/min |
| POST | `/picture` | Upload profile picture | Private | 10/hour |
| PUT | `/password` | Change password | Private | 100/min |

**Middleware Applied:**
- Rate limiting (general: 100/min, uploads: 10/hour)
- Authentication (all routes)
- Request validation
- Multer file upload (for profile pictures)
  - Max file size: 5MB
  - Allowed formats: JPEG, PNG
  - Storage: Memory (buffer)

### 4. Session Management Routes (`sessions.js`)
**Base Path:** `/api/v1/sessions`

| Method | Endpoint | Description | Access | Rate Limit |
|--------|----------|-------------|--------|------------|
| GET | `/` | Get all active sessions | Private | 100/min |
| DELETE | `/:id` | Revoke a specific session | Private | 100/min |

**Middleware Applied:**
- Rate limiting (100/min)
- Authentication (all routes)

### 5. Audit Log Routes (`audit.js`)
**Base Path:** `/api/v1/audit-logs`

| Method | Endpoint | Description | Access | Rate Limit |
|--------|----------|-------------|--------|------------|
| GET | `/` | Get audit logs with filters | Super_Admin | 100/min |

**Middleware Applied:**
- Rate limiting (100/min)
- Authentication
- Role-based authorization (Super_Admin only)
- Request validation

## Main Router (`index.js`)

The main router module exports:

### Functions

#### `applyGlobalMiddleware(app)`
Applies global middleware to the Express app:
- **Security:** Helmet (CSP, HSTS, X-Powered-By removal)
- **CORS:** Configurable origin whitelist with credentials support
- **Body Parsing:** JSON and URL-encoded (10MB limit)
- **Compression:** Gzip response compression
- **Logging:** Morgan (dev/combined based on environment)
- **Request ID:** Unique ID and timestamp for each request

#### `applyErrorHandling(app)`
Applies error handling middleware:
- **404 Handler:** Catches undefined routes
- **Global Error Handler:** Catches all unhandled errors with standardized response

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check endpoint |
| GET | `/api/v1` | API information endpoint |

## Global Middleware

### Security Headers (Helmet)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Powered-By header removal
- Other security headers

### CORS Configuration
- **Allowed Origins:** Configurable via `CORS_ORIGIN` env variable
- **Credentials:** Enabled for cookie-based auth
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers:** Content-Type, Authorization, X-Requested-With
- **Exposed Headers:** RateLimit-* headers
- **Max Age:** 24 hours

### Rate Limiting
All rate limiters use Redis for distributed rate limiting:

| Limiter | Window | Max Requests | Applied To |
|---------|--------|--------------|------------|
| Auth | 1 minute | 10 | Login, register, logout |
| OTP | 1 hour | 3 | OTP request |
| Password Reset | 1 hour | 3 | Password reset request |
| General | 1 minute | 100 | Most API endpoints |
| Sensitive Ops | 1 hour | 5 | User deletion, status changes |
| Upload | 1 hour | 10 | File uploads |

### Request Validation
All routes use express-validator for input validation:
- Email format validation
- Phone number format (Indian: +91XXXXXXXXXX)
- Password strength requirements
- UUID format validation
- Query parameter validation
- Request body validation

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional, for validation errors
  }
}
```

### HTTP Status Codes
- **200:** Success
- **201:** Created
- **400:** Bad Request (validation errors)
- **401:** Unauthorized (authentication required)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found
- **409:** Conflict (duplicate entry)
- **429:** Too Many Requests (rate limit exceeded)
- **500:** Internal Server Error

## Environment Variables

### CORS Configuration
```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true
```

### Rate Limiting
```bash
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=10
OTP_RATE_LIMIT_MAX=3
```

## Usage Example

### Starting the Server
```javascript
import express from 'express';
import apiRoutes, { applyGlobalMiddleware, applyErrorHandling } from './src/routes/index.js';

const app = express();

// Apply global middleware
applyGlobalMiddleware(app);

// Mount API routes
app.use('/api/v1', apiRoutes);

// Apply error handling
applyErrorHandling(app);

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Making Requests

#### Public Endpoint (Login)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Protected Endpoint (Get Profile)
```bash
curl -X GET http://localhost:3000/api/v1/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Admin Endpoint (List Users)
```bash
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## Testing

Run the route configuration test:
```bash
node src/scripts/test-routes.js
```

This will verify:
- All route modules are loaded correctly
- Middleware is properly applied
- Expected endpoints are configured
- No syntax errors in route definitions

## Next Steps

1. **Start the server:** `npm start`
2. **Test endpoints:** Use Postman, curl, or any HTTP client
3. **Check health:** `GET http://localhost:3000/api/v1/health`
4. **View API info:** `GET http://localhost:3000/api/v1`
5. **Implement Swagger documentation** (Task 20.1)

## Notes

- All routes follow RESTful conventions
- Authentication is required for most endpoints
- Rate limiting is enforced on all routes
- CORS is configured for cross-origin requests
- All errors are handled consistently
- Request validation is applied to all input
- Campus-based data segmentation is enforced where applicable
- MFA is required for sensitive operations (user deletion, role changes)

## Related Files

- `src/middleware/auth.js` - Authentication and authorization middleware
- `src/middleware/validation.js` - Request validation schemas
- `src/middleware/rateLimit.js` - Rate limiting configuration
- `src/middleware/errorHandler.js` - Error handling middleware
- `src/controllers/` - Controller implementations
- `server.js` - Main server entry point

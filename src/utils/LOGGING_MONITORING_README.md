# Logging and Monitoring Setup

This document describes the logging and monitoring infrastructure implemented for the MSSU-Connect Authentication & User Management module.

## Overview

The application uses a comprehensive logging and monitoring system with:
- **Winston** for structured application logging
- **Sentry** for error tracking and performance monitoring
- **Custom middleware** for request logging and performance tracking

## Components

### 1. Application Logger (Winston)

**Location:** `src/utils/logger.js`

**Features:**
- Structured JSON logging
- Multiple log levels (error, warn, info, debug)
- Environment-specific transports:
  - **Development:** Console with colors
  - **Staging:** Console + File (with rotation)
  - **Production:** Console + AWS CloudWatch

**Usage:**

```javascript
import logger from './utils/logger.js';

// Basic logging
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.error('Database connection failed', { error: err.message });

// Specialized logging functions
import { 
  logAuthEvent, 
  logSecurityEvent, 
  logError,
  logExternalService 
} from './utils/logger.js';

// Log authentication events
logAuthEvent('login', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// Log security events
logSecurityEvent('account_locked', {
  userId: user.id,
  reason: 'Multiple failed login attempts',
  ipAddress: req.ip
});

// Log errors with context
logError(error, {
  userId: req.user?.id,
  requestId: req.id,
  path: req.path
});

// Log external service calls
logExternalService('SMS', 'send_otp', {
  phone: '+919876543210',
  success: true,
  duration: '150ms'
});
```

### 2. Request Logging Middleware

**Location:** `src/middleware/requestLogger.js`

**Features:**
- Generates unique request ID for tracing
- Logs all HTTP requests with method, path, status, duration
- Logs request body for POST/PUT/PATCH (with sensitive field redaction)
- Adds X-Request-ID header to responses

**Sensitive fields automatically redacted:**
- password, oldPassword, newPassword
- token, accessToken, refreshToken
- otp, mfaCode, resetToken
- secret, apiKey

**Usage:**
```javascript
import { requestLoggingMiddleware } from './middleware/requestLogger.js';

// Applied globally in routes/index.js
app.use(requestLoggingMiddleware);
```

### 3. Error Monitoring (Sentry)

**Location:** `src/config/sentry.js`

**Features:**
- Automatic error capture and reporting
- Performance monitoring with transactions
- User context tracking
- Request context tracking
- Custom tags and metadata
- Error filtering (excludes validation errors, 404s)

**Configuration:**

Set the following environment variables:

```bash
# Required
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Optional
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=mssu-connect-auth@1.0.0
SERVER_NAME=auth-service-1
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of transactions
```

**Usage:**

```javascript
import { captureException, captureMessage } from './config/sentry.js';

// Manually capture an exception
try {
  // Some operation
} catch (error) {
  captureException(error, {
    user: req.user,
    request: req,
    tags: { operation: 'user_creation' },
    extra: { userData: sanitizedData }
  });
}

// Capture a message
captureMessage('Critical operation completed', 'info', {
  tags: { operation: 'password_reset' },
  extra: { userId: user.id }
});
```

### 4. Error Monitoring Middleware

**Location:** `src/middleware/errorMonitoring.js`

**Features:**
- Captures all errors and sends to Sentry
- Monitors slow requests (> 1 second)
- Monitors authentication failures
- Tracks critical operations

**Usage:**

```javascript
import { 
  errorMonitoring, 
  monitorCriticalOperation,
  performanceMonitoring 
} from './middleware/errorMonitoring.js';

// Applied globally in routes/index.js
app.use(performanceMonitoring);
app.use(errorMonitoring);

// Monitor specific critical operations
router.delete('/users/:id', 
  monitorCriticalOperation('user_deletion', 'warning'),
  userController.deleteUser
);
```

## Log Levels

### Development
- **Level:** debug
- **Output:** Console with colors
- **Format:** Human-readable

### Staging
- **Level:** info
- **Output:** Console + File (logs/combined.log, logs/error.log)
- **Format:** JSON
- **Rotation:** 5MB per file, max 5 files

### Production
- **Level:** warn
- **Output:** Console + AWS CloudWatch
- **Format:** JSON
- **Retention:** Configured in CloudWatch

## Log Format

All logs follow a structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "service": "mssu-connect-auth",
  "environment": "production",
  "message": "User logged in successfully",
  "userId": "uuid-here",
  "email": "user@example.com",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-uuid",
  "duration": 150
}
```

## AWS CloudWatch Setup

For production environments, configure CloudWatch:

1. **Create Log Group:**
   ```bash
   aws logs create-log-group --log-group-name mssu-connect-auth
   ```

2. **Set Environment Variables:**
   ```bash
   AWS_CLOUDWATCH_GROUP=mssu-connect-auth
   AWS_CLOUDWATCH_STREAM=auth-service
   AWS_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

3. **IAM Permissions Required:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "logs:DescribeLogStreams"
         ],
         "Resource": "arn:aws:logs:*:*:log-group:mssu-connect-auth:*"
       }
     ]
   }
   ```

## Sentry Setup

1. **Create Sentry Project:**
   - Go to https://sentry.io
   - Create a new project (Node.js)
   - Copy the DSN

2. **Configure Environment:**
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   SENTRY_ENVIRONMENT=production
   ```

3. **Set Up Alerts:**
   - Configure alert rules in Sentry dashboard
   - Set up email/Slack notifications
   - Define error thresholds

## Monitoring Best Practices

### 1. Log Appropriate Information
- **DO:** Log user actions, errors, security events
- **DON'T:** Log passwords, tokens, PII in plain text

### 2. Use Appropriate Log Levels
- **ERROR:** Application errors, exceptions
- **WARN:** Suspicious activities, rate limits
- **INFO:** User actions, system events
- **DEBUG:** Detailed debugging (dev only)

### 3. Include Context
Always include:
- Request ID for tracing
- User ID (if authenticated)
- IP address
- Timestamp
- Relevant metadata

### 4. Monitor Key Metrics
- Error rates
- Response times
- Authentication failures
- Rate limit violations
- Slow queries

### 5. Set Up Alerts
Configure alerts for:
- Error rate > 5%
- Response time p95 > 1s
- Multiple failed logins from same IP
- Critical errors (database, Redis failures)

## Troubleshooting

### Logs Not Appearing in CloudWatch

1. Check AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

2. Verify IAM permissions

3. Check log group exists:
   ```bash
   aws logs describe-log-groups --log-group-name-prefix mssu-connect
   ```

### Sentry Not Capturing Errors

1. Verify DSN is set:
   ```bash
   echo $SENTRY_DSN
   ```

2. Check Sentry initialization in server.js

3. Verify error is not filtered (check beforeSend hook)

### High Log Volume

1. Increase log level (info → warn → error)
2. Reduce sample rates in Sentry
3. Implement log sampling for high-traffic endpoints

## Performance Impact

- **Winston Logging:** < 1ms overhead per request
- **Sentry (with sampling):** < 5ms overhead per request
- **Request Logging:** < 1ms overhead per request

**Recommended Production Settings:**
- Log Level: warn
- Sentry Traces Sample Rate: 0.1 (10%)
- Sentry Profiles Sample Rate: 0.1 (10%)

## Testing

Test logging in development:

```bash
# Start server
npm run dev

# Make requests and check logs
curl http://localhost:3000/api/v1/health

# Check log files (staging)
tail -f logs/combined.log
tail -f logs/error.log
```

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)


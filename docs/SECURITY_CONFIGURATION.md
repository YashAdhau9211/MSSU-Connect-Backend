# Security Configuration Guide

This document provides detailed information about the security measures implemented in the MSSU-Connect Authentication & User Management API.

## Table of Contents

1. [Security Headers](#security-headers)
2. [Input Sanitization](#input-sanitization)
3. [CORS Configuration](#cors-configuration)
4. [Best Practices](#best-practices)
5. [Security Testing](#security-testing)

---

## Security Headers

The application uses [Helmet.js](https://helmetjs.github.io/) to set various HTTP security headers that protect against common web vulnerabilities.

### Implemented Headers

#### 1. Content Security Policy (CSP)
Prevents XSS attacks by controlling which resources can be loaded.

```javascript
Content-Security-Policy: 
  default-src 'self';
  base-uri 'self';
  font-src 'self' https: data:;
  form-action 'self';
  frame-ancestors 'none';
  img-src 'self' data: https:;
  object-src 'none';
  script-src 'self';
  script-src-attr 'none';
  style-src 'self' 'unsafe-inline';
  upgrade-insecure-requests;
```

**Protection:** Prevents loading of malicious scripts, iframes, and other resources from untrusted sources.

#### 2. HTTP Strict Transport Security (HSTS)
Forces browsers to use HTTPS connections only.

```javascript
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Configuration:**
- `maxAge`: 1 year (31536000 seconds)
- `includeSubDomains`: Applies to all subdomains
- `preload`: Eligible for browser HSTS preload list

**Protection:** Prevents man-in-the-middle attacks and protocol downgrade attacks.

#### 3. X-Frame-Options
Prevents clickjacking attacks by controlling iframe embedding.

```javascript
X-Frame-Options: DENY
```

**Protection:** Prevents the application from being embedded in iframes on other sites.

#### 4. X-Content-Type-Options
Prevents MIME type sniffing.

```javascript
X-Content-Type-Options: nosniff
```

**Protection:** Prevents browsers from interpreting files as a different MIME type than declared.

#### 5. X-DNS-Prefetch-Control
Controls DNS prefetching.

```javascript
X-DNS-Prefetch-Control: off
```

**Protection:** Prevents potential privacy leaks through DNS prefetching.

#### 6. X-Download-Options
Prevents file downloads from being executed in the site's context (IE-specific).

```javascript
X-Download-Options: noopen
```

**Protection:** Prevents downloaded files from being executed in the context of the site.

#### 7. X-Permitted-Cross-Domain-Policies
Controls cross-domain policy files (Flash, PDF).

```javascript
X-Permitted-Cross-Domain-Policies: none
```

**Protection:** Prevents cross-domain data access by plugins.

#### 8. Referrer-Policy
Controls how much referrer information is sent with requests.

```javascript
Referrer-Policy: strict-origin-when-cross-origin
```

**Protection:** Prevents leaking sensitive information in referrer headers.

#### 9. X-XSS-Protection
Enables browser's XSS filter (legacy, but still useful for older browsers).

```javascript
X-XSS-Protection: 1; mode=block
```

**Protection:** Enables browser's built-in XSS protection.

#### 10. X-Powered-By Removal
Removes the `X-Powered-By` header that reveals server technology.

**Protection:** Prevents information disclosure about the server technology stack.

---

## Input Sanitization

The application implements multiple layers of input sanitization to prevent injection attacks.

### 1. NoSQL Injection Protection

**Implementation:** `express-mongo-sanitize`

**What it does:**
- Removes MongoDB operators (`$`, `.`) from user input
- Replaces prohibited characters with underscore (`_`)
- Logs sanitization events for security monitoring

**Example:**
```javascript
// Malicious input
{ "email": { "$gt": "" } }

// Sanitized output
{ "email": { "_gt": "" } }
```

**Configuration:**
```javascript
mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`NoSQL injection attempt detected - Key: ${key}, IP: ${req.ip}`);
  },
})
```

### 2. XSS (Cross-Site Scripting) Protection

**Implementation:** Custom middleware

**What it does:**
- Removes dangerous HTML tags (`<script>`, `<iframe>`, `<embed>`, `<object>`)
- Removes JavaScript protocol handlers (`javascript:`)
- Removes event handlers (`onclick`, `onerror`, etc.)
- Recursively sanitizes nested objects and arrays

**Example:**
```javascript
// Malicious input
{ "name": "<script>alert('XSS')</script>John" }

// Sanitized output
{ "name": "John" }
```

**Protected against:**
- Script injection
- Event handler injection
- JavaScript protocol injection
- Iframe injection
- Embed/object injection

### 3. SQL Injection Protection

**Implementation:** Custom middleware + Sequelize ORM

**Primary Protection:** Parameterized queries through Sequelize ORM

**Additional Layer:** Pattern detection middleware that checks for:
- SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.)
- SQL comment syntax (`--`, `/*`, `*/`)
- SQL special characters (`;`, `'`, etc.)
- Stored procedure calls (`xp_`, `sp_`)

**Example:**
```javascript
// Malicious input
{ "email": "admin' OR '1'='1" }

// Response
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input detected. Please check your request and try again."
  }
}
```

### Sanitization Order

The sanitization middleware is applied in the following order:

1. **NoSQL Sanitization** - Removes MongoDB operators
2. **XSS Sanitization** - Removes dangerous HTML/JavaScript
3. **SQL Injection Detection** - Validates against SQL patterns

This order ensures that each layer can work effectively without interference.

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to allow only whitelisted origins to access the API.

### Configuration

```javascript
{
  origin: function(origin, callback) {
    // Whitelist check
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}
```

### Environment Variables

Configure CORS through environment variables:

```bash
# Comma-separated list of allowed origins
CORS_ORIGIN=https://app.mssu.ac.in,https://admin.mssu.ac.in

# Enable credentials (cookies, authorization headers)
CORS_CREDENTIALS=true
```

### Development vs Production

**Development:**
- Allows requests with no origin (Postman, mobile apps)
- Default origins: `http://localhost:3000`, `http://localhost:5173`

**Production:**
- Strict origin validation
- Only whitelisted origins allowed
- Logs blocked requests for security monitoring

### Security Features

1. **Origin Validation:** Only whitelisted origins can access the API
2. **Credentials Support:** Enables cookie-based authentication
3. **Method Restriction:** Only necessary HTTP methods allowed
4. **Header Whitelisting:** Only required headers permitted
5. **Preflight Caching:** Reduces preflight request overhead

---

## Best Practices

### 1. Environment Configuration

**Always set these in production:**

```bash
# Use strong, random secrets
JWT_SECRET=<64-character-random-string>
ENCRYPTION_KEY=<32-character-random-string>

# Restrict CORS origins
CORS_ORIGIN=https://app.mssu.ac.in,https://admin.mssu.ac.in

# Enable HTTPS
NODE_ENV=production

# Configure rate limiting
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=10
```

### 2. HTTPS/TLS

**Always use HTTPS in production:**
- Obtain SSL/TLS certificates (Let's Encrypt, AWS Certificate Manager)
- Configure your load balancer or reverse proxy for SSL termination
- Enable HSTS to force HTTPS connections

### 3. Secret Management

**Never commit secrets to version control:**
- Use environment variables
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly (every 90 days)

### 4. Input Validation

**Always validate input at multiple layers:**
- Client-side validation (user experience)
- API validation (express-validator)
- Sanitization middleware (security)
- Database constraints (data integrity)

### 5. Rate Limiting

**Implement rate limiting on all endpoints:**
- Authentication endpoints: 10 requests/minute
- OTP requests: 3 requests/hour
- General API: 100 requests/minute

### 6. Logging and Monitoring

**Log all security events:**
- Failed login attempts
- Account lockouts
- Rate limit violations
- CORS violations
- Input sanitization events
- SQL/NoSQL injection attempts

### 7. Regular Updates

**Keep dependencies updated:**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix
```

---

## Security Testing

### 1. Manual Testing

#### Test XSS Protection
```bash
# Test script injection
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(\"XSS\")</script>John"}'

# Expected: Script tags removed, only "John" stored
```

#### Test NoSQL Injection
```bash
# Test MongoDB operator injection
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": {"$gt": ""}, "password": {"$gt": ""}}'

# Expected: Operators replaced with underscores
```

#### Test SQL Injection
```bash
# Test SQL injection pattern
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin'\'' OR '\''1'\''='\''1", "password": "test"}'

# Expected: 400 Bad Request with "Invalid input detected" message
```

#### Test CORS
```bash
# Test from non-whitelisted origin
curl -X GET http://localhost:3000/api/v1/health \
  -H "Origin: https://malicious-site.com"

# Expected: CORS error
```

### 2. Automated Security Testing

#### Using OWASP ZAP
```bash
# Install OWASP ZAP
# Run automated scan
zap-cli quick-scan --self-contained http://localhost:3000
```

#### Using npm audit
```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 3. Security Headers Testing

Use [Security Headers](https://securityheaders.com/) or curl to verify headers:

```bash
curl -I http://localhost:3000/api/v1/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-DNS-Prefetch-Control: off
# X-Download-Options: noopen
# X-Permitted-Cross-Domain-Policies: none
# Referrer-Policy: strict-origin-when-cross-origin
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
```

### 4. Penetration Testing Checklist

- [ ] Test authentication bypass attempts
- [ ] Test authorization bypass attempts
- [ ] Test SQL injection in all input fields
- [ ] Test NoSQL injection in all input fields
- [ ] Test XSS in all input fields
- [ ] Test CSRF protection
- [ ] Test rate limiting enforcement
- [ ] Test account lockout mechanism
- [ ] Test password reset flow security
- [ ] Test session management security
- [ ] Test file upload security
- [ ] Test API endpoint enumeration
- [ ] Test information disclosure
- [ ] Test security headers
- [ ] Test CORS configuration
- [ ] Test HTTPS enforcement

---

## Security Incident Response

### If a security vulnerability is discovered:

1. **Assess the Impact**
   - Determine the severity (Critical, High, Medium, Low)
   - Identify affected systems and data

2. **Contain the Threat**
   - Disable affected endpoints if necessary
   - Block malicious IPs
   - Revoke compromised tokens

3. **Fix the Vulnerability**
   - Develop and test a fix
   - Deploy to production immediately for critical issues

4. **Notify Stakeholders**
   - Inform affected users within 72 hours (DPDPA compliance)
   - Document the incident in audit logs

5. **Post-Incident Review**
   - Analyze root cause
   - Update security measures
   - Improve monitoring and detection

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [DPDPA Compliance Guide](https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf)

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Maintained By:** MSSU Connect Security Team

# MSSU Connect - Authentication & User Management Backend

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

Comprehensive backend API for the MSSU Connect Authentication & User Management module, built with Node.js, Express, PostgreSQL, and Redis.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Security](#security)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- 🔐 **Multi-method Authentication**: Email/Password and Mobile/OTP login
- 🎫 **JWT-based Authentication**: Stateless authentication with access and refresh tokens
- 👥 **Role-Based Access Control (RBAC)**: 5-tier role system (Student, Teacher, Parent, Admin, Super_Admin)
- 🏢 **Multi-Campus Data Segmentation**: Automatic data isolation by campus
- 📝 **Comprehensive Audit Logging**: Track all security-relevant events
- 🔒 **Multi-Factor Authentication (MFA)**: Additional security for sensitive operations
- 🔑 **Password Management**: Secure reset and recovery workflows
- 📱 **Session Management**: Track and manage active sessions across devices
- 🛡️ **Security Hardening**: Rate limiting, account lockout, encryption at rest
- 📊 **Performance Optimized**: Redis caching, connection pooling, query optimization

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 5.x |
| Database | PostgreSQL | 14+ |
| ORM | Sequelize | 6.x |
| Cache | Redis | 7.x |
| Authentication | JWT | - |
| Password Hashing | bcrypt | - |
| Validation | express-validator | - |
| File Upload | multer | - |
| Image Processing | sharp | - |

## 📦 Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Redis** (v7 or higher) - [Download](https://redis.io/download)
- **npm** or **yarn** - Comes with Node.js

### Optional (for production)
- **AWS Account** - For S3 (profile pictures) and SES (emails)
- **Twilio/MSG91 Account** - For SMS OTP delivery

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mssu-connect-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration. See [Configuration](#configuration) section for details.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Server Configuration
```env
NODE_ENV=development
PORT=3000
API_VERSION=v1
```

#### Database Configuration (PostgreSQL)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mssu_connect
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_POOL_MIN=10
DB_POOL_MAX=100
```

#### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
JWT_ALGORITHM=HS256
```

#### Encryption Configuration
```env
ENCRYPTION_KEY=your-32-byte-encryption-key-here
ENCRYPTION_ALGORITHM=aes-256-cbc
```

#### Security Configuration
```env
BCRYPT_SALT_ROUNDS=10
ACCOUNT_LOCK_DURATION=1800000
MAX_FAILED_ATTEMPTS=5
PASSWORD_RESET_EXPIRY=3600000
OTP_EXPIRY=300000
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=10
OTP_RATE_LIMIT_MAX=3
```

#### External Services (Optional for development)
```env
# SMS Gateway (Twilio)
SMS_PROVIDER=twilio
SMS_API_KEY=your-twilio-api-key
SMS_API_SECRET=your-twilio-api-secret
SMS_FROM_NUMBER=+919876543210

# Email Service (AWS SES)
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@mssu.ac.in
EMAIL_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Cloud Storage (AWS S3)
S3_BUCKET=mssu-connect-uploads
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your-s3-access-key
S3_SECRET_ACCESS_KEY=your-s3-secret-key
```

#### CORS Configuration
```env
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
CORS_CREDENTIALS=true
```

> **⚠️ Security Warning**: Never commit the `.env` file to version control. Always use strong, unique values for `JWT_SECRET` and `ENCRYPTION_KEY` in production.

## 🗄️ Database Setup

### PostgreSQL Setup

#### 1. Create Database

```sql
CREATE DATABASE mssu_connect;
```

#### 2. Create User (Optional)

```sql
CREATE USER mssu_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mssu_connect TO mssu_user;
```

#### 3. Run Migrations

```bash
npm run migrate
```

This will create all necessary tables (users, campuses, audit_logs).

#### 4. Seed Initial Data

```bash
npm run seed
```

This will populate:
- 4 campuses (Navi Mumbai, Thane, Nagpur, Pune)
- 1 Super_Admin user (for initial access)

### Redis Setup

#### 1. Start Redis Server

```bash
# On Linux/Mac
redis-server

# On Windows (using WSL or Redis for Windows)
redis-server.exe
```

#### 2. Verify Redis Connection

```bash
redis-cli ping
# Expected output: PONG
```

#### 3. Test Redis Connection (Optional)

```bash
npm run test:redis
```

## 🏃 Running the Application

### Development Mode

Runs with hot-reload using nodemon:

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Testing Configuration

```bash
npm run test:config
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Verify Server is Running

```bash
curl http://localhost:3000/
```

Expected response:
```json
{
  "success": true,
  "message": "MSSU Connect - Authentication & User Management API",
  "version": "v1",
  "environment": "development",
  "documentation": "/api-docs"
}
```

## 📁 Project Structure

```
mssu-connect-backend/
├── docs/                      # Documentation files
│   └── swagger.js            # OpenAPI/Swagger specification
├── src/
│   ├── config/               # Configuration files
│   │   ├── env.js           # Environment variables loader
│   │   ├── database.js      # Sequelize configuration
│   │   ├── redis.js         # Redis client setup
│   │   ├── jwt.js           # JWT configuration
│   │   ├── aws.js           # AWS services config
│   │   └── index.js         # Config exports
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── profileController.js
│   │   ├── sessionController.js
│   │   └── auditController.js
│   ├── services/             # Business logic
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── passwordService.js
│   │   ├── tokenService.js
│   │   ├── otpService.js
│   │   ├── resetTokenService.js
│   │   ├── blacklistService.js
│   │   ├── sessionService.js
│   │   ├── rbacService.js
│   │   ├── auditService.js
│   │   ├── mfaService.js
│   │   ├── smsService.js
│   │   ├── emailService.js
│   │   └── storageService.js
│   ├── models/               # Database models
│   │   ├── User.js
│   │   ├── Campus.js
│   │   ├── AuditLog.js
│   │   └── index.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js          # Authentication & authorization
│   │   ├── validation.js    # Request validation
│   │   ├── rateLimit.js     # Rate limiting
│   │   └── errorHandler.js  # Error handling
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── profile.js
│   │   ├── sessions.js
│   │   ├── audit.js
│   │   └── index.js
│   ├── utils/                # Utility functions
│   │   └── encryption.js
│   ├── migrations/           # Database migrations
│   ├── seeders/              # Database seeders
│   └── scripts/              # Utility scripts
├── tests/                    # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   ├── security/            # Security tests
│   └── performance/         # Performance tests
├── app.js                    # Express app setup
├── server.js                 # Server entry point
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (not in git)
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

### Key Directories

- **`src/controllers/`**: Handle HTTP requests and responses
- **`src/services/`**: Contain business logic and orchestration
- **`src/models/`**: Define database schemas using Sequelize
- **`src/middleware/`**: Process requests before reaching controllers
- **`src/routes/`**: Define API endpoints and apply middleware
- **`tests/`**: Automated tests for all components

## 📚 API Documentation

### Interactive Documentation

Once the server is running, access the interactive Swagger UI documentation at:

```
http://localhost:3000/api-docs
```

This provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive API testing
- Authentication examples
- Error code reference

### Quick API Reference

#### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | Yes (Admin) |
| POST | `/api/v1/auth/login` | Login with email/password | No |
| POST | `/api/v1/auth/otp/request` | Request OTP | No |
| POST | `/api/v1/auth/otp/verify` | Verify OTP and login | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| POST | `/api/v1/auth/logout` | Logout current session | Yes |
| POST | `/api/v1/auth/logout-all` | Logout all sessions | Yes |
| POST | `/api/v1/auth/password/forgot` | Request password reset | No |
| POST | `/api/v1/auth/password/reset` | Reset password | No |

#### User Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users` | List users | Yes (Admin) |
| GET | `/api/v1/users/:id` | Get user by ID | Yes (Admin) |
| PUT | `/api/v1/users/:id` | Update user | Yes (Admin) |
| DELETE | `/api/v1/users/:id` | Delete user | Yes (Admin) |
| PATCH | `/api/v1/users/:id/status` | Update user status | Yes (Admin) |

#### Profile Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/profile` | Get own profile | Yes |
| PUT | `/api/v1/profile` | Update own profile | Yes |
| POST | `/api/v1/profile/picture` | Upload profile picture | Yes |
| PUT | `/api/v1/profile/password` | Change password | Yes |

#### Session Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/sessions` | Get active sessions | Yes |
| DELETE | `/api/v1/sessions/:id` | Revoke session | Yes |

#### Audit Log Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/audit-logs` | Get audit logs | Yes (Super_Admin) |

### Authentication

Most endpoints require authentication using a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     http://localhost:3000/api/v1/profile
```

### Rate Limiting

- **Authentication endpoints**: 10 requests/minute per IP
- **OTP requests**: 3 requests/hour per phone number
- **General API**: 100 requests/minute per user
- **Sensitive operations**: 5 requests/minute per user

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Security tests only
npm run test:security

# Performance tests
npm run test:performance
```

### Test Coverage

```bash
npm run test:coverage
```

Target coverage:
- **Unit tests**: 80%+
- **Integration tests**: 70%+

### Watch Mode (Development)

```bash
npm run test:watch
```

### Test External Services

```bash
# Test Redis connection
npm run test:redis

# Test external services (SMS, Email, S3)
npm run test:external
```

## 🔒 Security

### Security Features

- ✅ **HTTPS/TLS 1.2+** for all communications
- ✅ **Password Hashing** with bcrypt (salt rounds: 10)
- ✅ **JWT Authentication** with short-lived access tokens (1 hour)
- ✅ **Token Refresh** mechanism with 7-day refresh tokens
- ✅ **Token Blacklisting** on logout
- ✅ **Rate Limiting** on all endpoints
- ✅ **Account Lockout** after 5 failed login attempts
- ✅ **OTP Expiry** (5 minutes) and attempt limits (3 attempts)
- ✅ **Input Validation** and sanitization
- ✅ **SQL Injection Prevention** (parameterized queries)
- ✅ **XSS Prevention** (input sanitization)
- ✅ **CORS Configuration** with whitelisted origins
- ✅ **PII Encryption** at rest (AES-256)
- ✅ **Audit Logging** for all security events
- ✅ **MFA** for sensitive operations
- ✅ **Security Headers** (helmet middleware)

### Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong, unique secrets** for JWT_SECRET and ENCRYPTION_KEY
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Enable HTTPS** in production
5. **Keep dependencies updated** (`npm audit` regularly)
6. **Monitor audit logs** for suspicious activity
7. **Use environment-specific configurations**
8. **Implement proper backup strategies**

### Reporting Security Issues

If you discover a security vulnerability, please email security@mssu.ac.in instead of using the issue tracker.

## 🚢 Deployment

### Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in environment variables
- [ ] Use strong, unique values for all secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure production database with backups
- [ ] Set up Redis persistence (RDB + AOF)
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Review and test all security measures
- [ ] Configure rate limiting appropriately
- [ ] Set up health check endpoints
- [ ] Configure auto-scaling (if using cloud)

### Environment-Specific Configuration

#### Development
- Debug logging enabled
- Hot reload enabled
- Local database and Redis
- Relaxed rate limits

#### Staging
- Production-like environment
- Staging database and Redis
- Production rate limits
- Monitoring enabled

#### Production
- Production database (Multi-AZ)
- Redis cluster (3+ nodes)
- Strict rate limits
- Full monitoring and alerting
- Automated backups
- Auto-scaling enabled

### Docker Deployment (Optional)

```bash
# Build Docker image
docker build -t mssu-connect-backend .

# Run container
docker run -p 3000:3000 --env-file .env mssu-connect-backend
```

### Health Checks

The application provides health check endpoints for monitoring:

```bash
# Basic health check
curl http://localhost:3000/health

# Readiness check (includes database and Redis)
curl http://localhost:3000/ready
```

## 🐛 Troubleshooting

### Common Issues

#### Cannot connect to PostgreSQL

**Symptoms**: `ECONNREFUSED` or `Connection refused` errors

**Solutions**:
1. Verify PostgreSQL is running: `pg_isready`
2. Check database credentials in `.env`
3. Ensure database exists: `psql -l`
4. Check PostgreSQL is listening on correct port
5. Verify firewall rules allow connection

#### Cannot connect to Redis

**Symptoms**: `ECONNREFUSED` or Redis connection errors

**Solutions**:
1. Verify Redis is running: `redis-cli ping`
2. Check Redis connection details in `.env`
3. Ensure Redis is listening on correct port: `redis-cli -p 6379 ping`
4. Check Redis password if configured

#### Port already in use

**Symptoms**: `EADDRINUSE` error

**Solutions**:
1. Change `PORT` in `.env` file
2. Find and stop process using the port:
   ```bash
   # Linux/Mac
   lsof -i :3000
   kill -9 <PID>
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

#### JWT token errors

**Symptoms**: `TOKEN_INVALID` or `TOKEN_EXPIRED` errors

**Solutions**:
1. Ensure `JWT_SECRET` is set in `.env`
2. Check token expiry times are reasonable
3. Verify token is being sent in correct format: `Bearer <token>`
4. Check system clock is synchronized

#### Migration errors

**Symptoms**: Migration fails or tables not created

**Solutions**:
1. Ensure database exists and is accessible
2. Check database user has necessary permissions
3. Run migrations manually: `npm run migrate`
4. Check migration files for errors
5. Reset database if needed (development only):
   ```bash
   npm run migrate:down
   npm run migrate
   ```

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

### Getting Help

1. Check the [API Documentation](#api-documentation)
2. Review [Security](#security) guidelines
3. Search existing issues on GitHub
4. Contact the development team

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Coding standards
- Pull request process
- Testing requirements

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit with meaningful messages
6. Push to your fork
7. Create a Pull Request

### Coding Standards

- Use ES6+ features
- Follow async/await pattern (avoid callbacks)
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Write tests for new features
- Follow existing code structure
- Keep functions small and focused
- Handle errors appropriately

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**MSSU Connect Development Team**

- Project Lead: [Name]
- Backend Lead: [Name]
- Security Lead: [Name]

## 📞 Support

For support and questions:

- **Email**: support@mssu.ac.in
- **Documentation**: http://localhost:3000/api-docs
- **Issues**: GitHub Issues

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- Sequelize team for the robust ORM
- All open-source contributors

---

**Built with ❤️ by the MSSU Connect Team**

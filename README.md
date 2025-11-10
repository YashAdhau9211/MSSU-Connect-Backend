# MSSU Connect - Authentication & User Management Backend

This is the backend API for the MSSU Connect Authentication & User Management module, built with Node.js, Express, PostgreSQL, and Redis.

## Features

- 🔐 Multi-method authentication (Email/Password, Mobile/OTP)
- 🎫 JWT-based stateless authentication with refresh tokens
- 👥 Role-based access control (RBAC) with 5 user roles
- 🏢 Multi-campus data segmentation
- 📝 Comprehensive audit logging
- 🔒 Multi-factor authentication (MFA) for sensitive operations
- 🔑 Secure password reset and account recovery
- 📱 Session management with device tracking

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.x
- **Database:** PostgreSQL 14+
- **ORM:** Sequelize 6.x
- **Cache:** Redis 7.x
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** express-validator

## Prerequisites

Before running this project, ensure you have the following installed:

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Redis (v7 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mssu-connect-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
   - Database credentials (PostgreSQL)
   - Redis connection details
   - JWT secret key
   - Encryption key
   - SMS and Email service credentials (optional for development)

## Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE mssu_connect;
```

2. The application will automatically create tables on first run (development mode).

## Redis Setup

1. Start Redis server:
```bash
redis-server
```

2. Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

## Project Structure

```
mssu-connect-backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.js       # Environment configuration
│   │   ├── database.js  # PostgreSQL/Sequelize setup
│   │   ├── redis.js     # Redis client setup
│   │   └── index.js     # Config exports
│   ├── controllers/     # API endpoint controllers
│   ├── services/        # Business logic services
│   ├── models/          # Sequelize database models
│   ├── middleware/      # Express middleware
│   └── utils/           # Utility functions
├── server.js            # Application entry point
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables (not in git)
└── .env.example         # Environment variables template
```

## Environment Variables

See `.env.example` for a complete list of required environment variables.

### Critical Variables

- `NODE_ENV`: Environment (development/staging/production)
- `PORT`: Server port (default: 3000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `JWT_SECRET`: Secret key for JWT signing (MUST change in production)
- `ENCRYPTION_KEY`: 32-byte key for AES-256 encryption (MUST change in production)

## API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /` - API information

### Authentication (Coming Soon)
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/otp/request` - Request OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP and login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout current session
- `POST /api/v1/auth/logout-all` - Logout all sessions

## Security Features

- ✅ HTTPS/TLS 1.2+ for all communications
- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ JWT token-based authentication
- ✅ Token expiry and refresh mechanism
- ✅ Rate limiting on all endpoints
- ✅ Account lockout after failed attempts
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configuration
- ✅ PII encryption at rest

## Development

### Code Style
- Use ES6+ features
- Follow async/await pattern
- Use meaningful variable names
- Add comments for complex logic

### Testing
```bash
npm test
```

## Troubleshooting

### Cannot connect to PostgreSQL
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Cannot connect to Redis
- Verify Redis is running: `redis-cli ping`
- Check Redis connection details in `.env`

### Port already in use
- Change `PORT` in `.env` file
- Or stop the process using the port

## License

ISC

## Support

For issues and questions, please contact the MSSU Connect development team.

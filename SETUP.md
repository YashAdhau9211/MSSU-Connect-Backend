# Project Setup Guide

This guide provides detailed instructions for setting up the MSSU Connect Authentication & User Management backend.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **PostgreSQL** (v14 or higher)
   - Download from: https://www.postgresql.org/download/
   - Verify installation: `psql --version`

3. **Redis** (v7 or higher)
   - Windows: https://github.com/microsoftarchive/redis/releases
   - Linux/Mac: https://redis.io/download
   - Verify installation: `redis-cli --version`

4. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mssu-connect-backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- express (Web framework)
- sequelize (ORM for PostgreSQL)
- pg (PostgreSQL client)
- redis (Redis client)
- jsonwebtoken (JWT authentication)
- bcrypt (Password hashing)
- express-validator (Input validation)
- cors (CORS middleware)
- dotenv (Environment variables)

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` file with your configuration:

#### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mssu_connect
DB_USER=postgres
DB_PASSWORD=your_password_here
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
JWT_SECRET=your-very-long-random-secret-key-change-this
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
```

#### Encryption Configuration
```env
ENCRYPTION_KEY=your-32-byte-encryption-key-here
```

**Important:** Generate secure random keys for production:
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key (32 bytes for AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up PostgreSQL Database

1. Start PostgreSQL service:
   - Windows: Start from Services or pgAdmin
   - Linux: `sudo systemctl start postgresql`
   - Mac: `brew services start postgresql`

2. Create the database:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mssu_connect;

# Create user (optional)
CREATE USER mssu_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mssu_connect TO mssu_user;

# Exit
\q
```

3. Verify connection:
```bash
psql -U postgres -d mssu_connect -c "SELECT version();"
```

### 5. Set Up Redis

1. Start Redis server:
   - Windows: Run `redis-server.exe`
   - Linux: `sudo systemctl start redis`
   - Mac: `brew services start redis`

2. Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

3. Test Redis connection:
```bash
redis-cli
> SET test "Hello"
> GET test
> DEL test
> EXIT
```

### 6. Verify Configuration

Run the configuration test:
```bash
node -e "import('./src/config/env.js').then(m => console.log('✓ Configuration loaded successfully'))"
```

### 7. Start the Server

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server should start successfully and display:
```
✓ PostgreSQL connection established successfully
✓ Redis connection established successfully
✓ All database connections initialized successfully
🚀 Server running on port 3000
```

### 8. Test the API

Open your browser or use curl:

```bash
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/
```

Expected response:
```json
{
  "success": true,
  "message": "MSSU Connect - Authentication & User Management API",
  "version": "v1",
  "environment": "development"
}
```

## Project Structure

```
mssu-connect-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── env.js          # Environment variables
│   │   ├── database.js     # PostgreSQL/Sequelize setup
│   │   ├── redis.js        # Redis client setup
│   │   └── index.js        # Config exports
│   ├── controllers/         # API endpoint controllers (to be implemented)
│   ├── services/           # Business logic services (to be implemented)
│   ├── models/             # Sequelize database models (to be implemented)
│   ├── middleware/         # Express middleware (to be implemented)
│   └── utils/              # Utility functions (to be implemented)
├── config/                  # Legacy config (to be migrated)
├── server.js               # Application entry point
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
└── SETUP.md                # This file
```

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "ECONNREFUSED" or "Connection refused"**
- Ensure PostgreSQL is running
- Check if the port (5432) is correct
- Verify firewall settings

**Error: "password authentication failed"**
- Check DB_USER and DB_PASSWORD in .env
- Verify user has access to the database

**Error: "database does not exist"**
- Create the database: `CREATE DATABASE mssu_connect;`

### Redis Connection Issues

**Error: "ECONNREFUSED" on port 6379**
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env

**Error: "NOAUTH Authentication required"**
- Set REDIS_PASSWORD in .env if Redis has authentication enabled

### Port Already in Use

**Error: "EADDRINUSE: address already in use"**
- Change PORT in .env to a different value (e.g., 3001)
- Or stop the process using the port:
  - Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
  - Linux/Mac: `lsof -ti:3000 | xargs kill`

### Module Not Found Errors

**Error: "Cannot find module"**
- Delete node_modules and package-lock.json
- Run `npm install` again

### Environment Variable Issues

**Error: "JWT_SECRET must be set in production"**
- Ensure all required variables are set in .env
- Check for typos in variable names

## Next Steps

After successful setup:

1. ✅ Project structure created
2. ✅ Dependencies installed
3. ✅ Configuration files created
4. ✅ Database connections established
5. ⏳ Implement database models (Task 2)
6. ⏳ Implement services (Tasks 3-11)
7. ⏳ Implement controllers and routes (Tasks 12-14)
8. ⏳ Add middleware (Task 12)
9. ⏳ Implement external integrations (Task 15)
10. ⏳ Add testing (Task 19)

## Development Workflow

1. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Test your changes:
```bash
npm run dev
```

4. Commit your changes:
```bash
git add .
git commit -m "Description of changes"
```

5. Push to repository:
```bash
git push origin feature/your-feature-name
```

## Useful Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Check PostgreSQL connection
psql -U postgres -d mssu_connect

# Check Redis connection
redis-cli ping

# View logs (if using PM2)
pm2 logs

# Restart server (if using PM2)
pm2 restart mssu-connect-backend
```

## Support

For issues or questions:
1. Check this setup guide
2. Review the main README.md
3. Check the troubleshooting section
4. Contact the development team

## Security Notes

⚠️ **Important Security Reminders:**

1. Never commit `.env` file to git
2. Use strong, random keys for JWT_SECRET and ENCRYPTION_KEY in production
3. Change default database passwords
4. Enable Redis authentication in production
5. Use HTTPS in production
6. Keep dependencies updated: `npm audit fix`

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in .env
2. Use strong, unique secrets for all keys
3. Enable PostgreSQL SSL connections
4. Enable Redis authentication
5. Set up proper logging and monitoring
6. Configure firewall rules
7. Use a process manager (PM2, systemd)
8. Set up automated backups
9. Configure HTTPS/SSL certificates
10. Review and apply security best practices

---

**Setup Complete!** 🎉

You're now ready to start implementing the authentication and user management features.

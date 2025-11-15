# Contributing to MSSU Connect Backend

Thank you for your interest in contributing to the MSSU Connect Authentication & User Management Backend! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Security Guidelines](#security-guidelines)

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background or identity.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept responsibility for mistakes
- Prioritize the community's best interests

### Unacceptable Behavior

- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing others' private information
- Unprofessional conduct

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ installed
- PostgreSQL 14+ installed
- Redis 7+ installed
- Git installed
- A code editor (VS Code recommended)

### Setting Up Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mssu-connect-backend.git
   cd mssu-connect-backend
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/mssu-connect-backend.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Set up database**:
   ```bash
   npm run migrate
   npm run seed
   ```

7. **Run tests** to verify setup:
   ```bash
   npm test
   ```

## 🔄 Development Workflow

### Branch Strategy

We use a simplified Git Flow:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features
- **`bugfix/*`**: Bug fixes
- **`hotfix/*`**: Urgent production fixes

### Creating a Feature Branch

```bash
# Update your local develop branch
git checkout develop
git pull upstream develop

# Create a feature branch
git checkout -b feature/my-awesome-feature

# Make your changes and commit
git add .
git commit -m "feat: add awesome feature"

# Push to your fork
git push origin feature/my-awesome-feature
```

### Keeping Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on upstream/develop
git rebase upstream/develop

# Force push to your fork (if already pushed)
git push origin feature/my-awesome-feature --force-with-lease
```

## 💻 Coding Standards

### JavaScript/ES6+ Guidelines

#### 1. Use Modern JavaScript

```javascript
// ✅ Good - Use const/let
const userName = 'John';
let counter = 0;

// ❌ Bad - Avoid var
var userName = 'John';
```

#### 2. Use Async/Await

```javascript
// ✅ Good - Async/await
async function getUser(id) {
  try {
    const user = await User.findByPk(id);
    return user;
  } catch (error) {
    throw new Error('User not found');
  }
}

// ❌ Bad - Callbacks
function getUser(id, callback) {
  User.findByPk(id, (error, user) => {
    if (error) return callback(error);
    callback(null, user);
  });
}
```

#### 3. Use Arrow Functions Appropriately

```javascript
// ✅ Good - Arrow functions for callbacks
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2);

// ✅ Good - Regular functions for methods
class UserService {
  async createUser(data) {
    // ...
  }
}
```

#### 4. Use Destructuring

```javascript
// ✅ Good - Destructuring
const { email, name, role } = req.body;

// ❌ Bad - Individual assignment
const email = req.body.email;
const name = req.body.name;
const role = req.body.role;
```

#### 5. Use Template Literals

```javascript
// ✅ Good - Template literals
const message = `Welcome, ${userName}!`;

// ❌ Bad - String concatenation
const message = 'Welcome, ' + userName + '!';
```

### Naming Conventions

- **Variables & Functions**: camelCase (`getUserById`, `isActive`)
- **Classes**: PascalCase (`UserService`, `AuthController`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ATTEMPTS`, `TOKEN_EXPIRY`)
- **Files**: camelCase for JS files (`authService.js`, `userController.js`)
- **Database Tables**: snake_case (`users`, `audit_logs`)

### Code Organization

#### Service Layer

```javascript
/**
 * User Service
 * Handles all user-related business logic
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} createdBy - ID of admin creating the user
   * @returns {Promise<Object>} Created user object
   */
  async createUser(userData, createdBy) {
    // Validate input
    // Check uniqueness
    // Hash password
    // Create user
    // Create audit log
    // Return user
  }
}
```

#### Controller Layer

```javascript
/**
 * Register a new user
 * @route POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const userData = req.body;
    const createdBy = req.user.id;
    
    const user = await userService.createUser(userData, createdBy);
    
    res.status(201).json({
      success: true,
      data: { user },
      message: 'User created successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

### Error Handling

```javascript
// ✅ Good - Proper error handling
try {
  const user = await User.findByPk(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
} catch (error) {
  if (error instanceof NotFoundError) {
    throw error;
  }
  throw new InternalServerError('Failed to fetch user');
}

// ❌ Bad - Swallowing errors
try {
  const user = await User.findByPk(id);
  return user;
} catch (error) {
  console.log(error);
  return null;
}
```

## 🧪 Testing Guidelines

### Test Structure

Every feature should have corresponding tests:

```
tests/
├── unit/
│   ├── services/
│   │   └── userService.test.js
│   └── utils/
│       └── encryption.test.js
├── integration/
│   └── auth.test.js
└── security/
    └── injection.test.js
```

### Writing Unit Tests

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import UserService from '../../src/services/userService.js';

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        name: 'Test User',
        role: 'Student'
      };

      const user = await userService.createUser(userData, 'admin-id');

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password_hash).not.toBe(userData.password);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123',
        name: 'Test User',
        role: 'Student'
      };

      await expect(
        userService.createUser(userData, 'admin-id')
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

### Writing Integration Tests

```javascript
import request from 'supertest';
import app from '../../app.js';

describe('Authentication API', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### Test Coverage Requirements

- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Minimum 70% coverage
- **Critical Paths**: 100% coverage (authentication, authorization)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/services/userService.test.js

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📝 Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(auth): add OTP authentication"

# Bug fix
git commit -m "fix(user): resolve email validation issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api): change response format

BREAKING CHANGE: API responses now use 'data' instead of 'result'"
```

### Commit Message Rules

1. Use present tense ("add feature" not "added feature")
2. Use imperative mood ("move cursor to..." not "moves cursor to...")
3. Limit first line to 72 characters
4. Reference issues and pull requests when applicable
5. Provide detailed description in body for complex changes

## 🔀 Pull Request Process

### Before Submitting

1. **Update your branch** with latest changes from `develop`
2. **Run all tests** and ensure they pass
3. **Run linter** (if configured)
4. **Update documentation** if needed
5. **Add tests** for new features
6. **Check code coverage** meets requirements

### Creating a Pull Request

1. **Push your branch** to your fork
2. **Create PR** on GitHub from your branch to `upstream/develop`
3. **Fill out PR template** completely
4. **Link related issues** using keywords (Fixes #123, Closes #456)
5. **Request review** from maintainers

### PR Title Format

Follow commit message format:

```
feat(auth): add OTP authentication support
fix(user): resolve email validation bug
docs(api): update endpoint documentation
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123
Closes #456

## Changes Made
- Added OTP authentication
- Updated user model
- Added integration tests

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added for new features
- [ ] All tests pass
```

### Review Process

1. **Automated checks** must pass (tests, linting)
2. **At least one approval** from maintainers required
3. **Address review comments** promptly
4. **Update PR** based on feedback
5. **Squash commits** if requested
6. **Maintainer merges** after approval

### After Merge

1. **Delete your feature branch**
2. **Update your local repository**
3. **Close related issues** if not auto-closed

## 📂 Project Structure Guidelines

### Adding New Features

When adding a new feature, follow this structure:

1. **Model** (if needed): `src/models/NewModel.js`
2. **Service**: `src/services/newService.js`
3. **Controller**: `src/controllers/newController.js`
4. **Routes**: `src/routes/new.js`
5. **Middleware** (if needed): `src/middleware/newMiddleware.js`
6. **Tests**: `tests/unit/services/newService.test.js`

### File Naming

- Use camelCase for JavaScript files
- Use PascalCase for class/model files
- Use descriptive names that indicate purpose
- Keep file names concise but clear

### Module Organization

```javascript
// ✅ Good - Clear exports
export const createUser = async (data) => { /* ... */ };
export const updateUser = async (id, data) => { /* ... */ };
export const deleteUser = async (id) => { /* ... */ };

// ❌ Bad - Default export of object
export default {
  createUser: async (data) => { /* ... */ },
  updateUser: async (id, data) => { /* ... */ },
  deleteUser: async (id) => { /* ... */ }
};
```

## 🔒 Security Guidelines

### Security Checklist

When contributing code that handles:

#### Authentication/Authorization
- [ ] Passwords are hashed with bcrypt
- [ ] JWT tokens have appropriate expiry
- [ ] Tokens are validated on every request
- [ ] Refresh tokens are properly managed
- [ ] Account lockout is implemented

#### User Input
- [ ] All inputs are validated
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize inputs)
- [ ] CSRF protection (where applicable)
- [ ] File upload validation

#### Sensitive Data
- [ ] PII is encrypted at rest
- [ ] Sensitive data not logged
- [ ] Secrets not hardcoded
- [ ] Environment variables used for config
- [ ] Audit logs for sensitive operations

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, email security@mssu.ac.in with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## 📚 Documentation Guidelines

### Code Documentation

Use JSDoc for functions and classes:

```javascript
/**
 * Create a new user account
 * 
 * @param {Object} userData - User data object
 * @param {string} userData.email - User email address
 * @param {string} userData.password - User password (will be hashed)
 * @param {string} userData.name - User full name
 * @param {string} userData.role - User role (Student, Teacher, etc.)
 * @param {string} createdBy - ID of admin creating the user
 * @returns {Promise<Object>} Created user object (without password)
 * @throws {ValidationError} If user data is invalid
 * @throws {ConflictError} If email already exists
 */
async function createUser(userData, createdBy) {
  // Implementation
}
```

### API Documentation

Update Swagger documentation when adding/modifying endpoints:

```javascript
/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
```

### README Updates

Update README.md when:
- Adding new features
- Changing configuration
- Modifying setup process
- Adding new dependencies

## 🎯 Best Practices

### Performance

- Use database indexes appropriately
- Implement caching where beneficial
- Avoid N+1 queries
- Use connection pooling
- Optimize large data operations

### Error Handling

- Use custom error classes
- Provide meaningful error messages
- Log errors appropriately
- Don't expose internal details to clients
- Handle edge cases

### Code Quality

- Keep functions small and focused
- Avoid deep nesting
- Use meaningful variable names
- Remove commented-out code
- Keep dependencies up to date

## 🤔 Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search closed issues and PRs
3. Ask in discussions (if available)
4. Contact maintainers

## 🙏 Thank You!

Thank you for contributing to MSSU Connect! Your efforts help make this project better for everyone.

---

**Happy Coding! 🚀**

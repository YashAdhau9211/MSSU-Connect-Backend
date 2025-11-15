# MSSU Connect Backend - Complete Postman API Testing Guide

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Setup](#environment-setup)
3. [Authentication Endpoints](#authentication-endpoints)
4. [User Management Endpoints](#user-management-endpoints)
5. [Profile Management Endpoints](#profile-management-endpoints)
6. [Session Management Endpoints](#session-management-endpoints)
7. [Audit Log Endpoints](#audit-log-endpoints)
8. [Common Error Responses](#common-error-responses)
9. [Testing Workflows](#testing-workflows)
10. [Postman Collection Import](#postman-collection-import)

---

## 🚀 Getting Started

### Prerequisites

1. **Backend Server Running**: Ensure the server is running on `http://localhost:3000`
2. **Database Setup**: PostgreSQL database with migrations and seed data
3. **Redis Running**: Redis server for caching and rate limiting
4. **Postman Installed**: Download from [postman.com](https://www.postman.com/downloads/)

### Quick Start

```bash
# Start the backend server
npm run dev

# Server should be running at http://localhost:3000
```

---

## ⚙️ Environment Setup

### Create Postman Environment

1. Open Postman → Click "Environments" (left sidebar)
2. Click "+" to create new environment
3. Name it: `MSSU Connect - Local`
4. Add the following variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000/api/v1` | `http://localhost:3000/api/v1` |
| `access_token` | (leave empty) | (leave empty) |
| `refresh_token` | (leave empty) | (leave empty) |
| `user_id` | (leave empty) | (leave empty) |
| `session_id` | (leave empty) | (leave empty) |

5. Save the environment
6. Select it from the environment dropdown (top right)


---

## 🔐 Authentication Endpoints

### 1. Register New User

**Endpoint**: `POST {{base_url}}/auth/register`

**Description**: Create a new user account (Admin/Super_Admin only)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phone": "+919876543210",
  "role": "Student",
  "campus_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "phone": "+919876543210",
      "role": "Student",
      "status": "active",
      "campus_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "message": "User created successfully"
}
```

**Notes**:
- Requires authentication (Admin or Super_Admin role)
- Password must be at least 8 characters with uppercase, lowercase, and number
- Phone must be in format: +91XXXXXXXXXX

---

### 2. Login with Email/Password

**Endpoint**: `POST {{base_url}}/auth/login`

**Description**: Authenticate user with email and password

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123"
}
```

**Email Format**:
- Accepts standard email formats including dots in local part
- Examples: `john.doe@example.com`, `user.test@mssu.ac.in`
- Case-insensitive

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "Student",
      "campus_id": "campus-uuid"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Postman Tests Script** (Save tokens automatically):
```javascript
// Save tokens to environment variables
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.data.accessToken);
    pm.environment.set("refresh_token", response.data.refreshToken);
    pm.environment.set("user_id", response.data.user.id);
    console.log("Tokens saved successfully!");
}
```

**Error Responses**:
- `401`: Invalid credentials
- `403`: Account locked or inactive
- `429`: Too many login attempts

---

### 3. Request OTP for Mobile Login

**Endpoint**: `POST {{base_url}}/auth/otp/request`

**Description**: Generate and send OTP to mobile number

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "phone": "+919876543210"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "expiresAt": "2024-01-15T10:35:00Z"
  },
  "message": "OTP sent successfully"
}
```

**Notes**:
- OTP is valid for 5 minutes
- Rate limited to 3 requests per hour per phone number
- In development, OTP is logged to console

---

### 4. Verify OTP and Login

**Endpoint**: `POST {{base_url}}/auth/otp/verify`

**Description**: Verify OTP and authenticate user

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "phone": "+919876543210",
      "role": "Student"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Postman Tests Script**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.data.accessToken);
    pm.environment.set("refresh_token", response.data.refreshToken);
    pm.environment.set("user_id", response.data.user.id);
}
```

---

### 5. Refresh Access Token

**Endpoint**: `POST {{base_url}}/auth/refresh`

**Description**: Generate new access token using refresh token

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "refreshToken": "{{refresh_token}}"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

**Postman Tests Script**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.data.accessToken);
}
```

---

### 6. Logout (Current Session)

**Endpoint**: `POST {{base_url}}/auth/logout`

**Description**: Logout from current session

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Postman Tests Script**:
```javascript
if (pm.response.code === 200) {
    pm.environment.unset("access_token");
    pm.environment.unset("refresh_token");
    console.log("Tokens cleared!");
}
```

---

### 7. Logout from All Devices

**Endpoint**: `POST {{base_url}}/auth/logout-all`

**Description**: Logout from all active sessions

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

### 8. Forgot Password

**Endpoint**: `POST {{base_url}}/auth/password/forgot`

**Description**: Request password reset link

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "student@example.com"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

**Notes**:
- Reset token is valid for 1 hour
- In development, token is logged to console

---

### 9. Reset Password

**Endpoint**: `POST {{base_url}}/auth/password/reset`

**Description**: Reset password using token from email

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "newPassword": "NewSecurePass123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```


---

## 👥 User Management Endpoints

### 1. List Users (with Filtering & Pagination)

**Endpoint**: `GET {{base_url}}/users`

**Description**: Get paginated list of users with optional filters

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Query Parameters**:
```
page=1
limit=20
sortBy=created_at
sortOrder=desc
role=Student
status=active
search=john
campus_id=550e8400-e29b-41d4-a716-446655440000
```

**Example Request**:
```
GET {{base_url}}/users?page=1&limit=20&role=Student&status=active
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "email": "student@example.com",
        "name": "John Doe",
        "phone": "+919876543210",
        "role": "Student",
        "status": "active",
        "campus_id": "campus-uuid",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**Notes**:
- Requires Admin or Super_Admin role
- Admin can only see users from their campus
- Super_Admin can see all users

---

### 2. Get User by ID

**Endpoint**: `GET {{base_url}}/users/:id`

**Description**: Get detailed information about a specific user

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Example Request**:
```
GET {{base_url}}/users/550e8400-e29b-41d4-a716-446655440000
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "phone": "+919876543210",
      "role": "Student",
      "status": "active",
      "campus_id": "campus-uuid",
      "address": "123 Main Street",
      "profile_picture_url": "https://...",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

---

### 3. Update User

**Endpoint**: `PUT {{base_url}}/users/:id`

**Description**: Update user information

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body**:
```json
{
  "name": "John Updated",
  "phone": "+919876543211",
  "address": "456 New Street"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "student@example.com",
      "name": "John Updated",
      "phone": "+919876543211",
      "address": "456 New Street"
    }
  },
  "message": "User updated successfully"
}
```

**Notes**:
- Admin can only update users from their campus
- Super_Admin can update role and campus_id
- Email changes require special authorization

---

### 4. Update User Status

**Endpoint**: `PATCH {{base_url}}/users/:id/status`

**Description**: Change user account status (active/inactive/locked)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body**:
```json
{
  "status": "inactive",
  "reason": "Temporary suspension"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "status": "inactive"
    }
  },
  "message": "User status updated successfully"
}
```

**Valid Status Values**:
- `active`: User can login and access system
- `inactive`: User cannot login
- `locked`: Account temporarily locked (usually after failed login attempts)

---

### 5. Delete User (Soft Delete)

**Endpoint**: `DELETE {{base_url}}/users/:id`

**Description**: Soft delete a user account (requires MFA)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body**:
```json
{
  "mfaCode": "123456",
  "reason": "Graduation"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Notes**:
- Requires MFA verification
- Data is retained for audit purposes
- Cannot be undone without database access


---

## 👤 Profile Management Endpoints

### 1. Get Own Profile

**Endpoint**: `GET {{base_url}}/profile`

**Description**: Get authenticated user's profile information

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "phone": "+919876543210",
      "role": "Student",
      "status": "active",
      "campus_id": "campus-uuid",
      "address": "123 Main Street",
      "profile_picture_url": "https://...",
      "created_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

---

### 2. Update Own Profile

**Endpoint**: `PUT {{base_url}}/profile`

**Description**: Update authenticated user's profile

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body**:
```json
{
  "name": "John Updated",
  "phone": "+919876543211",
  "address": "456 New Street, City"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Updated",
      "phone": "+919876543211",
      "address": "456 New Street, City"
    }
  },
  "message": "Profile updated successfully"
}
```

**Notes**:
- Cannot change email, role, or campus_id through this endpoint
- Phone number must be unique

---

### 3. Upload Profile Picture

**Endpoint**: `POST {{base_url}}/profile/picture`

**Description**: Upload profile picture (JPEG/PNG, max 5MB)

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Request Body** (form-data):
```
Key: picture
Type: File
Value: [Select image file]
```

**Postman Setup**:
1. Select "Body" tab
2. Choose "form-data"
3. Add key: `picture`
4. Change type to "File" (dropdown on right)
5. Click "Select Files" and choose an image

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "profile_picture_url": "https://s3.amazonaws.com/mssu-connect/profiles/user-id/1234567890.jpg"
  },
  "message": "Profile picture uploaded successfully"
}
```

**Notes**:
- Allowed formats: JPEG, PNG
- Maximum file size: 5MB
- Image is automatically resized to 500x500 pixels
- Old profile picture is replaced

---

### 4. Change Password

**Endpoint**: `PUT {{base_url}}/profile/password`

**Description**: Change password for authenticated user

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body**:
```json
{
  "oldPassword": "OldPass123",
  "newPassword": "NewPass123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Notes**:
- Requires current password for verification
- New password must meet strength requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number


---

## 📱 Session Management Endpoints

### 1. Get Active Sessions

**Endpoint**: `GET {{base_url}}/sessions`

**Description**: Get all active sessions for authenticated user

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-uuid-1",
        "device_type": "mobile",
        "device_name": "iPhone 13",
        "ip_address": "192.168.1.1",
        "last_activity": "2024-01-15T10:30:00Z",
        "created_at": "2024-01-15T08:00:00Z",
        "is_current": true
      },
      {
        "id": "session-uuid-2",
        "device_type": "web",
        "device_name": "Chrome on Windows",
        "ip_address": "192.168.1.2",
        "last_activity": "2024-01-14T15:20:00Z",
        "created_at": "2024-01-14T14:00:00Z",
        "is_current": false
      }
    ]
  }
}
```

**Postman Tests Script** (Save first session ID):
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data.sessions.length > 0) {
        // Save a non-current session ID for testing revoke
        const nonCurrentSession = response.data.sessions.find(s => !s.is_current);
        if (nonCurrentSession) {
            pm.environment.set("session_id", nonCurrentSession.id);
        }
    }
}
```

---

### 2. Revoke Specific Session

**Endpoint**: `DELETE {{base_url}}/sessions/:id`

**Description**: Revoke (logout) a specific session

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Example Request**:
```
DELETE {{base_url}}/sessions/{{session_id}}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

**Notes**:
- Cannot revoke current session (use `/auth/logout` instead)
- Useful for logging out from other devices
- Invalidates tokens associated with that session


---

## 📊 Audit Log Endpoints

### 1. Get Audit Logs

**Endpoint**: `GET {{base_url}}/audit-logs`

**Description**: Get audit logs with filtering (Super_Admin only)

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Query Parameters**:
```
page=1
limit=50
user_id=550e8400-e29b-41d4-a716-446655440000
admin_id=550e8400-e29b-41d4-a716-446655440001
action_type=login
start_date=2024-01-01T00:00:00Z
end_date=2024-01-31T23:59:59Z
```

**Example Request**:
```
GET {{base_url}}/audit-logs?page=1&limit=50&action_type=login
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-uuid-1",
        "user_id": "user-uuid-1",
        "admin_id": null,
        "action_type": "login",
        "resource_type": "session",
        "resource_id": "session-uuid-1",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "details": {
          "device_type": "mobile",
          "device_name": "iPhone 13"
        },
        "created_at": "2024-01-15T10:30:00Z"
      },
      {
        "id": "log-uuid-2",
        "user_id": "user-uuid-2",
        "admin_id": "admin-uuid-1",
        "action_type": "user_created",
        "resource_type": "user",
        "resource_id": "user-uuid-2",
        "ip_address": "192.168.1.2",
        "user_agent": "Mozilla/5.0...",
        "details": {
          "role": "Student",
          "campus_id": "campus-uuid-1"
        },
        "created_at": "2024-01-15T09:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 500,
      "totalPages": 10
    }
  }
}
```

**Action Types**:
- `login`: User logged in
- `logout`: User logged out
- `failed_login`: Failed login attempt
- `user_created`: New user created
- `user_updated`: User information updated
- `user_deleted`: User deleted
- `role_changed`: User role changed
- `status_changed`: User status changed
- `password_reset`: Password reset
- `mfa_verified`: MFA verification

**Notes**:
- Only accessible by Super_Admin
- Useful for security monitoring and compliance
- Logs are retained indefinitely


---

## ❌ Common Error Responses

### 400 - Bad Request (Validation Error)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

---

### 401 - Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Common Causes**:
- Missing Authorization header
- Invalid or expired access token
- Token has been blacklisted (after logout)

---

### 403 - Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**Common Causes**:
- User doesn't have required role
- Trying to access resources from different campus
- Account is inactive or locked

---

### 404 - Not Found

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User not found"
  }
}
```

---

### 409 - Conflict

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email already registered"
  }
}
```

**Common Codes**:
- `EMAIL_EXISTS`: Email already in use
- `PHONE_EXISTS`: Phone number already in use

---

### 429 - Too Many Requests (Rate Limit)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

**Rate Limits**:
- Authentication endpoints: 10 requests/minute
- OTP requests: 3 requests/hour per phone
- General API: 100 requests/minute
- Sensitive operations: 5 requests/minute

---

### 500 - Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```


---

## 🔄 Testing Workflows

### Workflow 1: Complete User Registration & Login Flow

**Step 1**: Login as Admin/Super_Admin
```
POST {{base_url}}/auth/login
Body: { "email": "admin@example.com", "password": "AdminPass123" }
```

**Step 2**: Register New User
```
POST {{base_url}}/auth/register
Headers: Authorization: Bearer {{access_token}}
Body: { "email": "newuser@example.com", "password": "UserPass123", ... }
```

**Step 3**: Logout Admin
```
POST {{base_url}}/auth/logout
```

**Step 4**: Login as New User
```
POST {{base_url}}/auth/login
Body: { "email": "newuser@example.com", "password": "UserPass123" }
```

---

### Workflow 2: OTP Login Flow

**Step 1**: Request OTP
```
POST {{base_url}}/auth/otp/request
Body: { "phone": "+919876543210" }
```

**Step 2**: Check server console for OTP (in development)

**Step 3**: Verify OTP
```
POST {{base_url}}/auth/otp/verify
Body: { "phone": "+919876543210", "otp": "123456" }
```

---

### Workflow 3: Password Reset Flow

**Step 1**: Request Password Reset
```
POST {{base_url}}/auth/password/forgot
Body: { "email": "student@example.com" }
```

**Step 2**: Check server console for reset token (in development)

**Step 3**: Reset Password
```
POST {{base_url}}/auth/password/reset
Body: { "token": "reset-token-here", "newPassword": "NewPass123" }
```

**Step 4**: Login with New Password
```
POST {{base_url}}/auth/login
Body: { "email": "student@example.com", "password": "NewPass123" }
```

---

### Workflow 4: Profile Management Flow

**Step 1**: Login
```
POST {{base_url}}/auth/login
```

**Step 2**: Get Profile
```
GET {{base_url}}/profile
```

**Step 3**: Update Profile
```
PUT {{base_url}}/profile
Body: { "name": "Updated Name", "address": "New Address" }
```

**Step 4**: Upload Profile Picture
```
POST {{base_url}}/profile/picture
Body: form-data with 'picture' file
```

**Step 5**: Change Password
```
PUT {{base_url}}/profile/password
Body: { "oldPassword": "OldPass123", "newPassword": "NewPass123" }
```

---

### Workflow 5: Session Management Flow

**Step 1**: Login from Multiple "Devices" (run login multiple times)
```
POST {{base_url}}/auth/login
```

**Step 2**: View All Sessions
```
GET {{base_url}}/sessions
```

**Step 3**: Revoke Specific Session
```
DELETE {{base_url}}/sessions/{{session_id}}
```

**Step 4**: Logout from All Devices
```
POST {{base_url}}/auth/logout-all
```


---

## 📦 Postman Collection Import

### Option 1: Manual Collection Creation

1. Create a new collection: "MSSU Connect API"
2. Add folders for each endpoint category:
   - Authentication
   - User Management
   - Profile Management
   - Session Management
   - Audit Logs
3. Add requests from this guide to respective folders
4. Set up environment variables as described above

---

### Option 2: Import JSON Collection

Create a file `MSSU-Connect-API.postman_collection.json` with the structure below, then import it into Postman.

**Basic Collection Structure**:
```json
{
  "info": {
    "name": "MSSU Connect API",
    "description": "Complete API testing collection for MSSU Connect Backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"student@example.com\",\n  \"password\": \"SecurePass123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/auth/login",
              "host": ["{{base_url}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.environment.set('access_token', response.data.accessToken);",
                  "    pm.environment.set('refresh_token', response.data.refreshToken);",
                  "    pm.environment.set('user_id', response.data.user.id);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🧪 Testing Best Practices

### 1. Use Environment Variables

Always use `{{base_url}}` and `{{access_token}}` instead of hardcoding values.

### 2. Add Test Scripts

Add automatic token saving scripts to login endpoints:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.data.accessToken);
    pm.environment.set("refresh_token", response.data.refreshToken);
}
```

### 3. Test Error Cases

Don't just test success scenarios. Test:
- Invalid credentials
- Missing required fields
- Invalid data formats
- Unauthorized access
- Rate limiting

### 4. Use Pre-request Scripts

For requests requiring authentication, add a pre-request script to check token:
```javascript
if (!pm.environment.get("access_token")) {
    console.error("No access token found. Please login first.");
}
```

### 5. Organize Collections

Group related endpoints in folders:
- Authentication
- User Management
- Profile Management
- Session Management
- Audit Logs

### 6. Use Collection Variables

For data that changes frequently (like user IDs), use collection or environment variables.

### 7. Test Rate Limiting

Try making multiple rapid requests to test rate limiting:
- Authentication: 10 requests/minute
- OTP: 3 requests/hour
- General: 100 requests/minute


---

## 🔍 Advanced Testing Scenarios

### Scenario 1: Test Account Lockout

**Purpose**: Verify account locks after 5 failed login attempts

1. Make 5 failed login attempts:
```
POST {{base_url}}/auth/login
Body: { "email": "student@example.com", "password": "WrongPassword" }
```

2. On 6th attempt, should receive:
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account temporarily locked due to multiple failed login attempts"
  }
}
```

3. Wait 30 minutes (or check `ACCOUNT_LOCK_DURATION` in .env)
4. Try logging in again with correct password

---

### Scenario 2: Test Token Expiry

**Purpose**: Verify access token expires after 1 hour

1. Login and save access token
2. Wait 1 hour (or modify `JWT_ACCESS_EXPIRY` in .env for testing)
3. Try accessing protected endpoint:
```
GET {{base_url}}/profile
```

4. Should receive 401 Unauthorized
5. Use refresh token to get new access token:
```
POST {{base_url}}/auth/refresh
Body: { "refreshToken": "{{refresh_token}}" }
```

---

### Scenario 3: Test Role-Based Access Control

**Purpose**: Verify users can only access resources they're authorized for

**Test 1**: Student trying to access admin endpoint
```
1. Login as Student
2. Try: GET {{base_url}}/users
3. Should receive 403 Forbidden
```

**Test 2**: Admin accessing different campus data
```
1. Login as Admin from Campus A
2. Try: GET {{base_url}}/users?campus_id=campus-b-uuid
3. Should receive 403 Forbidden or filtered results
```

**Test 3**: Super_Admin accessing all data
```
1. Login as Super_Admin
2. Try: GET {{base_url}}/users?campus_id=any-campus-uuid
3. Should receive 200 OK with data
```

---

### Scenario 4: Test OTP Expiry

**Purpose**: Verify OTP expires after 5 minutes

1. Request OTP:
```
POST {{base_url}}/auth/otp/request
Body: { "phone": "+919876543210" }
```

2. Wait 6 minutes (or modify `OTP_EXPIRY` in .env)
3. Try to verify OTP:
```
POST {{base_url}}/auth/otp/verify
Body: { "phone": "+919876543210", "otp": "123456" }
```

4. Should receive:
```json
{
  "success": false,
  "error": {
    "code": "OTP_EXPIRED",
    "message": "OTP has expired. Please request a new one"
  }
}
```

---

### Scenario 5: Test Concurrent Sessions

**Purpose**: Verify multiple sessions can exist simultaneously

1. Login from "Device 1" (save as token1)
2. Login from "Device 2" (save as token2)
3. Login from "Device 3" (save as token3)
4. Get sessions with token1:
```
GET {{base_url}}/sessions
Authorization: Bearer token1
```

5. Should see 3 active sessions
6. Logout all from one device:
```
POST {{base_url}}/auth/logout-all
Authorization: Bearer token1
```

7. Try using token2 or token3 - should be invalid

---

### Scenario 6: Test File Upload Validation

**Purpose**: Verify profile picture upload restrictions

**Test 1**: Upload valid image
```
POST {{base_url}}/profile/picture
Body: form-data with valid JPEG/PNG (< 5MB)
Expected: 200 OK
```

**Test 2**: Upload oversized file
```
POST {{base_url}}/profile/picture
Body: form-data with image > 5MB
Expected: 400 Bad Request
```

**Test 3**: Upload invalid file type
```
POST {{base_url}}/profile/picture
Body: form-data with PDF/TXT file
Expected: 400 Bad Request
```

---

### Scenario 7: Test Password Strength Validation

**Purpose**: Verify password requirements are enforced

**Test weak passwords**:
```
POST {{base_url}}/auth/register
Body: { ..., "password": "weak" }
Expected: 400 - Password too short

Body: { ..., "password": "alllowercase" }
Expected: 400 - Missing uppercase

Body: { ..., "password": "ALLUPPERCASE" }
Expected: 400 - Missing lowercase

Body: { ..., "password": "NoNumbers" }
Expected: 400 - Missing number

Body: { ..., "password": "ValidPass123" }
Expected: 201 - Success
```


---

## 🎯 Quick Reference: Default Test Users

After running `npm run seed`, these users are available:

### Super Admin
```
Email: superadmin@mssu.ac.in
Password: SuperAdmin@123
Role: Super_Admin
Campus: Navi Mumbai
```

### Campus Admins
```
Navi Mumbai Admin:
Email: admin.navimumbai@mssu.ac.in
Password: Admin@123
Role: Admin

Thane Admin:
Email: admin.thane@mssu.ac.in
Password: Admin@123
Role: Admin

Nagpur Admin:
Email: admin.nagpur@mssu.ac.in
Password: Admin@123
Role: Admin

Pune Admin:
Email: admin.pune@mssu.ac.in
Password: Admin@123
Role: Admin
```

### Test Students
```
Student 1:
Email: student1@mssu.ac.in
Password: Student@123
Phone: +919876543210
Role: Student
Campus: Navi Mumbai

Student 2:
Email: student2@mssu.ac.in
Password: Student@123
Phone: +919876543211
Role: Student
Campus: Thane
```

---

## 📝 Postman Collection Runner

### Running Collection Tests

1. Click "Runner" button in Postman
2. Select "MSSU Connect API" collection
3. Select environment: "MSSU Connect - Local"
4. Configure iterations and delay
5. Click "Run MSSU Connect API"

### Recommended Test Order

1. **Authentication Tests**
   - Login (saves tokens)
   - Get Profile (verifies token)
   - Refresh Token
   - Logout

2. **User Management Tests** (requires Admin login)
   - List Users
   - Get User by ID
   - Update User
   - Update Status

3. **Profile Tests**
   - Get Profile
   - Update Profile
   - Change Password

4. **Session Tests**
   - Get Sessions
   - Revoke Session

5. **Audit Tests** (requires Super_Admin)
   - Get Audit Logs

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized" on all requests

**Solution**:
1. Check if access token is set: `{{access_token}}`
2. Login again to get fresh token
3. Verify Authorization header format: `Bearer {{access_token}}`

---

### Issue: "ECONNREFUSED" error

**Solution**:
1. Verify server is running: `npm run dev`
2. Check server is on correct port (default: 3000)
3. Verify `base_url` in environment: `http://localhost:3000/api/v1`

---

### Issue: "Rate limit exceeded"

**Solution**:
1. Wait for rate limit window to reset (usually 1 minute)
2. Check rate limit headers in response
3. For testing, temporarily increase limits in `.env`

---

### Issue: "Database connection error"

**Solution**:
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Run migrations: `npm run migrate`
4. Check database exists: `psql -l`

---

### Issue: "Redis connection error"

**Solution**:
1. Verify Redis is running: `redis-cli ping`
2. Check Redis connection details in `.env`
3. Start Redis: `redis-server`

---

### Issue: OTP not received

**Solution**:
1. In development, OTP is logged to server console
2. Check server logs for OTP code
3. Verify SMS provider configuration (if in production)

---

### Issue: Email not received (password reset)

**Solution**:
1. In development, reset token is logged to console
2. Check server logs for reset token
3. Verify email provider configuration (if in production)

---

### Issue: "Invalid email format" error

**Solution**:
1. Email validation accepts standard RFC-compliant formats
2. Valid examples:
   - `user@example.com`
   - `john.doe@example.com`
   - `user.test@mssu.ac.in`
   - `first.last.name@domain.co.in`
3. Ensure no leading/trailing spaces
4. Email is case-insensitive

---

## 📚 Additional Resources

### API Documentation
- Swagger UI: `http://localhost:3000/api-docs`
- Interactive API testing and documentation

### Server Health Checks
- Basic health: `GET http://localhost:3000/api/v1/health`
- Readiness check: `GET http://localhost:3000/api/v1/ready`

### Useful Commands
```bash
# Start server
npm run dev

# Run migrations
npm run migrate

# Seed database
npm run seed

# Add test user
npm run add-user

# Test Redis connection
npm run test:redis

# Run tests
npm test
```

---

## ✅ Testing Checklist

### Authentication
- [ ] Login with email/password
- [ ] Login with OTP
- [ ] Refresh token
- [ ] Logout current session
- [ ] Logout all sessions
- [ ] Forgot password
- [ ] Reset password
- [ ] Register new user (as admin)

### User Management
- [ ] List users with pagination
- [ ] Filter users by role
- [ ] Filter users by campus
- [ ] Search users
- [ ] Get user by ID
- [ ] Update user
- [ ] Update user status
- [ ] Delete user (with MFA)

### Profile Management
- [ ] Get own profile
- [ ] Update profile
- [ ] Upload profile picture
- [ ] Change password

### Session Management
- [ ] Get active sessions
- [ ] Revoke specific session
- [ ] Multiple concurrent sessions

### Audit Logs
- [ ] Get audit logs
- [ ] Filter by user
- [ ] Filter by action type
- [ ] Filter by date range

### Error Handling
- [ ] Invalid credentials
- [ ] Missing required fields
- [ ] Invalid data formats
- [ ] Unauthorized access
- [ ] Forbidden access
- [ ] Rate limiting
- [ ] Account lockout

### Security
- [ ] Token expiry
- [ ] Token refresh
- [ ] Role-based access control
- [ ] Campus data isolation
- [ ] Password strength validation
- [ ] OTP expiry
- [ ] MFA verification

---

## 🎉 Conclusion

This guide covers all API endpoints and testing scenarios for the MSSU Connect Backend. Use it as a reference for:

- Manual API testing with Postman
- Automated testing setup
- Integration testing
- Security testing
- Performance testing

For questions or issues, refer to:
- API Documentation: `http://localhost:3000/api-docs`
- README.md: Project documentation
- SECURITY_CONFIGURATION.md: Security guidelines

**Happy Testing! 🚀**

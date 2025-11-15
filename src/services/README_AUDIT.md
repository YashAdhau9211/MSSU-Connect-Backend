# Audit Service

The Audit Service provides centralized audit logging functionality for the Authentication & User Management module. It handles the creation and retrieval of audit log entries for security events, user actions, and administrative operations.

## Features

- **Centralized Logging**: Single service for all audit log operations
- **Graceful Error Handling**: Audit logging failures don't break main operations
- **Flexible Filtering**: Filter logs by user, admin, action type, and date range
- **Pagination Support**: Efficient retrieval of large audit log datasets
- **Immutable Records**: Audit logs cannot be updated or deleted (enforced at model level)

## API Reference

### createAuditLog(logData)

Creates a new audit log entry.

**Parameters:**
- `logData` (Object): Audit log data
  - `action_type` (string, required): Type of action performed
  - `user_id` (string, optional): ID of the user who performed the action
  - `admin_id` (string, optional): ID of the admin who performed the action
  - `resource_type` (string, optional): Type of resource affected
  - `resource_id` (string, optional): ID of the resource affected
  - `ip_address` (string, optional): IP address of the request
  - `user_agent` (string, optional): User agent string
  - `details` (Object, optional): Additional details as JSON

**Returns:** Promise<Object|null> - Created audit log entry or null on error

**Example:**
```javascript
import { createAuditLog } from './services/auditService.js';

await createAuditLog({
  user_id: 'user-uuid',
  admin_id: 'admin-uuid',
  action_type: 'user_created',
  resource_type: 'user',
  resource_id: 'new-user-uuid',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  details: {
    email: 'user@example.com',
    role: 'Student',
    campus_id: 'campus-uuid'
  }
});
```

### getAuditLogs(filters, pagination)

Retrieves audit logs with filtering and pagination.

**Parameters:**
- `filters` (Object, optional): Filter criteria
  - `user_id` (string): Filter by user ID
  - `admin_id` (string): Filter by admin ID
  - `action_type` (string): Filter by action type
  - `start_date` (Date): Filter by start date
  - `end_date` (Date): Filter by end date
- `pagination` (Object, optional): Pagination options
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 50, max: 100)

**Returns:** Promise<Object> - Paginated audit logs
```javascript
{
  logs: Array<Object>,      // Array of audit log entries
  total: number,             // Total number of logs matching filters
  page: number,              // Current page number
  totalPages: number,        // Total number of pages
  limit: number              // Items per page
}
```

**Example:**
```javascript
import { getAuditLogs } from './services/auditService.js';

// Get all logs for a specific user
const userLogs = await getAuditLogs(
  { user_id: 'user-uuid' },
  { page: 1, limit: 50 }
);

// Get logs by action type
const loginLogs = await getAuditLogs(
  { action_type: 'login' },
  { page: 1, limit: 20 }
);

// Get logs within a date range
const recentLogs = await getAuditLogs(
  {
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31')
  },
  { page: 1, limit: 100 }
);

// Get logs by admin with multiple filters
const adminActions = await getAuditLogs(
  {
    admin_id: 'admin-uuid',
    action_type: 'user_created',
    start_date: new Date('2024-01-01')
  },
  { page: 1, limit: 50 }
);
```

## Common Action Types

The following action types are commonly used throughout the system:

### Authentication Events
- `login` - Successful user login
- `logout` - User logout
- `failed_login` - Failed login attempt
- `otp_requested` - OTP requested for mobile login
- `otp_request_failed` - OTP request failed
- `otp_verification_failed` - OTP verification failed
- `otp_login_failed` - OTP login failed
- `token_refreshed` - Access token refreshed
- `token_refresh_failed` - Token refresh failed

### Account Management
- `account_locked` - Account locked due to failed attempts
- `account_unlocked` - Account unlocked
- `password_reset_requested` - Password reset requested
- `password_reset` - Password successfully reset
- `password_changed` - Password changed by user
- `password_change_failed` - Password change failed

### User Management
- `user_created` - New user created
- `user_updated` - User information updated
- `user_deleted` - User soft deleted
- `status_changed` - User account status changed

### Role Management
- `role_changed` - User role changed

## Error Handling

The audit service is designed to fail gracefully. If an error occurs while creating an audit log:

1. The error is logged to the console
2. `null` is returned instead of throwing an error
3. The main operation continues without interruption

This ensures that audit logging failures don't break critical business operations.

**Example:**
```javascript
const auditLog = await createAuditLog({
  action_type: 'login',
  user_id: 'user-uuid'
});

if (auditLog) {
  console.log('Audit log created:', auditLog.id);
} else {
  console.log('Audit log creation failed, but operation continued');
}
```

## Integration with Other Services

The audit service is used by:

- **authService**: Logs authentication events (login, logout, password reset, etc.)
- **userService**: Logs user management actions (create, update, delete, status changes)
- **rbacService**: Logs authorization failures and role changes (future)
- **sessionService**: Logs session management events (future)

## Database Schema

Audit logs are stored in the `audit_logs` table with the following structure:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_action_created ON audit_logs(action_type, created_at);
CREATE INDEX idx_audit_admin_created ON audit_logs(admin_id, created_at);
```

## Security Considerations

1. **Immutability**: Audit logs cannot be updated or deleted (enforced by model hooks)
2. **Sensitive Data**: Avoid logging sensitive information (passwords, tokens) in the details field
3. **Access Control**: Only Super_Admin users should have access to audit log retrieval endpoints
4. **Data Retention**: Consider implementing a data retention policy for old audit logs

## Testing

A test script is available at `src/scripts/test-audit-service.js` to verify the audit service functionality:

```bash
node src/scripts/test-audit-service.js
```

The test script covers:
- Creating audit log entries
- Retrieving logs with various filters
- Pagination
- Date range filtering
- Error handling

## Requirements Covered

This implementation satisfies the following requirements from the design document:

- **Requirement 13.1**: Log all authentication events
- **Requirement 13.2**: Log all authorization failures
- **Requirement 13.3**: Log all user management actions
- **Requirement 13.4**: Store audit logs in immutable database table
- **Requirement 13.5**: Provide API endpoint for querying audit logs

## Future Enhancements

- Archive old audit logs to cold storage
- Real-time audit log streaming for security monitoring
- Anomaly detection based on audit log patterns
- Export audit logs to external SIEM systems
- Enhanced search capabilities (full-text search on details field)

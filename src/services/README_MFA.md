# MFA Service Documentation

## Overview

The MFA (Multi-Factor Authentication) service provides secure code generation and verification for sensitive operations. It generates 6-digit codes that are stored in Redis with a 5-minute expiry and supports delivery via email or SMS.

## Features

- **Cryptographically Secure**: Uses `crypto.randomInt()` for secure code generation
- **Time-Limited**: Codes expire after 5 minutes
- **Attempt Tracking**: Maximum 3 verification attempts per code
- **Multiple Delivery Methods**: Supports both email and SMS delivery
- **Redis-Based Storage**: Fast, scalable storage with automatic expiry

## Usage

### 1. Send MFA Code

```javascript
import mfaService from './services/mfaService.js';

// Send MFA code via email
const result = await mfaService.sendMFACode(userId, 'email');
console.log(`Code expires at: ${result.expiresAt}`);

// Send MFA code via SMS
const result = await mfaService.sendMFACode(userId, 'sms');
```

**Parameters:**
- `userId` (string): The user's unique identifier
- `method` (string): Delivery method - either `'email'` or `'sms'`

**Returns:**
```javascript
{
  success: true,
  expiresAt: Date,  // When the code expires
  method: 'email'   // The delivery method used
}
```

### 2. Verify MFA Code

```javascript
// Verify the code provided by the user
const result = await mfaService.verifyMFACode(userId, code);

if (result.valid) {
  console.log('MFA verification successful!');
  // Proceed with sensitive operation
} else {
  console.log(`Invalid code. ${result.attemptsRemaining} attempts remaining`);
}
```

**Parameters:**
- `userId` (string): The user's unique identifier
- `code` (string): The 6-digit code to verify

**Returns:**
```javascript
{
  valid: boolean,           // Whether the code is valid
  attemptsRemaining: number, // Number of attempts left (0-3)
  method: string            // Delivery method (only if valid)
}
```

### 3. Check MFA Status

```javascript
// Check if an MFA code exists and its status
const status = await mfaService.checkMFAStatus(userId);

console.log(`Code exists: ${status.exists}`);
console.log(`Expires in: ${status.expiresIn} seconds`);
console.log(`Attempts remaining: ${status.attemptsRemaining}`);
```

**Returns:**
```javascript
{
  exists: boolean,           // Whether an MFA code exists
  expiresIn: number,         // Seconds until expiry
  attemptsRemaining: number, // Number of attempts left
  method: string            // Delivery method (if exists)
}
```

### 4. Delete MFA Code

```javascript
// Manually delete an MFA code (useful for cleanup or testing)
const deleted = await mfaService.deleteMFACode(userId);
```

## Integration with Email/SMS Services

In production, you need to integrate with actual email and SMS services. Update the `sendMFACode` function:

```javascript
// In src/services/mfaService.js

// Import your email and SMS services
import emailService from './emailService.js';
import smsService from './smsService.js';

// In sendMFACode function, replace the TODO section with:
if (method === 'email') {
  await emailService.sendMFAEmail(userEmail, code);
} else if (method === 'sms') {
  await smsService.sendSMS(userPhone, `Your MFA code is: ${code}`);
}
```

## Example: Protecting Sensitive Operations

```javascript
import mfaService from './services/mfaService.js';

// Step 1: User initiates sensitive operation (e.g., delete account)
async function initiateAccountDeletion(userId) {
  // Send MFA code
  const result = await mfaService.sendMFACode(userId, 'email');
  
  return {
    message: 'MFA code sent to your email',
    expiresAt: result.expiresAt
  };
}

// Step 2: User submits MFA code to confirm operation
async function confirmAccountDeletion(userId, mfaCode) {
  // Verify MFA code
  const verification = await mfaService.verifyMFACode(userId, mfaCode);
  
  if (!verification.valid) {
    throw new Error(
      `Invalid MFA code. ${verification.attemptsRemaining} attempts remaining`
    );
  }
  
  // MFA verified - proceed with deletion
  await deleteUserAccount(userId);
  
  return { message: 'Account deleted successfully' };
}
```

## Error Handling

The service throws errors for invalid inputs:

```javascript
try {
  await mfaService.sendMFACode(null, 'email');
} catch (error) {
  console.error(error.message); // "User ID is required"
}

try {
  await mfaService.sendMFACode(userId, 'invalid');
} catch (error) {
  console.error(error.message); // "Invalid method. Must be 'email' or 'sms'"
}
```

For verification failures, check the error code:

```javascript
const result = await mfaService.verifyMFACode(userId, code);

if (!result.valid) {
  if (result.code === 'MFA_EXPIRED') {
    console.log('Code expired. Please request a new one.');
  } else if (result.code === 'MFA_MAX_ATTEMPTS') {
    console.log('Maximum attempts exceeded. Please request a new code.');
  } else {
    console.log(`Invalid code. ${result.attemptsRemaining} attempts remaining.`);
  }
}
```

## Configuration

MFA settings are configured in `src/config/env.js`:

```javascript
// MFA code expiry (5 minutes)
const MFA_EXPIRY_SECONDS = 300;

// Maximum verification attempts
const MAX_MFA_ATTEMPTS = 3;
```

## Redis Keys

The service uses the following Redis key pattern:

- **MFA Codes**: `mfa:${userId}`
  - Stores: `{ code, method, attempts, createdAt }`
  - TTL: 5 minutes (300 seconds)

## Testing

Run the test script to verify the MFA service:

```bash
node src/scripts/test-mfa-service.js
```

The test script covers:
- Code generation
- Sending codes via email and SMS
- Verification with correct and incorrect codes
- Attempt tracking and limits
- Code expiry
- Error handling

## Security Considerations

1. **Cryptographic Security**: Uses `crypto.randomInt()` for secure random number generation
2. **Time-Limited**: Codes expire after 5 minutes to limit exposure
3. **Attempt Limiting**: Maximum 3 attempts prevents brute force attacks
4. **Single Use**: Codes are deleted after successful verification
5. **Redis Storage**: Codes stored in memory, not in database logs

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 4.1**: MFA verification for sensitive operations
- **Requirement 4.2**: 6-digit OTP sent to registered email
- **Requirement 4.3**: Required operations include user deletion, role changes, etc.
- **Requirement 4.4**: Maximum 3 attempts before operation cancellation

## Future Enhancements

- [ ] Add support for TOTP (Time-based One-Time Password)
- [ ] Implement backup codes for account recovery
- [ ] Add rate limiting for MFA code requests
- [ ] Support for multiple active codes per user
- [ ] Audit logging for MFA events

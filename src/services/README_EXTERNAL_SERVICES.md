# External Service Integrations

This document describes the external service integrations implemented for MSSU Connect: SMS, Email, and Cloud Storage services.

## Overview

The external services module provides three key integrations:

1. **SMS Service** - Send SMS messages via Twilio or MSG91
2. **Email Service** - Send emails via AWS SES or SendGrid
3. **Storage Service** - Upload/manage files via AWS S3

All services implement retry logic, error handling, and comprehensive logging.

---

## SMS Service (`smsService.js`)

### Configuration

Add the following environment variables to your `.env` file:

```env
SMS_PROVIDER=twilio          # or 'msg91'
SMS_API_KEY=your_api_key
SMS_API_SECRET=your_api_secret
SMS_FROM_NUMBER=+919876543210
```

### Supported Providers

#### Twilio
- **API Key**: Account SID
- **API Secret**: Auth Token
- **Documentation**: https://www.twilio.com/docs/sms

#### MSG91
- **API Key**: Auth Key
- **API Secret**: Not required
- **Documentation**: https://docs.msg91.com/

### Methods

#### `sendSMS(phone, message, maxRetries = 3)`

Send an SMS message with automatic retry logic.

**Parameters:**
- `phone` (string): Recipient phone number in E.164 format (+919876543210)
- `message` (string): SMS message content
- `maxRetries` (number): Maximum retry attempts (default: 3)

**Returns:** Promise<Object>
```javascript
{
  success: true,
  messageId: 'SM1234567890',
  status: 'sent',
  provider: 'twilio',
  attempts: 1
}
```

**Example:**
```javascript
import { sendSMS } from './services/smsService.js';

try {
  const result = await sendSMS('+919876543210', 'Hello from MSSU Connect!');
  console.log('SMS sent:', result.messageId);
} catch (error) {
  console.error('Failed to send SMS:', error.message);
}
```

#### `sendOTP(phone, otp)`

Send an OTP verification code via SMS.

**Example:**
```javascript
import { sendOTP } from './services/smsService.js';

const result = await sendOTP('+919876543210', '123456');
```

#### `sendAccountLockedSMS(phone, lockDurationMinutes)`

Send account locked notification.

**Example:**
```javascript
import { sendAccountLockedSMS } from './services/smsService.js';

await sendAccountLockedSMS('+919876543210', 30);
```

#### `sendPasswordResetSMS(phone)`

Send password reset confirmation.

**Example:**
```javascript
import { sendPasswordResetSMS } from './services/smsService.js';

await sendPasswordResetSMS('+919876543210');
```

### Features

- ✅ Automatic retry with exponential backoff (max 3 attempts)
- ✅ Phone number validation (Indian format)
- ✅ Comprehensive logging of delivery status
- ✅ Support for multiple SMS providers
- ✅ Error handling with detailed error messages

---

## Email Service (`emailService.js`)

### Configuration

Add the following environment variables to your `.env` file:

#### For AWS SES:
```env
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@mssu.ac.in
EMAIL_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
FRONTEND_URL=https://mssu-connect.com
```

#### For SendGrid:
```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@mssu.ac.in
AWS_ACCESS_KEY_ID=your_sendgrid_api_key
FRONTEND_URL=https://mssu-connect.com
```

### Supported Providers

#### AWS SES
- **Documentation**: https://docs.aws.amazon.com/ses/
- **Verify Email**: You must verify sender email in AWS SES console

#### SendGrid
- **Documentation**: https://docs.sendgrid.com/
- **API Key**: Create in SendGrid dashboard

### Methods

#### `sendEmail(to, subject, htmlBody, textBody, maxRetries = 3)`

Send an email with automatic retry logic.

**Parameters:**
- `to` (string): Recipient email address
- `subject` (string): Email subject
- `htmlBody` (string): HTML email body
- `textBody` (string): Plain text body (optional, auto-generated from HTML)
- `maxRetries` (number): Maximum retry attempts (default: 3)

**Returns:** Promise<Object>
```javascript
{
  success: true,
  messageId: '0102018d1234567890',
  provider: 'ses',
  attempts: 1
}
```

**Example:**
```javascript
import { sendEmail } from './services/emailService.js';

const htmlBody = '<h1>Welcome!</h1><p>Thank you for joining MSSU Connect.</p>';

try {
  const result = await sendEmail(
    'user@example.com',
    'Welcome to MSSU Connect',
    htmlBody
  );
  console.log('Email sent:', result.messageId);
} catch (error) {
  console.error('Failed to send email:', error.message);
}
```

#### `sendPasswordResetEmail(email, resetToken, userName = 'User')`

Send password reset email with styled template.

**Example:**
```javascript
import { sendPasswordResetEmail } from './services/emailService.js';

await sendPasswordResetEmail(
  'user@example.com',
  'reset-token-abc123',
  'John Doe'
);
```

The email includes:
- Branded header with MSSU Connect logo
- Reset password button with link
- Security warnings
- 1-hour expiry notice

#### `sendMFAEmail(email, code, userName = 'User')`

Send MFA verification code email.

**Example:**
```javascript
import { sendMFAEmail } from './services/emailService.js';

await sendMFAEmail('user@example.com', '123456', 'John Doe');
```

The email includes:
- Large, easy-to-read verification code
- 5-minute expiry notice
- Security warnings

#### `sendWelcomeEmail(email, userName, role)`

Send welcome email to new users.

**Example:**
```javascript
import { sendWelcomeEmail } from './services/emailService.js';

await sendWelcomeEmail('user@example.com', 'John Doe', 'Student');
```

### Email Templates

All email templates include:
- Responsive HTML design
- MSSU Connect branding
- Plain text fallback
- Security warnings
- Professional footer

### Features

- ✅ Automatic retry with exponential backoff (max 3 attempts)
- ✅ Email address validation
- ✅ Professional HTML email templates
- ✅ Plain text fallback generation
- ✅ Support for multiple email providers
- ✅ Comprehensive logging

---

## Storage Service (`storageService.js`)

### Configuration

Add the following environment variables to your `.env` file:

```env
S3_BUCKET=mssu-connect-uploads
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key
```

### AWS S3 Setup

1. Create an S3 bucket in AWS Console
2. Configure bucket policy for public read access (for profile pictures)
3. Create IAM user with S3 permissions
4. Generate access keys

### Methods

#### `uploadFile(fileBuffer, key, contentType)`

Upload a file to S3.

**Parameters:**
- `fileBuffer` (Buffer): File data as buffer
- `key` (string): S3 object key (path)
- `contentType` (string): MIME type (e.g., 'image/jpeg')

**Returns:** Promise<string> - S3 URL

**Example:**
```javascript
import { uploadFile } from './services/storageService.js';
import fs from 'fs';

const fileBuffer = fs.readFileSync('document.pdf');
const url = await uploadFile(
  fileBuffer,
  'documents/user123/document.pdf',
  'application/pdf'
);
console.log('File uploaded:', url);
```

#### `deleteFile(key)`

Delete a file from S3.

**Parameters:**
- `key` (string): S3 object key (path)

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
import { deleteFile } from './services/storageService.js';

const success = await deleteFile('documents/user123/document.pdf');
```

#### `getFileUrl(key)`

Get the public URL for an S3 object.

**Parameters:**
- `key` (string): S3 object key (path)

**Returns:** string - S3 URL

**Example:**
```javascript
import { getFileUrl } from './services/storageService.js';

const url = getFileUrl('profiles/user123/picture.jpg');
// Returns: https://bucket.s3.region.amazonaws.com/profiles/user123/picture.jpg
```

#### `uploadProfilePicture(fileBuffer, userId)`

Upload and process a profile picture (resize to 500x500).

**Parameters:**
- `fileBuffer` (Buffer): Image file buffer
- `userId` (string): User ID for organizing files

**Returns:** Promise<string> - S3 URL

**Example:**
```javascript
import { uploadProfilePicture } from './services/storageService.js';

const url = await uploadProfilePicture(imageBuffer, 'user-uuid-123');
```

Features:
- Automatic resize to 500x500 pixels
- JPEG conversion with 85% quality
- Unique filename generation
- Organized by user ID

#### `deleteProfilePicture(profilePictureUrl)`

Delete a profile picture from S3.

**Parameters:**
- `profilePictureUrl` (string): Current profile picture URL

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
import { deleteProfilePicture } from './services/storageService.js';

await deleteProfilePicture('https://bucket.s3.region.amazonaws.com/profiles/user123/pic.jpg');
```

### Features

- ✅ AWS S3 integration
- ✅ Public read access for profile pictures
- ✅ Automatic image processing (resize, optimize)
- ✅ Error handling for upload/delete failures
- ✅ URL extraction utilities
- ✅ Organized file structure

---

## Testing

### Test Configuration

Run the test script to verify service configuration:

```bash
npm run test:external
```

This will display:
- Configuration status for each service
- Available methods
- Implemented features

### Manual Testing

To test actual sending, configure the environment variables and use the services in your code:

```javascript
// Test SMS
import { sendSMS } from './services/smsService.js';
await sendSMS('+919876543210', 'Test message');

// Test Email
import { sendEmail } from './services/emailService.js';
await sendEmail('test@example.com', 'Test', '<p>Test email</p>');

// Test Storage
import { uploadFile } from './services/storageService.js';
const url = await uploadFile(buffer, 'test/file.txt', 'text/plain');
```

---

## Error Handling

All services implement comprehensive error handling:

### SMS Service Errors
- Invalid phone number format
- Provider not configured
- API authentication failure
- Network errors
- Rate limiting

### Email Service Errors
- Invalid email address format
- Provider not configured
- API authentication failure
- Network errors
- Bounce/complaint handling

### Storage Service Errors
- S3 authentication failure
- Bucket not found
- Upload failures
- Delete failures
- Invalid file format

### Retry Logic

All services implement exponential backoff retry:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Maximum delay: 5 seconds

---

## Best Practices

### SMS
- Always validate phone numbers before sending
- Keep messages concise (160 characters recommended)
- Include sender identification
- Respect rate limits

### Email
- Use HTML templates for better presentation
- Always include plain text fallback
- Test emails in multiple clients
- Monitor bounce rates
- Verify sender domain

### Storage
- Use organized folder structure
- Implement file size limits
- Validate file types before upload
- Clean up old files periodically
- Use CDN for frequently accessed files

---

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use `.env` file for local development
3. **Production**: Use secure secret management (AWS Secrets Manager, etc.)
4. **Rate Limiting**: Implement application-level rate limiting
5. **Input Validation**: Always validate user inputs
6. **File Uploads**: Scan for malware, validate file types
7. **Email Links**: Use HTTPS, implement token expiry

---

## Troubleshooting

### SMS Not Sending
1. Check SMS_API_KEY and SMS_API_SECRET are set
2. Verify phone number format (+919876543210)
3. Check provider account balance
4. Review provider dashboard for errors

### Email Not Sending
1. Verify sender email in AWS SES console
2. Check AWS credentials are correct
3. Verify email address format
4. Check spam folder
5. Review bounce/complaint reports

### Storage Upload Failing
1. Check S3 bucket exists
2. Verify IAM permissions
3. Check bucket policy allows uploads
4. Verify file size within limits
5. Check network connectivity

---

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 3.1**: SMS gateway integration for OTP delivery
- **Requirement 8.1**: Email service for password reset
- **Requirement 4.1**: Email service for MFA codes
- **Requirement 9.4**: Cloud storage for profile pictures
- **Requirement 9.5**: Image processing and upload

---

## Support

For issues or questions:
1. Check this documentation
2. Review service provider documentation
3. Check application logs
4. Contact MSSU Connect support team

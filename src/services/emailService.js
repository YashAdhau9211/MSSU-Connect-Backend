import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import config from '../config/env.js';

/**
 * Email Service for sending emails via AWS SES or SendGrid
 * Implements retry logic and email templates
 */

// Initialize AWS SES client (if using SES)
let sesClient = null;
if (config.email.provider === 'ses' && config.email.accessKeyId && config.email.secretAccessKey) {
  sesClient = new SESClient({
    region: config.email.region,
    credentials: {
      accessKeyId: config.email.accessKeyId,
      secretAccessKey: config.email.secretAccessKey,
    },
  });
}

/**
 * Send email using AWS SES
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text email body
 * @returns {Promise<Object>} Delivery status
 */
const sendViaSES = async (to, subject, htmlBody, textBody) => {
  if (!sesClient) {
    throw new Error('SES client not initialized. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
  }

  try {
    const command = new SendEmailCommand({
      Source: config.email.from,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await sesClient.send(command);

    return {
      success: true,
      messageId: result.MessageId,
      provider: 'ses',
    };
  } catch (error) {
    console.error('AWS SES email error:', error.message);
    throw error;
  }
};

/**
 * Send email using SendGrid
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text email body
 * @returns {Promise<Object>} Delivery status
 */
const sendViaSendGrid = async (to, subject, htmlBody, textBody) => {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.email.accessKeyId}`, // SendGrid uses API key
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject,
          },
        ],
        from: {
          email: config.email.from,
        },
        content: [
          {
            type: 'text/plain',
            value: textBody,
          },
          {
            type: 'text/html',
            value: htmlBody,
          },
        ],
      }),
    });

    if (response.ok) {
      return {
        success: true,
        messageId: response.headers.get('x-message-id'),
        provider: 'sendgrid',
      };
    } else {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'SendGrid email failed');
    }
  } catch (error) {
    console.error('SendGrid email error:', error.message);
    throw error;
  }
};

/**
 * Send email with retry logic
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text email body (optional, defaults to stripped HTML)
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Delivery status with success, messageId, attempts
 */
export const sendEmail = async (to, subject, htmlBody, textBody = null, maxRetries = 3) => {
  // Validate inputs
  if (!to || !subject || !htmlBody) {
    throw new Error('Recipient email, subject, and body are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error('Invalid email address format');
  }

  // If no text body provided, create a simple version from HTML
  if (!textBody) {
    textBody = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  let lastError = null;
  let attempts = 0;

  // Retry loop
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    
    try {
      console.log(`[Email Service] Attempt ${attempt}/${maxRetries} - Sending email to ${to}`);
      
      let result;
      
      // Send via configured provider
      if (config.email.provider === 'ses') {
        result = await sendViaSES(to, subject, htmlBody, textBody);
      } else if (config.email.provider === 'sendgrid') {
        result = await sendViaSendGrid(to, subject, htmlBody, textBody);
      } else {
        throw new Error(`Unsupported email provider: ${config.email.provider}`);
      }

      // Log success
      console.log(`[Email Service] ✓ Email sent successfully on attempt ${attempt}`, {
        to,
        subject,
        messageId: result.messageId,
        provider: result.provider,
      });

      return {
        ...result,
        attempts,
      };
    } catch (error) {
      lastError = error;
      
      console.error(`[Email Service] ✗ Attempt ${attempt}/${maxRetries} failed:`, error.message);

      // If not the last attempt, wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
        console.log(`[Email Service] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error(`[Email Service] ✗ All ${maxRetries} attempts failed for ${to}`);
  
  throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Generate password reset email HTML template
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 * @returns {Object} Email subject and HTML body
 */
const generatePasswordResetEmailTemplate = (resetToken, userName) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const subject = 'Password Reset Request - MSSU Connect';
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MSSU Connect</h1>
    </div>
    <div class="content">
      <h2>Password Reset Request</h2>
      <p>Hello ${userName},</p>
      <p>We received a request to reset your password for your MSSU Connect account. Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${resetLink}</p>
      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>This link will expire in 1 hour</li>
          <li>If you didn't request this password reset, please ignore this email</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br>MSSU Connect Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MSSU Connect. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
Password Reset Request - MSSU Connect

Hello ${userName},

We received a request to reset your password for your MSSU Connect account.

To reset your password, click the following link or copy and paste it into your browser:
${resetLink}

IMPORTANT:
- This link will expire in 1 hour
- If you didn't request this password reset, please ignore this email
- Never share this link with anyone

If you have any questions, please contact our support team.

Best regards,
MSSU Connect Team

© ${new Date().getFullYear()} MSSU Connect. All rights reserved.
This is an automated email. Please do not reply to this message.
  `;

  return { subject, htmlBody, textBody };
};

/**
 * Generate MFA code email HTML template
 * @param {string} code - MFA verification code
 * @param {string} userName - User's name
 * @returns {Object} Email subject and HTML body
 */
const generateMFAEmailTemplate = (code, userName) => {
  const subject = 'Verification Code - MSSU Connect';
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .code-box { background-color: #fff; border: 2px solid #0066cc; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MSSU Connect</h1>
    </div>
    <div class="content">
      <h2>Verification Code</h2>
      <p>Hello ${userName},</p>
      <p>You requested a verification code for a sensitive operation on your MSSU Connect account.</p>
      <p>Your verification code is:</p>
      <div class="code-box">${code}</div>
      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>This code will expire in 5 minutes</li>
          <li>Never share this code with anyone</li>
          <li>If you didn't request this code, please contact support immediately</li>
        </ul>
      </div>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br>MSSU Connect Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MSSU Connect. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
Verification Code - MSSU Connect

Hello ${userName},

You requested a verification code for a sensitive operation on your MSSU Connect account.

Your verification code is: ${code}

IMPORTANT:
- This code will expire in 5 minutes
- Never share this code with anyone
- If you didn't request this code, please contact support immediately

If you have any questions, please contact our support team.

Best regards,
MSSU Connect Team

© ${new Date().getFullYear()} MSSU Connect. All rights reserved.
This is an automated email. Please do not reply to this message.
  `;

  return { subject, htmlBody, textBody };
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} Delivery status
 */
export const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  const { subject, htmlBody, textBody } = generatePasswordResetEmailTemplate(resetToken, userName);
  return await sendEmail(email, subject, htmlBody, textBody);
};

/**
 * Send MFA verification code email
 * @param {string} email - Recipient email address
 * @param {string} code - MFA verification code
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} Delivery status
 */
export const sendMFAEmail = async (email, code, userName = 'User') => {
  const { subject, htmlBody, textBody } = generateMFAEmailTemplate(code, userName);
  return await sendEmail(email, subject, htmlBody, textBody);
};

/**
 * Send welcome email to new users
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @param {string} role - User's role
 * @returns {Promise<Object>} Delivery status
 */
export const sendWelcomeEmail = async (email, userName, role) => {
  const subject = 'Welcome to MSSU Connect';
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to MSSU Connect!</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName},</h2>
      <p>Your account has been successfully created with the role of <strong>${role}</strong>.</p>
      <p>You can now log in to MSSU Connect using your email address and the password provided to you.</p>
      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br>MSSU Connect Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MSSU Connect. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return await sendEmail(email, subject, htmlBody);
};

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendMFAEmail,
  sendWelcomeEmail,
};

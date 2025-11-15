import twilio from 'twilio';
import config from '../config/env.js';

/**
 * SMS Service for sending SMS messages via Twilio or MSG91
 * Implements retry logic and delivery status logging
 */

// Initialize Twilio client (if using Twilio)
let twilioClient = null;
if (config.sms.provider === 'twilio' && config.sms.apiKey && config.sms.apiSecret) {
  twilioClient = twilio(config.sms.apiKey, config.sms.apiSecret);
}

/**
 * Send SMS using Twilio
 * @param {string} phone - Recipient phone number (E.164 format)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} Delivery status
 */
const sendViaTwilio = async (phone, message) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized. Check SMS_API_KEY and SMS_API_SECRET.');
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: config.sms.fromNumber,
      to: phone,
    });

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
      provider: 'twilio',
    };
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    throw error;
  }
};

/**
 * Send SMS using MSG91
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} Delivery status
 */
const sendViaMSG91 = async (phone, message) => {
  // MSG91 implementation using their REST API
  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': config.sms.apiKey,
      },
      body: JSON.stringify({
        sender: config.sms.fromNumber,
        route: '4', // Transactional route
        country: '91',
        sms: [
          {
            message: message,
            to: [phone.replace('+91', '')], // MSG91 expects without country code
          },
        ],
      }),
    });

    const data = await response.json();

    if (response.ok && data.type === 'success') {
      return {
        success: true,
        messageId: data.message,
        status: 'sent',
        provider: 'msg91',
      };
    } else {
      throw new Error(data.message || 'MSG91 SMS failed');
    }
  } catch (error) {
    console.error('MSG91 SMS error:', error.message);
    throw error;
  }
};

/**
 * Send SMS with retry logic
 * @param {string} phone - Recipient phone number (E.164 format: +919876543210)
 * @param {string} message - SMS message content
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Delivery status with success, messageId, status, attempts
 */
export const sendSMS = async (phone, message, maxRetries = 3) => {
  // Validate inputs
  if (!phone || !message) {
    throw new Error('Phone number and message are required');
  }

  // Validate phone format (Indian format: +91 followed by 10 digits)
  const phoneRegex = /^\+91\d{10}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format. Expected: +919876543210');
  }

  let lastError = null;
  let attempts = 0;

  // Retry loop
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    
    try {
      console.log(`[SMS Service] Attempt ${attempt}/${maxRetries} - Sending SMS to ${phone}`);
      
      let result;
      
      // Send via configured provider
      if (config.sms.provider === 'twilio') {
        result = await sendViaTwilio(phone, message);
      } else if (config.sms.provider === 'msg91') {
        result = await sendViaMSG91(phone, message);
      } else {
        throw new Error(`Unsupported SMS provider: ${config.sms.provider}`);
      }

      // Log success
      console.log(`[SMS Service] ✓ SMS sent successfully on attempt ${attempt}`, {
        phone,
        messageId: result.messageId,
        status: result.status,
        provider: result.provider,
      });

      return {
        ...result,
        attempts,
      };
    } catch (error) {
      lastError = error;
      
      console.error(`[SMS Service] ✗ Attempt ${attempt}/${maxRetries} failed:`, error.message);

      // If not the last attempt, wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
        console.log(`[SMS Service] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error(`[SMS Service] ✗ All ${maxRetries} attempts failed for ${phone}`);
  
  throw new Error(`Failed to send SMS after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Send OTP SMS
 * @param {string} phone - Recipient phone number
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} Delivery status
 */
export const sendOTP = async (phone, otp) => {
  const message = `Your MSSU-Connect verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
  return await sendSMS(phone, message);
};

/**
 * Send account locked notification SMS
 * @param {string} phone - Recipient phone number
 * @param {number} lockDurationMinutes - Lock duration in minutes
 * @returns {Promise<Object>} Delivery status
 */
export const sendAccountLockedSMS = async (phone, lockDurationMinutes) => {
  const message = `Your MSSU-Connect account has been temporarily locked due to multiple failed login attempts. Please try again after ${lockDurationMinutes} minutes.`;
  return await sendSMS(phone, message);
};

/**
 * Send password reset notification SMS
 * @param {string} phone - Recipient phone number
 * @returns {Promise<Object>} Delivery status
 */
export const sendPasswordResetSMS = async (phone) => {
  const message = `Your MSSU-Connect password has been reset successfully. If you did not request this change, please contact support immediately.`;
  return await sendSMS(phone, message);
};

export default {
  sendSMS,
  sendOTP,
  sendAccountLockedSMS,
  sendPasswordResetSMS,
};

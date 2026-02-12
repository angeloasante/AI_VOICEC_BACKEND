import twilio from 'twilio';
import { config } from '../config.js';

// Initialize Twilio client
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * SMS Message Templates
 */
export const SMS_TEMPLATES = {
  // Booking link after flight inquiry
  BOOKING_LINK: (destination?: string) => 
    `Thanks for calling Diaspora AI! 🌍✈️\n\n${destination ? `Ready to book your trip to ${destination}? ` : ''}Visit us at https://diasporaai.dev to search and book flights.\n\nSafe travels! ✨`,

  // Visa requirements summary
  VISA_INFO: (passport: string, destination: string, visaRequired: boolean, details?: string) => {
    const visaStatus = visaRequired ? '⚠️ Visa Required' : '✅ Visa Free';
    return `Diaspora AI Visa Info 🛂\n\n${passport} → ${destination}\n${visaStatus}\n\n${details || ''}\n\nBook your trip: https://diasporaai.dev`;
  },

  // General follow-up
  FOLLOW_UP: () =>
    `Thanks for calling Diaspora AI! 🌍\n\nNeed help with flights or visa info? Visit https://diasporaai.dev or call us anytime.\n\nSafe travels! ✨`,

  // Confirmation of booking interest
  BOOKING_INTEREST: (route: string) =>
    `Thanks for your interest in ${route}! 🌍✈️\n\nOur team will be in touch shortly. You can also book directly at https://diasporaai.dev\n\nDiaspora AI - Travel Made Easy`,
};

/**
 * Send an SMS to a phone number
 * Uses Messaging Service SID for alpha sender ID support
 */
export async function sendSMS(
  to: string,
  message: string,
  options?: { 
    useAlphaSender?: boolean;
  }
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    // Clean the phone number (ensure it has + prefix)
    const cleanedTo = to.startsWith('+') ? to : `+${to}`;
    
    console.log(`📱 Sending SMS to ${cleanedTo.substring(0, 6)}****`);
    
    // Build message options
    const messageOptions: {
      to: string;
      body: string;
      messagingServiceSid?: string;
      from?: string;
    } = {
      to: cleanedTo,
      body: message,
    };

    // Use Messaging Service SID for alpha sender ID
    if (config.twilio.messagingServiceSid) {
      messageOptions.messagingServiceSid = config.twilio.messagingServiceSid;
      console.log(`📱 Using Messaging Service: ${config.twilio.messagingServiceSid}`);
    } else if (config.twilio.phoneNumber) {
      // Fallback to phone number if no messaging service
      messageOptions.from = config.twilio.phoneNumber;
    } else {
      throw new Error('No messaging service or phone number configured');
    }

    const result = await twilioClient.messages.create(messageOptions);

    console.log(`✅ SMS sent successfully! SID: ${result.sid}`);
    
    return {
      success: true,
      messageSid: result.sid,
    };
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send booking link SMS after a call
 */
export async function sendBookingLinkSMS(
  phoneNumber: string,
  destination?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const message = SMS_TEMPLATES.BOOKING_LINK(destination);
  return sendSMS(phoneNumber, message);
}

/**
 * Send visa information SMS
 */
export async function sendVisaInfoSMS(
  phoneNumber: string,
  passport: string,
  destination: string,
  visaRequired: boolean,
  details?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const message = SMS_TEMPLATES.VISA_INFO(passport, destination, visaRequired, details);
  return sendSMS(phoneNumber, message);
}

/**
 * Send follow-up SMS
 */
export async function sendFollowUpSMS(
  phoneNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const message = SMS_TEMPLATES.FOLLOW_UP();
  return sendSMS(phoneNumber, message);
}

/**
 * Check if SMS is enabled (all required config present)
 */
export function isSMSEnabled(): boolean {
  return !!(
    config.twilio.accountSid && 
    config.twilio.authToken && 
    (config.twilio.messagingServiceSid || config.twilio.phoneNumber)
  );
}

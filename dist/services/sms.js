"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMS_TEMPLATES = void 0;
exports.sendSMS = sendSMS;
exports.sendBookingLinkSMS = sendBookingLinkSMS;
exports.sendVisaInfoSMS = sendVisaInfoSMS;
exports.sendFollowUpSMS = sendFollowUpSMS;
exports.isSMSEnabled = isSMSEnabled;
const twilio_1 = __importDefault(require("twilio"));
const config_js_1 = require("../config.js");
// Initialize Twilio client
const twilioClient = (0, twilio_1.default)(config_js_1.config.twilio.accountSid, config_js_1.config.twilio.authToken);
/**
 * SMS Message Templates
 */
exports.SMS_TEMPLATES = {
    // Booking link after flight inquiry
    BOOKING_LINK: (destination) => `Thanks for calling Diaspora AI! 🌍✈️\n\n${destination ? `Ready to book your trip to ${destination}? ` : ''}Visit us at https://diasporaai.dev to search and book flights.\n\nSafe travels! ✨`,
    // Visa requirements summary
    VISA_INFO: (passport, destination, visaRequired, details) => {
        const visaStatus = visaRequired ? '⚠️ Visa Required' : '✅ Visa Free';
        return `Diaspora AI Visa Info 🛂\n\n${passport} → ${destination}\n${visaStatus}\n\n${details || ''}\n\nBook your trip: https://diasporaai.dev`;
    },
    // General follow-up
    FOLLOW_UP: () => `Thanks for calling Diaspora AI! 🌍\n\nNeed help with flights or visa info? Visit https://diasporaai.dev or call us anytime.\n\nSafe travels! ✨`,
    // Confirmation of booking interest
    BOOKING_INTEREST: (route) => `Thanks for your interest in ${route}! 🌍✈️\n\nOur team will be in touch shortly. You can also book directly at https://diasporaai.dev\n\nDiaspora AI - Travel Made Easy`,
};
/**
 * Send an SMS to a phone number
 * Uses Messaging Service SID for alpha sender ID support
 */
async function sendSMS(to, message, options) {
    try {
        // Clean the phone number (ensure it has + prefix)
        const cleanedTo = to.startsWith('+') ? to : `+${to}`;
        console.log(`📱 Sending SMS to ${cleanedTo.substring(0, 6)}****`);
        // Build message options
        const messageOptions = {
            to: cleanedTo,
            body: message,
        };
        // Use Messaging Service SID for alpha sender ID
        if (config_js_1.config.twilio.messagingServiceSid) {
            messageOptions.messagingServiceSid = config_js_1.config.twilio.messagingServiceSid;
            console.log(`📱 Using Messaging Service: ${config_js_1.config.twilio.messagingServiceSid}`);
        }
        else if (config_js_1.config.twilio.phoneNumber) {
            // Fallback to phone number if no messaging service
            messageOptions.from = config_js_1.config.twilio.phoneNumber;
        }
        else {
            throw new Error('No messaging service or phone number configured');
        }
        const result = await twilioClient.messages.create(messageOptions);
        console.log(`✅ SMS sent successfully! SID: ${result.sid}`);
        return {
            success: true,
            messageSid: result.sid,
        };
    }
    catch (error) {
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
async function sendBookingLinkSMS(phoneNumber, destination) {
    const message = exports.SMS_TEMPLATES.BOOKING_LINK(destination);
    return sendSMS(phoneNumber, message);
}
/**
 * Send visa information SMS
 */
async function sendVisaInfoSMS(phoneNumber, passport, destination, visaRequired, details) {
    const message = exports.SMS_TEMPLATES.VISA_INFO(passport, destination, visaRequired, details);
    return sendSMS(phoneNumber, message);
}
/**
 * Send follow-up SMS
 */
async function sendFollowUpSMS(phoneNumber) {
    const message = exports.SMS_TEMPLATES.FOLLOW_UP();
    return sendSMS(phoneNumber, message);
}
/**
 * Check if SMS is enabled (all required config present)
 */
function isSMSEnabled() {
    return !!(config_js_1.config.twilio.accountSid &&
        config_js_1.config.twilio.authToken &&
        (config_js_1.config.twilio.messagingServiceSid || config_js_1.config.twilio.phoneNumber));
}
//# sourceMappingURL=sms.js.map
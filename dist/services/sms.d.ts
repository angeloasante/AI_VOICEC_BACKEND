/**
 * SMS Message Templates
 */
export declare const SMS_TEMPLATES: {
    BOOKING_LINK: (destination?: string) => string;
    VISA_INFO: (passport: string, destination: string, visaRequired: boolean, details?: string) => string;
    FOLLOW_UP: () => string;
    BOOKING_INTEREST: (route: string) => string;
};
/**
 * Send an SMS to a phone number
 * Uses Messaging Service SID for alpha sender ID support
 */
export declare function sendSMS(to: string, message: string, options?: {
    useAlphaSender?: boolean;
}): Promise<{
    success: boolean;
    messageSid?: string;
    error?: string;
}>;
/**
 * Send booking link SMS after a call
 */
export declare function sendBookingLinkSMS(phoneNumber: string, destination?: string): Promise<{
    success: boolean;
    messageSid?: string;
    error?: string;
}>;
/**
 * Send visa information SMS
 */
export declare function sendVisaInfoSMS(phoneNumber: string, passport: string, destination: string, visaRequired: boolean, details?: string): Promise<{
    success: boolean;
    messageSid?: string;
    error?: string;
}>;
/**
 * Send follow-up SMS
 */
export declare function sendFollowUpSMS(phoneNumber: string): Promise<{
    success: boolean;
    messageSid?: string;
    error?: string;
}>;
/**
 * Check if SMS is enabled (all required config present)
 */
export declare function isSMSEnabled(): boolean;
//# sourceMappingURL=sms.d.ts.map
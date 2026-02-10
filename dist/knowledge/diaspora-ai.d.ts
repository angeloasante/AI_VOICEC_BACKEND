import type { BusinessKnowledge } from '../types.js';
/**
 * Diaspora AI - AI-powered travel booking platform for the African diaspora
 */
export declare const diasporaAIBusiness: BusinessKnowledge;
/**
 * Get business context for AI prompts
 */
export declare function getBusinessContext(): string;
/**
 * Call the Diaspora AI Visa API to get visa requirements
 */
export declare function checkVisaRequirements(fromCountry: string, toCountry: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}>;
/**
 * Format visa requirements into a natural speech response
 */
export declare function formatVisaResponse(visaData: any): string;
export declare const countryCodeMap: {
    [key: string]: string;
};
/**
 * Extract country code from natural language
 */
export declare function parseCountryCode(input: string): string | null;
//# sourceMappingURL=diaspora-ai.d.ts.map
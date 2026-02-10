/**
 * Generate a response using Gemini AI
 * Streams the response for lower latency
 */
export declare function generateResponse(streamSid: string, userMessage: string, onChunk: (text: string) => void | Promise<void>): Promise<string>;
/**
 * Generate a greeting for the start of a call
 */
export declare function generateGreeting(streamSid: string): Promise<string>;
//# sourceMappingURL=brain.d.ts.map
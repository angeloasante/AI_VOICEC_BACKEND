/**
 * Generate a response using Gemini AI
 * Streams the response for lower latency
 * Returns { response: string, shouldEndCall: boolean }
 */
export declare function generateResponse(streamSid: string, userMessage: string, onChunk: (text: string) => void | Promise<void>): Promise<{
    response: string;
    shouldEndCall: boolean;
}>;
/**
 * Generate a greeting for the start of a call
 */
export declare function generateGreeting(streamSid: string): Promise<string>;
//# sourceMappingURL=brain.d.ts.map
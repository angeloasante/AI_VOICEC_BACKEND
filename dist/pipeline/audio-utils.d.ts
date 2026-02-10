/**
 * Audio format conversion utilities
 * Twilio uses 8-bit mulaw at 8kHz
 * Deepgram expects 16-bit linear PCM at 16kHz (or 8kHz for telephony)
 */
/**
 * Convert 8-bit mulaw audio to 16-bit linear PCM
 */
export declare function mulawToLinear16(mulawBuffer: Buffer): Buffer;
/**
 * Encode 16-bit linear PCM to 8-bit mulaw
 */
export declare function linear16ToMulaw(linear16Buffer: Buffer): Buffer;
/**
 * Convert base64-encoded mulaw to linear16 buffer
 */
export declare function base64MulawToLinear16(base64Audio: string): Buffer;
/**
 * Convert linear16 buffer to base64-encoded mulaw
 */
export declare function linear16ToBase64Mulaw(linear16Buffer: Buffer): string;
/**
 * Convert raw audio bytes to base64 for Twilio Media Stream
 */
export declare function audioToTwilioPayload(audioBuffer: Buffer, inputFormat: 'linear16' | 'mulaw'): string;
//# sourceMappingURL=audio-utils.d.ts.map
"use strict";
/**
 * Audio format conversion utilities
 * Twilio uses 8-bit mulaw at 8kHz
 * Deepgram expects 16-bit linear PCM at 16kHz (or 8kHz for telephony)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mulawToLinear16 = mulawToLinear16;
exports.linear16ToMulaw = linear16ToMulaw;
exports.base64MulawToLinear16 = base64MulawToLinear16;
exports.linear16ToBase64Mulaw = linear16ToBase64Mulaw;
exports.audioToTwilioPayload = audioToTwilioPayload;
// Mulaw decoding table
const MULAW_DECODE_TABLE = [
    -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
    -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
    -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
    -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
    -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
    -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
    -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
    -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
    -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
    -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
    -876, -844, -812, -780, -748, -716, -684, -652,
    -620, -588, -556, -524, -492, -460, -428, -396,
    -372, -356, -340, -324, -308, -292, -276, -260,
    -244, -228, -212, -196, -180, -164, -148, -132,
    -120, -112, -104, -96, -88, -80, -72, -64,
    -56, -48, -40, -32, -24, -16, -8, 0,
    32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
    23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
    15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
    11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
    7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
    5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
    3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
    2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
    1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
    1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
    876, 844, 812, 780, 748, 716, 684, 652,
    620, 588, 556, 524, 492, 460, 428, 396,
    372, 356, 340, 324, 308, 292, 276, 260,
    244, 228, 212, 196, 180, 164, 148, 132,
    120, 112, 104, 96, 88, 80, 72, 64,
    56, 48, 40, 32, 24, 16, 8, 0
];
/**
 * Convert 8-bit mulaw audio to 16-bit linear PCM
 */
function mulawToLinear16(mulawBuffer) {
    const linear16Buffer = Buffer.alloc(mulawBuffer.length * 2);
    for (let i = 0; i < mulawBuffer.length; i++) {
        const mulawByte = mulawBuffer[i];
        const linear16Value = MULAW_DECODE_TABLE[mulawByte];
        linear16Buffer.writeInt16LE(linear16Value, i * 2);
    }
    return linear16Buffer;
}
/**
 * Encode 16-bit linear PCM to 8-bit mulaw
 */
function linear16ToMulaw(linear16Buffer) {
    const mulawBuffer = Buffer.alloc(linear16Buffer.length / 2);
    for (let i = 0; i < mulawBuffer.length; i++) {
        const sample = linear16Buffer.readInt16LE(i * 2);
        mulawBuffer[i] = encodeMulawSample(sample);
    }
    return mulawBuffer;
}
/**
 * Encode a single 16-bit sample to 8-bit mulaw
 */
function encodeMulawSample(sample) {
    const MULAW_MAX = 0x1FFF;
    const MULAW_BIAS = 33;
    // Get the sign bit
    const sign = (sample >> 8) & 0x80;
    // Get magnitude
    if (sign !== 0) {
        sample = -sample;
    }
    // Add bias
    sample = sample + MULAW_BIAS;
    // Clip to max
    if (sample > MULAW_MAX) {
        sample = MULAW_MAX;
    }
    // Find the segment
    let exponent = 7;
    let expMask = 0x4000;
    while ((sample & expMask) === 0 && exponent > 0) {
        exponent--;
        expMask >>= 1;
    }
    // Get the mantissa
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    // Combine and invert
    const mulawByte = ~(sign | (exponent << 4) | mantissa);
    return mulawByte & 0xFF;
}
/**
 * Convert base64-encoded mulaw to linear16 buffer
 */
function base64MulawToLinear16(base64Audio) {
    const mulawBuffer = Buffer.from(base64Audio, 'base64');
    return mulawToLinear16(mulawBuffer);
}
/**
 * Convert linear16 buffer to base64-encoded mulaw
 */
function linear16ToBase64Mulaw(linear16Buffer) {
    const mulawBuffer = linear16ToMulaw(linear16Buffer);
    return mulawBuffer.toString('base64');
}
/**
 * Convert raw audio bytes to base64 for Twilio Media Stream
 */
function audioToTwilioPayload(audioBuffer, inputFormat) {
    if (inputFormat === 'linear16') {
        return linear16ToBase64Mulaw(audioBuffer);
    }
    return audioBuffer.toString('base64');
}
//# sourceMappingURL=audio-utils.js.map
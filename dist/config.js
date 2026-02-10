"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    // Twilio
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    // Deepgram - Real-time Speech-to-Text
    deepgram: {
        apiKey: process.env.DEEPGRAM_API_KEY || '',
        model: 'nova-2',
        language: 'en-GB',
    },
    // Gemini - AI Brain
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.0-flash-exp',
    },
    // ElevenLabs - Text-to-Speech
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Default: Sarah
        modelId: 'eleven_turbo_v2_5',
    },
};
// Validate required environment variables
function validateConfig() {
    const required = [
        ['TWILIO_ACCOUNT_SID', exports.config.twilio.accountSid],
        ['TWILIO_AUTH_TOKEN', exports.config.twilio.authToken],
        ['DEEPGRAM_API_KEY', exports.config.deepgram.apiKey],
        ['GEMINI_API_KEY', exports.config.gemini.apiKey],
        ['ELEVENLABS_API_KEY', exports.config.elevenlabs.apiKey],
    ];
    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
        console.warn('Some features may not work correctly.');
    }
}
//# sourceMappingURL=config.js.map
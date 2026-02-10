import dotenv from 'dotenv';

dotenv.config();

export const config = {
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
    model: 'gemini-2.0-flash',
  },
  
  // ElevenLabs - Text-to-Speech
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'qVp1puw1HjHIbF91A9Xi', // Diaspora AI voice
    modelId: 'eleven_turbo_v2_5',
  },
  
  // Diaspora AI - Visa API
  diasporaAI: {
    visaApiKey: process.env.DIASPORA_AI_VISA_API_KEY || '',
    visaApiUrl: 'https://app.diasporaai.dev/api/v1/visa',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    ['TWILIO_ACCOUNT_SID', config.twilio.accountSid],
    ['TWILIO_AUTH_TOKEN', config.twilio.authToken],
    ['DEEPGRAM_API_KEY', config.deepgram.apiKey],
    ['GEMINI_API_KEY', config.gemini.apiKey],
    ['ELEVENLABS_API_KEY', config.elevenlabs.apiKey],
  ];
  
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }
}

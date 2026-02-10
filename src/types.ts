// Twilio Media Stream message types
export interface TwilioMediaMessage {
  event: 'connected' | 'start' | 'media' | 'stop' | 'mark';
  sequenceNumber?: string;
  streamSid?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64 encoded audio
  };
  mark?: {
    name: string;
  };
}

// Conversation message for AI context
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Call session state
export interface CallSession {
  callSid: string;
  streamSid: string;
  startTime: Date;
  conversationHistory: ConversationMessage[];
  isProcessing: boolean;
  currentTranscript: string;
}

// Business knowledge data
export interface BusinessKnowledge {
  name: string;
  type: string;
  description: string;
  hours: string;
  address: string;
  phone: string;
  website?: string;
  bookingApp?: string;
  menu?: MenuItem[];
  services?: ServiceInfo[];
  paymentMethods?: PaymentMethods;
  popularRoutes?: Route[];
  founder?: string;
  founded?: string;
  specialties?: string[];
  faq?: FAQ[];
  faqs?: FAQ[];
  policies?: string[];
}

export interface MenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
  options?: string[];
}

export interface ServiceInfo {
  name: string;
  description: string;
  features?: string[];
  duration?: string;
  price?: number;
}

export interface PaymentMethods {
  cards: string[];
  mobileMoney: string[];
  other: string[];
}

export interface Route {
  from: string;
  to: string;
  airlines: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

// Deepgram transcript result
export interface DeepgramResult {
  type: string;
  channel_index: number[];
  duration: number;
  start: number;
  is_final: boolean;
  speech_final: boolean;
  channel: {
    alternatives: {
      transcript: string;
      confidence: number;
      words: {
        word: string;
        start: number;
        end: number;
        confidence: number;
      }[];
    }[];
  };
}

// Audio chunk for processing
export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  format: 'mulaw' | 'linear16';
}

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
        payload: string;
    };
    mark?: {
        name: string;
    };
}
export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export interface CallSession {
    callSid: string;
    streamSid: string;
    startTime: Date;
    conversationHistory: ConversationMessage[];
    isProcessing: boolean;
    currentTranscript: string;
}
export interface BusinessKnowledge {
    name: string;
    type: string;
    description: string;
    hours: string;
    address: string;
    phone: string;
    menu?: MenuItem[];
    services?: Service[];
    faqs: FAQ[];
    policies: string[];
}
export interface MenuItem {
    name: string;
    description: string;
    price: number;
    category: string;
    options?: string[];
}
export interface Service {
    name: string;
    description: string;
    duration: string;
    price: number;
}
export interface FAQ {
    question: string;
    answer: string;
}
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
export interface AudioChunk {
    data: Buffer;
    timestamp: number;
    format: 'mulaw' | 'linear16';
}
//# sourceMappingURL=types.d.ts.map
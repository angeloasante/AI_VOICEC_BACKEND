import { EventEmitter } from 'events';
/**
 * Deepgram real-time transcriber
 * Connects via WebSocket and streams audio for live transcription
 */
export declare class Transcriber extends EventEmitter {
    private ws;
    private streamSid;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor(streamSid: string);
    /**
     * Connect to Deepgram WebSocket API
     */
    connect(): Promise<void>;
    /**
     * Send audio chunk to Deepgram
     */
    sendAudio(audioBuffer: Buffer): void;
    /**
     * Handle transcript results from Deepgram
     */
    private handleTranscriptResult;
    /**
     * Close the connection gracefully
     */
    close(): void;
    /**
     * Check if connected
     */
    isActive(): boolean;
}
//# sourceMappingURL=transcriber.d.ts.map
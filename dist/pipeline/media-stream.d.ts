import WebSocket from 'ws';
import { EventEmitter } from 'events';
/**
 * Handles a single Twilio Media Stream WebSocket connection
 * Orchestrates the full voice pipeline: audio in → transcription → AI → TTS → audio out
 */
export declare class MediaStreamHandler extends EventEmitter {
    private ws;
    private streamSid;
    private callSid;
    private transcriber;
    private synthesizer;
    private audioQueue;
    private isSending;
    private markCounter;
    constructor(ws: WebSocket);
    /**
     * Set up WebSocket event handlers
     */
    private setupWebSocket;
    /**
     * Handle incoming Twilio Media Stream messages
     */
    private handleMessage;
    /**
     * Handle stream start - initialize transcriber and send greeting
     */
    private handleStart;
    /**
     * Handle incoming audio from Twilio
     */
    private handleMedia;
    /**
     * Handle mark events (audio playback completion)
     */
    private handleMark;
    /**
     * Handle completed transcript - generate and speak response
     */
    private handleTranscript;
    /**
     * Synthesize text and send audio to Twilio
     */
    private speakResponse;
    /**
     * Queue audio chunk for sending to Twilio
     */
    private queueAudio;
    /**
     * Flush all queued audio to Twilio
     */
    private flushAudioQueue;
    /**
     * Process the audio queue and send to Twilio
     */
    private processAudioQueue;
    /**
     * Clear the audio queue (for interruption handling)
     */
    private clearAudioQueue;
    /**
     * Handle barge-in: user started speaking, stop AI immediately
     */
    private handleBargeIn;
    /**
     * Clean up resources
     */
    private cleanup;
}
//# sourceMappingURL=media-stream.d.ts.map
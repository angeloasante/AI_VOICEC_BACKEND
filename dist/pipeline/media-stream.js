"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaStreamHandler = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const transcriber_js_1 = require("./transcriber.js");
const synthesizer_js_1 = require("./synthesizer.js");
const brain_js_1 = require("./brain.js");
const call_session_js_1 = require("./call-session.js");
/**
 * Handles a single Twilio Media Stream WebSocket connection
 * Orchestrates the full voice pipeline: audio in → transcription → AI → TTS → audio out
 */
class MediaStreamHandler extends events_1.EventEmitter {
    ws;
    streamSid = null;
    callSid = null;
    transcriber = null;
    synthesizer = null;
    audioQueue = [];
    isSending = false;
    markCounter = 0;
    constructor(ws) {
        super();
        this.ws = ws;
        this.setupWebSocket();
    }
    /**
     * Set up WebSocket event handlers
     */
    setupWebSocket() {
        this.ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                await this.handleMessage(message);
            }
            catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });
        this.ws.on('close', () => {
            console.log('📴 Twilio WebSocket closed');
            this.cleanup();
        });
        this.ws.on('error', (error) => {
            console.error('❌ Twilio WebSocket error:', error);
            this.cleanup();
        });
    }
    /**
     * Handle incoming Twilio Media Stream messages
     */
    async handleMessage(message) {
        switch (message.event) {
            case 'connected':
                console.log('🔗 Twilio Media Stream connected');
                break;
            case 'start':
                await this.handleStart(message);
                break;
            case 'media':
                this.handleMedia(message);
                break;
            case 'mark':
                this.handleMark(message);
                break;
            case 'stop':
                console.log('🛑 Twilio Media Stream stopped');
                this.cleanup();
                break;
        }
    }
    /**
     * Handle stream start - initialize transcriber and send greeting
     */
    async handleStart(message) {
        if (!message.start)
            return;
        this.streamSid = message.start.streamSid;
        this.callSid = message.start.callSid;
        console.log(`📞 Call started - SID: ${this.callSid}, Stream: ${this.streamSid}`);
        // Create session
        (0, call_session_js_1.createSession)(this.callSid, this.streamSid);
        // Initialize components
        this.synthesizer = new synthesizer_js_1.Synthesizer(this.streamSid);
        this.transcriber = new transcriber_js_1.Transcriber(this.streamSid);
        // Set up transcriber events
        this.transcriber.on('transcript', async (result) => {
            await this.handleTranscript(result.transcript);
        });
        this.transcriber.on('interim', (result) => {
            // Could emit interim results for real-time feedback
            // console.log(`🎤 Interim: ${result.transcript}`);
        });
        this.transcriber.on('error', (error) => {
            console.error('🎤 Transcriber error:', error);
        });
        // Connect to Deepgram
        try {
            await this.transcriber.connect();
        }
        catch (error) {
            console.error('Failed to connect to Deepgram:', error);
            return;
        }
        // Send greeting
        const greeting = await (0, brain_js_1.generateGreeting)(this.streamSid);
        await this.speakResponse(greeting);
    }
    /**
     * Handle incoming audio from Twilio
     */
    handleMedia(message) {
        if (!message.media || !this.transcriber)
            return;
        // Decode base64 audio and send to transcriber
        const audioBuffer = Buffer.from(message.media.payload, 'base64');
        this.transcriber.sendAudio(audioBuffer);
    }
    /**
     * Handle mark events (audio playback completion)
     */
    handleMark(message) {
        // Mark indicates that a chunk of audio has finished playing
        // Only log significant marks to reduce noise
        const markName = message.mark?.name || '';
        if (markName.includes('end')) {
            console.log(`✓ Audio playback complete: ${markName}`);
        }
    }
    /**
     * Handle completed transcript - generate and speak response
     */
    async handleTranscript(transcript) {
        if (!this.streamSid)
            return;
        // Prevent overlapping responses
        if ((0, call_session_js_1.isProcessing)(this.streamSid)) {
            console.log('⏳ Already processing, queuing transcript...');
            return;
        }
        (0, call_session_js_1.setProcessing)(this.streamSid, true);
        try {
            // Clear any queued audio (interrupt current speech)
            this.clearAudioQueue();
            // Generate AI response with streaming
            await (0, brain_js_1.generateResponse)(this.streamSid, transcript, async (textChunk) => {
                // Synthesize and queue each text chunk
                await this.speakResponse(textChunk);
            });
        }
        catch (error) {
            console.error('Error processing transcript:', error);
        }
        finally {
            (0, call_session_js_1.setProcessing)(this.streamSid, false);
        }
    }
    /**
     * Synthesize text and send audio to Twilio
     */
    async speakResponse(text) {
        if (!this.synthesizer || !this.streamSid)
            return;
        try {
            await this.synthesizer.synthesize(text, (audioChunk) => {
                this.queueAudio(audioChunk);
            });
            // Flush all audio after TTS completes for this text segment
            this.flushAudioQueue();
        }
        catch (error) {
            console.error('Error synthesizing speech:', error);
        }
    }
    /**
     * Queue audio chunk for sending to Twilio
     */
    queueAudio(audioBase64) {
        this.audioQueue.push(audioBase64);
        // Don't process immediately - let audio batch up
    }
    /**
     * Flush all queued audio to Twilio
     */
    flushAudioQueue() {
        if (this.audioQueue.length === 0)
            return;
        if (this.ws.readyState !== ws_1.default.OPEN)
            return;
        let chunksSent = 0;
        while (this.audioQueue.length > 0) {
            const audioChunk = this.audioQueue.shift();
            // Send media message to Twilio
            const mediaMessage = {
                event: 'media',
                streamSid: this.streamSid,
                media: {
                    payload: audioChunk,
                },
            };
            this.ws.send(JSON.stringify(mediaMessage));
            chunksSent++;
        }
        // Send ONE mark at the end to track when all audio finishes
        this.markCounter++;
        const markMessage = {
            event: 'mark',
            streamSid: this.streamSid,
            mark: {
                name: `response-end-${this.markCounter}`,
            },
        };
        this.ws.send(JSON.stringify(markMessage));
        console.log(`📤 Sent ${chunksSent} audio chunks to Twilio`);
    }
    /**
     * Process the audio queue and send to Twilio
     */
    processAudioQueue() {
        if (this.isSending || this.audioQueue.length === 0)
            return;
        if (this.ws.readyState !== ws_1.default.OPEN)
            return;
        this.isSending = true;
        while (this.audioQueue.length > 0) {
            const audioChunk = this.audioQueue.shift();
            // Send media message to Twilio
            const mediaMessage = {
                event: 'media',
                streamSid: this.streamSid,
                media: {
                    payload: audioChunk,
                },
            };
            this.ws.send(JSON.stringify(mediaMessage));
        }
        // Send a mark to track when audio finishes playing
        this.markCounter++;
        const markMessage = {
            event: 'mark',
            streamSid: this.streamSid,
            mark: {
                name: `response-${this.markCounter}`,
            },
        };
        this.ws.send(JSON.stringify(markMessage));
        this.isSending = false;
    }
    /**
     * Clear the audio queue (for interruption handling)
     */
    clearAudioQueue() {
        this.audioQueue = [];
        // Send clear message to Twilio to stop current playback
        if (this.ws.readyState === ws_1.default.OPEN && this.streamSid) {
            const clearMessage = {
                event: 'clear',
                streamSid: this.streamSid,
            };
            this.ws.send(JSON.stringify(clearMessage));
        }
    }
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.transcriber) {
            this.transcriber.close();
            this.transcriber = null;
        }
        if (this.streamSid) {
            (0, call_session_js_1.endSession)(this.streamSid);
        }
        this.audioQueue = [];
        this.emit('ended');
    }
}
exports.MediaStreamHandler = MediaStreamHandler;
//# sourceMappingURL=media-stream.js.map
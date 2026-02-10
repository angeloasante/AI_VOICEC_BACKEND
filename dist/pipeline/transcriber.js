"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transcriber = void 0;
const ws_1 = __importDefault(require("ws"));
const config_js_1 = require("../config.js");
const events_1 = require("events");
/**
 * Deepgram real-time transcriber
 * Connects via WebSocket and streams audio for live transcription
 */
class Transcriber extends events_1.EventEmitter {
    ws = null;
    streamSid;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 3;
    constructor(streamSid) {
        super();
        this.streamSid = streamSid;
    }
    /**
     * Connect to Deepgram WebSocket API
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (!config_js_1.config.deepgram.apiKey) {
                reject(new Error('Deepgram API key not configured'));
                return;
            }
            const url = new URL('wss://api.deepgram.com/v1/listen');
            // Configure for telephony audio (8kHz mulaw from Twilio)
            url.searchParams.set('encoding', 'mulaw');
            url.searchParams.set('sample_rate', '8000');
            url.searchParams.set('channels', '1');
            url.searchParams.set('model', config_js_1.config.deepgram.model);
            url.searchParams.set('language', config_js_1.config.deepgram.language);
            url.searchParams.set('punctuate', 'true');
            url.searchParams.set('interim_results', 'true');
            url.searchParams.set('endpointing', '300'); // 300ms silence = end of speech
            url.searchParams.set('utterance_end_ms', '1000');
            console.log(`🎤 Connecting to Deepgram for stream ${this.streamSid}...`);
            this.ws = new ws_1.default(url.toString(), {
                headers: {
                    Authorization: `Token ${config_js_1.config.deepgram.apiKey}`,
                },
            });
            this.ws.on('open', () => {
                console.log(`🎤 Deepgram connected for stream ${this.streamSid}`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    this.handleTranscriptResult(response);
                }
                catch (err) {
                    console.error('Error parsing Deepgram response:', err);
                }
            });
            this.ws.on('error', (error) => {
                console.error(`🎤 Deepgram WebSocket error:`, error);
                this.emit('error', error);
            });
            this.ws.on('close', (code, reason) => {
                console.log(`🎤 Deepgram disconnected (code: ${code}, reason: ${reason.toString()})`);
                this.isConnected = false;
                this.emit('disconnected');
                // Attempt reconnect if not intentional close
                if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🎤 Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => this.connect(), 1000);
                }
            });
            // Timeout for initial connection
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Deepgram connection timeout'));
                }
            }, 10000);
        });
    }
    /**
     * Send audio chunk to Deepgram
     */
    sendAudio(audioBuffer) {
        if (this.ws && this.isConnected && this.ws.readyState === ws_1.default.OPEN) {
            this.ws.send(audioBuffer);
        }
    }
    /**
     * Handle transcript results from Deepgram
     */
    handleTranscriptResult(response) {
        // Check for transcript results
        if (response.type === 'Results' && response.channel?.alternatives?.[0]) {
            const alternative = response.channel.alternatives[0];
            const transcript = alternative.transcript?.trim();
            if (transcript) {
                const result = {
                    transcript,
                    confidence: alternative.confidence,
                    isFinal: response.is_final,
                    speechFinal: response.speech_final,
                };
                // Emit interim results for real-time feedback
                if (!result.isFinal) {
                    this.emit('interim', result);
                }
                // Emit final result when speech segment is complete
                if (result.speechFinal && transcript.length > 0) {
                    console.log(`🎤 Final transcript: "${transcript}"`);
                    this.emit('transcript', result);
                }
            }
        }
        // Handle utterance end (silence detected)
        if (response.type === 'UtteranceEnd') {
            this.emit('utteranceEnd');
        }
    }
    /**
     * Close the connection gracefully
     */
    close() {
        if (this.ws) {
            // Send close frame to Deepgram
            if (this.isConnected && this.ws.readyState === ws_1.default.OPEN) {
                this.ws.send(JSON.stringify({ type: 'CloseStream' }));
            }
            this.ws.close(1000, 'Session ended');
            this.ws = null;
            this.isConnected = false;
        }
    }
    /**
     * Check if connected
     */
    isActive() {
        return this.isConnected && this.ws?.readyState === ws_1.default.OPEN;
    }
}
exports.Transcriber = Transcriber;
//# sourceMappingURL=transcriber.js.map
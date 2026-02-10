"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Synthesizer = void 0;
const config_js_1 = require("../config.js");
/**
 * Text-to-Speech synthesizer using ElevenLabs
 */
class Synthesizer {
    streamSid;
    constructor(streamSid) {
        this.streamSid = streamSid;
    }
    /**
     * Synthesize text to speech and return audio chunks
     * Uses ElevenLabs streaming API for low latency
     */
    async synthesize(text, onAudioChunk) {
        if (!config_js_1.config.elevenlabs.apiKey) {
            console.warn('⚠️ ElevenLabs API key not configured');
            return;
        }
        const startTime = Date.now();
        try {
            // Use ElevenLabs streaming endpoint
            // CRITICAL: output_format must be in query params, NOT body (per ElevenLabs docs)
            const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${config_js_1.config.elevenlabs.voiceId}/stream`);
            url.searchParams.set('output_format', 'ulaw_8000'); // 8kHz mulaw - native Twilio format
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': config_js_1.config.elevenlabs.apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: config_js_1.config.elevenlabs.modelId,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true,
                    },
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
            }
            if (!response.body) {
                throw new Error('No response body from ElevenLabs');
            }
            // Process the streaming audio response
            const reader = response.body.getReader();
            let audioBuffer = Buffer.alloc(0);
            // Buffer into larger chunks: 8000 bytes = 1 second of audio at 8kHz mulaw
            // Use 1600 bytes = 200ms chunks for good balance of latency and fewer chunks
            const CHUNK_SIZE = 1600;
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                // Append new data to buffer
                audioBuffer = Buffer.concat([audioBuffer, Buffer.from(value)]);
                // Process complete chunks
                while (audioBuffer.length >= CHUNK_SIZE) {
                    const chunk = audioBuffer.subarray(0, CHUNK_SIZE);
                    audioBuffer = audioBuffer.subarray(CHUNK_SIZE);
                    // Send as base64 directly - already in Twilio's native format
                    onAudioChunk(chunk.toString('base64'));
                }
            }
            // Process any remaining audio
            if (audioBuffer.length > 0) {
                onAudioChunk(audioBuffer.toString('base64'));
            }
            const latency = Date.now() - startTime;
            console.log(`🔊 TTS completed in ${latency}ms for: "${text.substring(0, 50)}..."`);
        }
        catch (error) {
            console.error('❌ ElevenLabs TTS error:', error);
            throw error;
        }
    }
    /**
     * Synthesize a simple response without streaming
     * Used for quick responses like greetings
     */
    async synthesizeSimple(text) {
        const chunks = [];
        await this.synthesize(text, (chunk) => chunks.push(chunk));
        return chunks;
    }
}
exports.Synthesizer = Synthesizer;
//# sourceMappingURL=synthesizer.js.map
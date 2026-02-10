/**
 * Text-to-Speech synthesizer using ElevenLabs
 */
export declare class Synthesizer {
    private streamSid;
    constructor(streamSid: string);
    /**
     * Synthesize text to speech and return audio chunks
     * Uses ElevenLabs streaming API for low latency
     */
    synthesize(text: string, onAudioChunk: (audioBase64: string) => void): Promise<void>;
    /**
     * Downsample from 16kHz to 8kHz (simple averaging)
     * Takes every other sample from 16-bit PCM audio
     */
    private downsample;
    /**
     * Synthesize a simple response without streaming
     * Used for quick responses like greetings
     */
    synthesizeSimple(text: string): Promise<string[]>;
}
//# sourceMappingURL=synthesizer.d.ts.map
import { config } from '../config.js';

/**
 * Text-to-Speech synthesizer using ElevenLabs
 */
export class Synthesizer {
  private streamSid: string;

  constructor(streamSid: string) {
    this.streamSid = streamSid;
  }

  /**
   * Synthesize text to speech and return audio chunks
   * Uses ElevenLabs streaming API for low latency
   */
  async synthesize(
    text: string,
    onAudioChunk: (audioBase64: string) => void
  ): Promise<void> {
    if (!config.elevenlabs.apiKey) {
      console.warn('⚠️ ElevenLabs API key not configured');
      return;
    }

    const startTime = Date.now();

    try {
      // Use ElevenLabs streaming endpoint with ulaw_8000 for Twilio compatibility
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabs.voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': config.elevenlabs.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: config.elevenlabs.modelId,
            output_format: 'ulaw_8000', // 8kHz mulaw - native Twilio format!
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

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
      const CHUNK_SIZE = 160; // 160 bytes = 20ms at 8kHz mulaw

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Append new data to buffer
        audioBuffer = Buffer.concat([audioBuffer, Buffer.from(value)]);

        // Process complete chunks - no conversion needed, already mulaw 8kHz!
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

    } catch (error) {
      console.error('❌ ElevenLabs TTS error:', error);
      throw error;
    }
  }

  /**
   * Synthesize a simple response without streaming
   * Used for quick responses like greetings
   */
  async synthesizeSimple(text: string): Promise<string[]> {
    const chunks: string[] = [];
    await this.synthesize(text, (chunk) => chunks.push(chunk));
    return chunks;
  }
}

import { config } from '../config.js';
import { linear16ToMulaw } from './audio-utils.js';

interface ElevenLabsStreamResponse {
  audio: Buffer;
}

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
      // Use ElevenLabs streaming endpoint
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
            output_format: 'pcm_16000', // 16kHz 16-bit PCM
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
      const CHUNK_SIZE = 640; // 640 bytes = 320 samples at 16-bit = 20ms at 16kHz

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Append new data to buffer
        audioBuffer = Buffer.concat([audioBuffer, Buffer.from(value)]);

        // Process complete chunks
        while (audioBuffer.length >= CHUNK_SIZE) {
          const chunk = audioBuffer.subarray(0, CHUNK_SIZE);
          audioBuffer = audioBuffer.subarray(CHUNK_SIZE);

          // Downsample from 16kHz to 8kHz for Twilio
          const downsampled = this.downsample(chunk);
          
          // Convert to mulaw for Twilio
          const mulawChunk = linear16ToMulaw(downsampled);
          
          // Send as base64
          onAudioChunk(mulawChunk.toString('base64'));
        }
      }

      // Process any remaining audio
      if (audioBuffer.length > 0) {
        // Pad to complete chunk if needed
        const padded = Buffer.alloc(CHUNK_SIZE);
        audioBuffer.copy(padded);
        
        const downsampled = this.downsample(padded);
        const mulawChunk = linear16ToMulaw(downsampled);
        onAudioChunk(mulawChunk.toString('base64'));
      }

      const latency = Date.now() - startTime;
      console.log(`🔊 TTS completed in ${latency}ms for: "${text.substring(0, 50)}..."`);

    } catch (error) {
      console.error('❌ ElevenLabs TTS error:', error);
      throw error;
    }
  }

  /**
   * Downsample from 16kHz to 8kHz (simple averaging)
   * Takes every other sample from 16-bit PCM audio
   */
  private downsample(input: Buffer): Buffer {
    const output = Buffer.alloc(input.length / 2);
    
    for (let i = 0, j = 0; i < input.length - 3; i += 4, j += 2) {
      // Average two consecutive samples
      const sample1 = input.readInt16LE(i);
      const sample2 = input.readInt16LE(i + 2);
      const averaged = Math.round((sample1 + sample2) / 2);
      output.writeInt16LE(averaged, j);
    }
    
    return output;
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

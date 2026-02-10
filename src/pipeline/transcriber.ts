import WebSocket from 'ws';
import { config } from '../config.js';
import { EventEmitter } from 'events';

/**
 * Deepgram real-time transcriber
 * Connects via WebSocket and streams audio for live transcription
 */
export class Transcriber extends EventEmitter {
  private ws: WebSocket | null = null;
  private streamSid: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(streamSid: string) {
    super();
    this.streamSid = streamSid;
  }

  /**
   * Connect to Deepgram WebSocket API
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!config.deepgram.apiKey) {
        reject(new Error('Deepgram API key not configured'));
        return;
      }

      const url = new URL('wss://api.deepgram.com/v1/listen');
      
      // Configure for telephony audio (8kHz mulaw from Twilio)
      url.searchParams.set('encoding', 'mulaw');
      url.searchParams.set('sample_rate', '8000');
      url.searchParams.set('channels', '1');
      url.searchParams.set('model', config.deepgram.model);
      url.searchParams.set('language', config.deepgram.language);
      url.searchParams.set('punctuate', 'true');
      url.searchParams.set('interim_results', 'true');
      // Fast endpointing for responsive conversation
      url.searchParams.set('endpointing', '300'); // 300ms silence = end of speech
      url.searchParams.set('utterance_end_ms', '1000'); // 1000ms to finalize utterance
      url.searchParams.set('vad_events', 'true'); // Required for utterance_end_ms
      // Smart formatting for better recognition
      url.searchParams.set('smart_format', 'true');

      console.log(`🎤 Connecting to Deepgram for stream ${this.streamSid}...`);

      this.ws = new WebSocket(url.toString(), {
        headers: {
          Authorization: `Token ${config.deepgram.apiKey}`,
        },
      });

      this.ws.on('open', () => {
        console.log(`🎤 Deepgram connected for stream ${this.streamSid}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          this.handleTranscriptResult(response);
        } catch (err) {
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
  sendAudio(audioBuffer: Buffer): void {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioBuffer);
    }
  }

  /**
   * Handle transcript results from Deepgram
   */
  private handleTranscriptResult(response: any): void {
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
  close(): void {
    if (this.ws) {
      // Send close frame to Deepgram
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
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
  isActive(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

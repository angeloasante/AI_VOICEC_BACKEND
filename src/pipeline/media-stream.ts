import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { TwilioMediaMessage } from '../types.js';
import { Transcriber } from './transcriber.js';
import { Synthesizer } from './synthesizer.js';
import { generateResponse, generateGreeting } from './brain.js';
import {
  createSession,
  endSession,
  setProcessing,
  isProcessing,
} from './call-session.js';

/**
 * Handles a single Twilio Media Stream WebSocket connection
 * Orchestrates the full voice pipeline: audio in → transcription → AI → TTS → audio out
 */
export class MediaStreamHandler extends EventEmitter {
  private ws: WebSocket;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private transcriber: Transcriber | null = null;
  private synthesizer: Synthesizer | null = null;
  private audioQueue: string[] = [];
  private isSending = false;
  private markCounter = 0;

  constructor(ws: WebSocket) {
    super();
    this.ws = ws;
    this.setupWebSocket();
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocket(): void {
    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message: TwilioMediaMessage = JSON.parse(data.toString());
        await this.handleMessage(message);
      } catch (error) {
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
  private async handleMessage(message: TwilioMediaMessage): Promise<void> {
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
  private async handleStart(message: TwilioMediaMessage): Promise<void> {
    if (!message.start) return;

    this.streamSid = message.start.streamSid;
    this.callSid = message.start.callSid;

    console.log(`📞 Call started - SID: ${this.callSid}, Stream: ${this.streamSid}`);

    // Create session
    createSession(this.callSid, this.streamSid);

    // Initialize components
    this.synthesizer = new Synthesizer(this.streamSid);
    this.transcriber = new Transcriber(this.streamSid);

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
    } catch (error) {
      console.error('Failed to connect to Deepgram:', error);
      return;
    }

    // Send greeting
    const greeting = await generateGreeting(this.streamSid);
    await this.speakResponse(greeting);
  }

  /**
   * Handle incoming audio from Twilio
   */
  private handleMedia(message: TwilioMediaMessage): void {
    if (!message.media || !this.transcriber) return;

    // Decode base64 audio and send to transcriber
    const audioBuffer = Buffer.from(message.media.payload, 'base64');
    this.transcriber.sendAudio(audioBuffer);
  }

  /**
   * Handle mark events (audio playback completion)
   */
  private handleMark(message: TwilioMediaMessage): void {
    // Mark indicates that a chunk of audio has finished playing
    // We can use this to know when the AI has finished speaking
    console.log(`✓ Audio mark: ${message.mark?.name}`);
  }

  /**
   * Handle completed transcript - generate and speak response
   */
  private async handleTranscript(transcript: string): Promise<void> {
    if (!this.streamSid) return;

    // Prevent overlapping responses
    if (isProcessing(this.streamSid)) {
      console.log('⏳ Already processing, queuing transcript...');
      return;
    }

    setProcessing(this.streamSid, true);

    try {
      // Clear any queued audio (interrupt current speech)
      this.clearAudioQueue();

      // Generate AI response with streaming
      await generateResponse(
        this.streamSid,
        transcript,
        async (textChunk) => {
          // Synthesize and queue each text chunk
          await this.speakResponse(textChunk);
        }
      );
    } catch (error) {
      console.error('Error processing transcript:', error);
    } finally {
      setProcessing(this.streamSid, false);
    }
  }

  /**
   * Synthesize text and send audio to Twilio
   */
  private async speakResponse(text: string): Promise<void> {
    if (!this.synthesizer || !this.streamSid) return;

    try {
      await this.synthesizer.synthesize(text, (audioChunk) => {
        this.queueAudio(audioChunk);
      });
    } catch (error) {
      console.error('Error synthesizing speech:', error);
    }
  }

  /**
   * Queue audio chunk for sending to Twilio
   */
  private queueAudio(audioBase64: string): void {
    this.audioQueue.push(audioBase64);
    this.processAudioQueue();
  }

  /**
   * Process the audio queue and send to Twilio
   */
  private processAudioQueue(): void {
    if (this.isSending || this.audioQueue.length === 0) return;
    if (this.ws.readyState !== WebSocket.OPEN) return;

    this.isSending = true;

    while (this.audioQueue.length > 0) {
      const audioChunk = this.audioQueue.shift()!;
      
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
  private clearAudioQueue(): void {
    this.audioQueue = [];
    
    // Send clear message to Twilio to stop current playback
    if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
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
  private cleanup(): void {
    if (this.transcriber) {
      this.transcriber.close();
      this.transcriber = null;
    }

    if (this.streamSid) {
      endSession(this.streamSid);
    }

    this.audioQueue = [];
    this.emit('ended');
  }
}

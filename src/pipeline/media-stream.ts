import WebSocket from 'ws';
import { EventEmitter } from 'events';
import twilio from 'twilio';
import type { TwilioMediaMessage } from '../types.js';
import { Transcriber } from './transcriber.js';
import { Synthesizer } from './synthesizer.js';
import { generateResponse, generateGreeting } from './brain.js';
import {
  createSession,
  endSession,
  setProcessing,
  isProcessing,
  shouldEndCall,
} from './call-session.js';
import { config } from '../config.js';

// Initialize Twilio client for call management
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

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
    
    // Get caller phone from custom parameters (passed from webhook)
    const callerPhone = message.start.customParameters?.callerPhone;

    console.log(`📞 Call started - SID: ${this.callSid}, Stream: ${this.streamSid}`);

    // Create session with caller phone for SMS capability
    createSession(this.callSid, this.streamSid, callerPhone);

    // Initialize components
    this.synthesizer = new Synthesizer(this.streamSid);
    this.transcriber = new Transcriber(this.streamSid);

    // Set up transcriber events
    this.transcriber.on('transcript', async (result) => {
      await this.handleTranscript(result.transcript);
    });

    this.transcriber.on('interim', (result) => {
      // Barge-in detection: immediately stop AI speech when user starts talking
      // Only trigger on meaningful speech (not just "um", "uh", breathing noises)
      const transcript = result.transcript?.trim() || '';
      if (transcript.length > 3 && !/^(um+|uh+|ah+|oh+|hm+)$/i.test(transcript)) {
        this.handleBargeIn();
      }
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
    // Only log significant marks to reduce noise
    const markName = message.mark?.name || '';
    if (markName.includes('end')) {
      console.log(`✓ Audio playback complete: ${markName}`);
    }
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
      const result = await generateResponse(
        this.streamSid,
        transcript,
        async (textChunk) => {
          // Synthesize and queue each text chunk
          await this.speakResponse(textChunk);
        }
      );
      
      // Check if we should end the call after the response
      if (result.shouldEndCall && this.callSid) {
        console.log(`👋 Call ending after goodbye - waiting for audio to finish...`);
        
        // Wait a bit for audio to play, then end the call
        setTimeout(async () => {
          try {
            if (this.callSid) {
              console.log(`📞 Ending call: ${this.callSid}`);
              await twilioClient.calls(this.callSid).update({ status: 'completed' });
              console.log(`✅ Call ended successfully`);
            }
          } catch (error) {
            console.error('❌ Error ending call:', error);
          }
        }, 4000); // Wait 4 seconds for goodbye audio to play
      }
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
      // Flush all audio after TTS completes for this text segment
      this.flushAudioQueue();
    } catch (error) {
      console.error('Error synthesizing speech:', error);
    }
  }

  /**
   * Queue audio chunk for sending to Twilio
   */
  private queueAudio(audioBase64: string): void {
    this.audioQueue.push(audioBase64);
    // Don't process immediately - let audio batch up
  }

  /**
   * Flush all queued audio to Twilio
   */
  private flushAudioQueue(): void {
    if (this.audioQueue.length === 0) return;
    if (this.ws.readyState !== WebSocket.OPEN) return;

    let chunksSent = 0;
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
   * Handle barge-in: user started speaking, stop AI immediately
   */
  private handleBargeIn(): void {
    // Only interrupt if we're currently speaking (have queued audio)
    if (this.audioQueue.length > 0 || this.isSending) {
      console.log('🛑 Barge-in detected - stopping AI speech');
      this.clearAudioQueue();
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

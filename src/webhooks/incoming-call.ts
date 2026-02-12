import { Router, Request, Response } from 'express';
import twilio from 'twilio';

const router = Router();

/**
 * Twilio webhook for incoming calls
 * Responds with TwiML to start a Media Stream
 */
router.post('/incoming-call', (req: Request, res: Response) => {
  console.log('📞 Incoming call received');
  console.log('   From:', req.body.From);
  console.log('   To:', req.body.To);
  console.log('   CallSid:', req.body.CallSid);

  // Get the WebSocket URL for the Media Stream
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${host}/media-stream`;

  console.log(`   WebSocket URL: ${wsUrl}`);

  // Create TwiML response
  const twiml = new twilio.twiml.VoiceResponse();

  // Optional: Play a brief "connecting" message while WebSocket establishes
  // twiml.say({ voice: 'alice' }, 'Please hold while we connect you.');

  // Start the Media Stream
  const connect = twiml.connect();
  const stream = connect.stream({
    url: wsUrl,
    // Track both directions if needed, but 'inbound' is what we need for STT
    // track: 'both_tracks',
  });

  // Add custom parameters - pass caller info for SMS functionality
  stream.parameter({ name: 'callSid', value: req.body.CallSid || '' });
  stream.parameter({ name: 'callerPhone', value: req.body.From || '' });

  // Send TwiML response
  res.type('text/xml');
  res.send(twiml.toString());

  console.log('   TwiML response sent, starting Media Stream...');
});

/**
 * Status callback for call events (optional)
 */
router.post('/call-status', (req: Request, res: Response) => {
  console.log('📊 Call status update:', {
    callSid: req.body.CallSid,
    status: req.body.CallStatus,
    duration: req.body.CallDuration,
  });
  res.sendStatus(200);
});

export default router;

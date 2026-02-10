"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const twilio_1 = __importDefault(require("twilio"));
const router = (0, express_1.Router)();
/**
 * Twilio webhook for incoming calls
 * Responds with TwiML to start a Media Stream
 */
router.post('/incoming-call', (req, res) => {
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
    const twiml = new twilio_1.default.twiml.VoiceResponse();
    // Optional: Play a brief "connecting" message while WebSocket establishes
    // twiml.say({ voice: 'alice' }, 'Please hold while we connect you.');
    // Start the Media Stream
    const connect = twiml.connect();
    const stream = connect.stream({
        url: wsUrl,
        // Track both directions if needed, but 'inbound' is what we need for STT
        // track: 'both_tracks',
    });
    // Add custom parameters if needed
    stream.parameter({ name: 'callSid', value: req.body.CallSid || '' });
    // Send TwiML response
    res.type('text/xml');
    res.send(twiml.toString());
    console.log('   TwiML response sent, starting Media Stream...');
});
/**
 * Status callback for call events (optional)
 */
router.post('/call-status', (req, res) => {
    console.log('📊 Call status update:', {
        callSid: req.body.CallSid,
        status: req.body.CallStatus,
        duration: req.body.CallDuration,
    });
    res.sendStatus(200);
});
exports.default = router;
//# sourceMappingURL=incoming-call.js.map
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config, validateConfig } from './config.js';
import incomingCallRouter from './webhooks/incoming-call.js';
import { MediaStreamHandler } from './pipeline/media-stream.js';
import { getSessionStats } from './pipeline/call-session.js';

// Validate configuration on startup
validateConfig();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Voice Backend',
    timestamp: new Date().toISOString(),
  });
});

// Health check with session stats
app.get('/health', (req, res) => {
  const stats = getSessionStats();
  res.json({
    status: 'healthy',
    activeSessions: stats.active,
    uptime: process.uptime(),
  });
});

// Twilio webhook routes
app.use('/', incomingCallRouter);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for Twilio Media Streams
const wss = new WebSocketServer({ 
  server,
  path: '/media-stream',
});

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req) => {
  console.log('🔌 New WebSocket connection from:', req.socket.remoteAddress);
  
  // Create handler for this connection
  const handler = new MediaStreamHandler(ws);
  
  handler.on('ended', () => {
    console.log('📴 Media stream handler ended');
  });
});

wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Start server
const PORT = config.port;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎙️  AI Voice Backend Server                             ║
║                                                           ║
║   HTTP Server:  http://localhost:${PORT}                    ║
║   WebSocket:    ws://localhost:${PORT}/media-stream          ║
║                                                           ║
║   Endpoints:                                              ║
║   - POST /incoming-call  (Twilio webhook)                 ║
║   - POST /call-status    (Status callback)                ║
║   - GET  /health         (Health check)                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📝 To test:
1. Deploy to Railway
2. Set Twilio webhook to: https://your-app.railway.app/incoming-call
3. Call your Twilio phone number

Environment:
- Twilio: ${config.twilio.accountSid ? '✓' : '✗'}
- Deepgram: ${config.deepgram.apiKey ? '✓' : '✗'}
- Gemini: ${config.gemini.apiKey ? '✓' : '✗'}
- ElevenLabs: ${config.elevenlabs.apiKey ? '✓' : '✗'}
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });
  
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

export { app, server };

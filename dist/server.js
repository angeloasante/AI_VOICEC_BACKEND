"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = require("ws");
const config_js_1 = require("./config.js");
const incoming_call_js_1 = __importDefault(require("./webhooks/incoming-call.js"));
const media_stream_js_1 = require("./pipeline/media-stream.js");
const call_session_js_1 = require("./pipeline/call-session.js");
// Validate configuration on startup
(0, config_js_1.validateConfig)();
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
    const stats = (0, call_session_js_1.getSessionStats)();
    res.json({
        status: 'healthy',
        activeSessions: stats.active,
        uptime: process.uptime(),
    });
});
// Twilio webhook routes
app.use('/', incoming_call_js_1.default);
// Create HTTP server
const server = (0, http_1.createServer)(app);
exports.server = server;
// Create WebSocket server for Twilio Media Streams
const wss = new ws_1.WebSocketServer({
    server,
    path: '/media-stream',
});
// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection from:', req.socket.remoteAddress);
    // Create handler for this connection
    const handler = new media_stream_js_1.MediaStreamHandler(ws);
    handler.on('ended', () => {
        console.log('📴 Media stream handler ended');
    });
});
wss.on('error', (error) => {
    console.error('❌ WebSocket server error:', error);
});
// Start server
const PORT = config_js_1.config.port;
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
- Twilio: ${config_js_1.config.twilio.accountSid ? '✓' : '✗'}
- Deepgram: ${config_js_1.config.deepgram.apiKey ? '✓' : '✗'}
- Gemini: ${config_js_1.config.gemini.apiKey ? '✓' : '✗'}
- ElevenLabs: ${config_js_1.config.elevenlabs.apiKey ? '✓' : '✗'}
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
//# sourceMappingURL=server.js.map
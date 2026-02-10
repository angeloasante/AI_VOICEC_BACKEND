# 🎙️ AI Voice Backend

Real-time conversational AI voice backend for handling phone calls. Built with Express, WebSockets, and integrated with Twilio for telephony, Deepgram for speech-to-text, Google Gemini for AI responses, and ElevenLabs for natural text-to-speech.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Call Flow](#call-flow)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This is an MVP voice AI system that enables natural phone conversations with an AI assistant. When someone calls your Twilio phone number, they're connected to an AI that can:

- **Answer questions** about a business (hours, location, menu items)
- **Take orders** and confirm details back to the caller
- **Handle natural conversation** with context memory throughout the call
- **Respond quickly** with sub-2-second latency for natural dialogue

### Key Features

- ✅ Real-time bidirectional audio streaming via WebSocket
- ✅ Speech-to-text with Deepgram (300ms latency)
- ✅ AI responses powered by Google Gemini 2.0 Flash
- ✅ Natural voice synthesis with ElevenLabs
- ✅ Conversation memory within each call session
- ✅ Interruption handling (caller can cut off the AI)
- ✅ Railway-ready deployment configuration

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PHONE CALL FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    📱 Caller                    ☁️ Twilio                    🖥️ Your Server
        │                            │                              │
        │  ── Dials Number ────────► │                              │
        │                            │                              │
        │                            │ ── POST /incoming-call ────► │
        │                            │                              │
        │                            │ ◄── TwiML (open WebSocket) ─ │
        │                            │                              │
        │                            │ ═══ WebSocket Connection ═══ │
        │                            │      (bidirectional audio)   │
        │                            │                              │
        │  ◄── "Hi! How can I ─────  │ ◄════════════════════════════│
        │       help you?"           │                              │
        │                            │                              │
        │  ── "I'd like to ────────► │ ════════════════════════════►│
        │      order a burger"       │                              │
        │                            │         ┌──────────────┐     │
        │                            │         │   Deepgram   │     │
        │                            │         │    (STT)     │     │
        │                            │         └──────┬───────┘     │
        │                            │                │              │
        │                            │         ┌──────▼───────┐     │
        │                            │         │   Gemini     │     │
        │                            │         │    (AI)      │     │
        │                            │         └──────┬───────┘     │
        │                            │                │              │
        │                            │         ┌──────▼───────┐     │
        │                            │         │  ElevenLabs  │     │
        │                            │         │    (TTS)     │     │
        │                            │         └──────┬───────┘     │
        │                            │                │              │
        │  ◄── "One burger, ───────  │ ◄════════════════════════════│
        │       great choice!"       │                              │
        │                            │                              │
        └────────────────────────────┴──────────────────────────────┘
```

---

## ⏱️ Call Flow Timing

Each exchange follows this timing pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LATENCY BREAKDOWN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Caller speaks          ~~~~~~~~~~~~~~~  (1-3 seconds)          │
│                                                                  │
│  Silence detection      ·····           (300-500ms)             │
│  (Deepgram endpointing)       ↓                                 │
│                               speech_final = true                │
│                                                                  │
│  Deepgram finalizes     ··              (50-100ms)              │
│  transcript                                                      │
│                                                                  │
│  Gemini processes       ·········       (300-800ms)             │
│  + starts streaming           ↓                                 │
│                               first token received               │
│                                                                  │
│  ElevenLabs generates   ·····           (100-200ms)             │
│  first audio chunk                                               │
│                                                                  │
│  Audio travels back     ··              (50ms)                  │
│  through Twilio                                                  │
│                                                                  │
│  ════════════════════════════════════════                        │
│  TOTAL SILENCE GAP: ~800ms - 1.6 seconds                        │
│  ════════════════════════════════════════                        │
│                                                                  │
│  AI speaks              ~~~~~~~~~~~~~~~~~~~  (1-4 seconds)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Target: Under 1 second feels like natural conversation
Acceptable: 1-1.5 seconds
Too slow: Over 1.5 seconds (caller says "hello?")
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts              # Express + WebSocket server entry point
│   ├── config.ts              # Environment configuration loader
│   ├── types.ts               # TypeScript interfaces and types
│   │
│   ├── webhooks/
│   │   └── incoming-call.ts   # Twilio webhook - returns TwiML
│   │
│   ├── pipeline/
│   │   ├── media-stream.ts    # Twilio WebSocket handler (orchestrator)
│   │   ├── transcriber.ts     # Deepgram real-time STT
│   │   ├── brain.ts           # Gemini AI with conversation context
│   │   ├── synthesizer.ts     # ElevenLabs TTS with streaming
│   │   ├── call-session.ts    # In-memory call state management
│   │   └── audio-utils.ts     # mulaw ↔ linear16 conversion
│   │
│   └── knowledge/
│       └── test-business.ts   # Hardcoded test restaurant data
│
├── dist/                      # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
├── .env                       # Environment variables (not in git)
└── README.md
```

### Component Responsibilities

| Component | File | Purpose |
|-----------|------|---------|
| **Server** | `server.ts` | HTTP server + WebSocket server setup |
| **Config** | `config.ts` | Loads and validates environment variables |
| **Webhook** | `incoming-call.ts` | Responds to Twilio with TwiML to start Media Stream |
| **Media Stream** | `media-stream.ts` | Orchestrates the full pipeline for each call |
| **Transcriber** | `transcriber.ts` | Real-time speech-to-text via Deepgram WebSocket |
| **Brain** | `brain.ts` | Gemini AI with business context and conversation history |
| **Synthesizer** | `synthesizer.ts` | Text-to-speech via ElevenLabs streaming API |
| **Session** | `call-session.ts` | Tracks conversation state in memory |
| **Audio Utils** | `audio-utils.ts` | Converts between Twilio's mulaw and Deepgram's linear16 |
| **Knowledge** | `test-business.ts` | Test business data (Tony's Burger Joint) |

---

## 📋 Prerequisites

Before you begin, you'll need accounts and API keys from:

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Twilio](https://www.twilio.com) | Phone number & telephony | $15 trial credit |
| [Deepgram](https://deepgram.com) | Speech-to-text | $200 free credit |
| [Google AI Studio](https://aistudio.google.com) | Gemini AI | Free tier available |
| [ElevenLabs](https://elevenlabs.io) | Text-to-speech | Free tier available |
| [Railway](https://railway.app) | Deployment | $5 free monthly |

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/angeloasante/AI_VOICEC_BACKEND.git
cd AI_VOICEC_BACKEND
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3001

# Twilio - Get from https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Deepgram - Get from https://console.deepgram.com
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Gemini - Get from https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ElevenLabs - Get from https://elevenlabs.io/api
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

### 4. Build the project

```bash
npm run build
```

### 5. Start the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run start
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | No | Your Twilio phone number |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key for STT |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for TTS |
| `ELEVENLABS_VOICE_ID` | No | Voice ID (default: Sarah) |

### Deepgram Configuration

The transcriber is configured for telephony audio:

- **Encoding**: mulaw (8-bit)
- **Sample Rate**: 8000 Hz
- **Model**: nova-2 (fastest, most accurate)
- **Language**: en-GB (British English)
- **Endpointing**: 300ms silence triggers end of speech

### ElevenLabs Voice Options

Popular voice IDs for the `ELEVENLABS_VOICE_ID` setting:

| Voice ID | Name | Description |
|----------|------|-------------|
| `EXAVITQu4vr4xnSDxMaL` | Sarah | Warm, friendly female |
| `21m00Tcm4TlvDq8ikWAM` | Rachel | Professional female |
| `AZnzlk1XvdvUeBnXmlld` | Domi | Confident female |
| `ErXwobaYiN019PkySvjV` | Antoni | Warm male |
| `VR6AewLTigWG4xSOukaG` | Arnold | British male |

---

## 🛠️ Development

### Scripts

```bash
npm run dev    # Start with hot reload (tsx watch)
npm run build  # Compile TypeScript to dist/
npm run start  # Run compiled JavaScript
npm run lint   # Run ESLint
```

### Local Testing with ngrok

Since Twilio needs a public URL, use ngrok for local development:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3001
```

Then set your Twilio webhook to: `https://xxxx.ngrok.io/incoming-call`

---

## 🚢 Deployment

### Deploy to Railway

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect Railway**
   - Go to [Railway](https://railway.app)
   - Create new project → Deploy from GitHub repo
   - Select your repository

3. **Add Environment Variables**
   - In Railway dashboard, go to Variables
   - Add all the environment variables from your `.env`

4. **Get Your URL**
   - Railway will provide a URL like: `https://your-app.railway.app`

5. **Configure Twilio**
   - Go to [Twilio Console](https://console.twilio.com) → Phone Numbers
   - Select your phone number
   - Under "Voice & Fax", set:
     - **A call comes in**: Webhook
     - **URL**: `https://your-app.railway.app/incoming-call`
     - **HTTP Method**: POST

6. **Test!**
   - Call your Twilio phone number
   - You should hear: "Hi there! Thanks for calling Tony's Burger Joint..."

---

## 📡 API Endpoints

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check with service info |
| `GET` | `/health` | Detailed health check with session stats |
| `POST` | `/incoming-call` | Twilio webhook for incoming calls |
| `POST` | `/call-status` | Twilio status callback (optional) |

### WebSocket Endpoint

| Path | Description |
|------|-------------|
| `ws://host/media-stream` | Twilio Media Stream connection |

### Example Health Check Response

```json
{
  "status": "healthy",
  "activeSessions": 2,
  "uptime": 3600.5
}
```

---

## 🧪 Testing

### Test Scenarios

Once deployed, call your Twilio number and test:

| Test | What to Say | Expected Response |
|------|-------------|-------------------|
| **Basic** | "Hello" | Greeting and offer to help |
| **Hours** | "What are your hours?" | Business hours |
| **Menu** | "What burgers do you have?" | List of burgers with prices |
| **Order** | "I want a chicken burger" | Confirmation and follow-up |
| **Memory** | "Make that two" | Should remember context |
| **Edge case** | Stay silent 10 seconds | Should handle gracefully |

### Latency Measurement

Time the gap between when you stop speaking and when the AI starts responding. Target is under 1.5 seconds.

---

## 🔧 Troubleshooting

### Common Issues

**"Deepgram connection timeout"**
- Check your `DEEPGRAM_API_KEY` is valid
- Ensure you have credits remaining in Deepgram

**"No audio from AI"**
- Check `ELEVENLABS_API_KEY` is valid
- Verify `ELEVENLABS_VOICE_ID` exists

**"Webhook returns 500"**
- Check Railway logs for errors
- Ensure all environment variables are set

**"AI doesn't respond"**
- Check `GEMINI_API_KEY` is valid
- Look for errors in server logs

### Viewing Logs

```bash
# Railway
railway logs

# Local
npm run dev  # Logs to console
```

### Debug Mode

Add to your environment for verbose logging:
```env
DEBUG=true
```

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For issues or questions, please open a GitHub issue.

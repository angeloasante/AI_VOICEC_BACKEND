# 🎙️ Diaspora AI Voice Backend

Real-time conversational AI voice backend for **Diaspora AI** - the AI-powered travel booking platform for the African diaspora. Handle phone calls with natural voice AI that can answer questions about flights, check visa requirements, and guide customers through the booking process.

Built with Express, WebSockets, and integrated with Twilio for telephony, Deepgram for speech-to-text, Google Gemini for AI responses, and ElevenLabs for natural text-to-speech.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

**Live Deployment:** https://voice-ai-backend-production-8abb.up.railway.app

---

## 📋 Table of Contents

- [Overview](#overview)
- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Call Flow](#call-flow)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Visa API Integration](#visa-api-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This is the voice AI backend for **Diaspora AI**, enabling natural phone conversations with an AI travel assistant. When someone calls the Twilio phone number, they're connected to an AI that can:

### What It Does

| Capability | Description |
|------------|-------------|
| 🛫 **Flight Information** | Answer questions about booking flights to Africa |
| 🛂 **Visa Requirements** | Check real-time visa requirements using the Diaspora AI Visa API |
| 💳 **Payment Options** | Explain card and mobile money payment methods (MTN MoMo, M-Pesa, etc.) |
| 📱 **Booking Guidance** | Direct customers to WhatsApp or the booking website |
| 🗣️ **Natural Conversation** | Handle natural dialogue with context memory throughout the call |
| 👤 **Human Handoff** | Transfer to a live agent when needed |

### Example Conversations

**Flight Inquiry:**
> *Caller:* "I want to book a flight from London to Accra"  
> *AI:* "Great! We can help you book flights to Accra. You can message us on WhatsApp or visit app.diasporaai.dev to search and compare over 50 flight options. Would you like me to tell you more about our booking process?"

**Visa Check:**
> *Caller:* "Do I need a visa from Ghana to UK?"  
> *AI:* "For travel from Ghana to the United Kingdom, you will need a visa. You'll need a Standard Visitor Visa. You'll need to apply at the embassy or consulate before traveling. Your passport should be valid for at least 6 months. Would you like me to help you book a flight for this trip?"

**Payment Question:**
> *Caller:* "Can I pay with mobile money?"  
> *AI:* "Yes! We accept MTN Mobile Money, Vodafone Cash, AirtelTigo Money, M-Pesa, bank transfers, and USSD. This means you can pay the African way, not just with cards."

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DIASPORA AI VOICE CALL FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

    📱 Caller                    ☁️ Twilio                    🖥️ Voice Backend
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
        │  ◄── "Hello! Thank you ──  │ ◄════════════════════════════│
        │       for calling          │                              │
        │       Diaspora AI..."      │                              │
        │                            │                              │
        │  ── "I need a visa ──────► │ ════════════════════════════►│
        │      from Ghana to UK"     │                              │
        │                            │         ┌──────────────┐     │
        │                            │         │   Deepgram   │     │
        │                            │         │  Nova-2 STT  │     │
        │                            │         └──────┬───────┘     │
        │                            │                │              │
        │                            │         ┌──────▼───────┐     │
        │                            │         │  Visa Query  │     │
        │                            │         │  Detected?   │     │
        │                            │         └──────┬───────┘     │
        │                            │           Yes  │  No          │
        │                            │                │              │
        │                            │    ┌───────────┴──────────┐  │
        │                            │    ▼                      ▼  │
        │                            │ ┌──────────┐     ┌──────────┐│
        │                            │ │Diaspora  │     │  Gemini  ││
        │                            │ │Visa API  │     │   2.0    ││
        │                            │ └────┬─────┘     └────┬─────┘│
        │                            │      └────────┬───────┘      │
        │                            │               │               │
        │                            │        ┌──────▼───────┐      │
        │                            │        │  ElevenLabs  │      │
        │                            │        │    TTS       │      │
        │                            │        └──────┬───────┘      │
        │                            │               │               │
        │  ◄── "For travel from ───  │ ◄════════════════════════════│
        │       Ghana to UK,         │                              │
        │       you will need..."    │                              │
        │                            │                              │
        └────────────────────────────┴──────────────────────────────┘
```

---

## ⏱️ Call Flow Timing

Each exchange follows this timing pattern for natural conversation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LATENCY BREAKDOWN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Caller speaks          ~~~~~~~~~~~~~~~  (1-3 seconds)          │
│                                                                  │
│  Silence detection      ······          (500ms)                 │
│  (Deepgram endpointing)       ↓                                 │
│                               speech_final = true                │
│                                                                  │
│  Deepgram finalizes     ··              (50-100ms)              │
│  transcript                                                      │
│                                                                  │
│  Gemini/Visa API        ·········       (300-800ms)             │
│  processes + streams          ↓                                 │
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
└─────────────────────────────────────────────────────────────────┘

Target: Under 1 second = natural conversation
Acceptable: 1-1.5 seconds
```

---

## ✨ Features

### Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| Real-time Audio Streaming | ✅ | Bidirectional WebSocket with Twilio Media Streams |
| Speech-to-Text | ✅ | Deepgram Nova-2 with 500ms endpointing |
| AI Responses | ✅ | Google Gemini 2.0 Flash with streaming |
| Text-to-Speech | ✅ | ElevenLabs with μ-law 8kHz (Twilio native format) |
| Conversation Memory | ✅ | Context maintained throughout each call |
| Visa API Integration | ✅ | Real-time visa requirements lookup |

### Audio Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Sample Rate | 8000 Hz | Twilio telephony standard |
| Encoding | μ-law (mulaw) | Twilio's native format |
| Channels | 1 (mono) | Phone audio is mono |
| Chunk Size | 1600 bytes | 200ms chunks for smooth playback |
| Output Format | `ulaw_8000` | ElevenLabs direct Twilio support |

### Deepgram Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Model | nova-2 | Best accuracy for conversational speech |
| Language | en-GB | British English |
| Endpointing | 500ms | Wait 500ms silence before finalizing |
| Utterance End | 1500ms | Additional buffer for pauses |
| Smart Format | true | Better number/date recognition |
| VAD Events | true | Voice activity detection |

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
│   │   ├── brain.ts           # Gemini AI + Visa API routing
│   │   ├── synthesizer.ts     # ElevenLabs TTS with streaming
│   │   ├── call-session.ts    # In-memory call state management
│   │   └── audio-utils.ts     # Audio format utilities
│   │
│   └── knowledge/
│       ├── diaspora-ai.ts     # Diaspora AI business knowledge + Visa API
│       └── test-business.ts   # Legacy test restaurant (not used)
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
| **Brain** | `brain.ts` | Routes to Visa API or Gemini, manages responses |
| **Synthesizer** | `synthesizer.ts` | Text-to-speech via ElevenLabs streaming API |
| **Session** | `call-session.ts` | Tracks conversation state in memory |
| **Diaspora AI** | `diaspora-ai.ts` | Business knowledge + Visa API integration |

---

## 📋 Prerequisites

Before you begin, you'll need accounts and API keys from:

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| Twilio | Phone number & telephony | $15 trial credit | [twilio.com](https://www.twilio.com) |
| Deepgram | Speech-to-text | $200 free credit | [deepgram.com](https://deepgram.com) |
| Google AI Studio | Gemini AI | Free tier available | [aistudio.google.com](https://aistudio.google.com) |
| ElevenLabs | Text-to-speech | Free tier available | [elevenlabs.io](https://elevenlabs.io) |
| Railway | Deployment | $5 free monthly | [railway.app](https://railway.app) |

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

### 3. Create environment file

```bash
cp .env.example .env
# Then edit .env with your API keys
```

### 4. Build TypeScript

```bash
npm run build
```

### 5. Start development server

```bash
npm run dev
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Twilio (required)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Deepgram - Real-time Speech-to-Text (required)
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Gemini AI (required)
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxx

# ElevenLabs Text-to-Speech (required)
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=qVp1puw1HjHIbF91A9Xi

# Diaspora AI Visa API (optional but recommended)
DIASPORA_AI_VISA_API_KEY=dsp_visa_xxxxxxxxxxxxxxxxxxxxxxxx

# Server (optional)
PORT=8080
```

### Voice Configuration

The default voice ID `qVp1puw1HjHIbF91A9Xi` is configured for Diaspora AI. To change the voice:

1. Go to [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Find a voice you like
3. Copy the Voice ID
4. Update `ELEVENLABS_VOICE_ID` in your environment

---

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start with hot reload (ts-node-dev)
npm run build    # Compile TypeScript to JavaScript
npm run start    # Run compiled JavaScript
npm run lint     # Run ESLint
```

### Local Development with ngrok

Since Twilio needs a public URL, use ngrok for local development:

```bash
# Terminal 1: Start your server
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 8080
```

Then update your Twilio webhook to the ngrok URL.

---

## 🚀 Deployment

### Deploy to Railway

1. **Connect to Railway:**
```bash
railway login
railway link
```

2. **Set environment variables:**
```bash
railway variables set TWILIO_ACCOUNT_SID=ACxxx
railway variables set TWILIO_AUTH_TOKEN=xxx
railway variables set DEEPGRAM_API_KEY=xxx
railway variables set GEMINI_API_KEY=AIzaSyxxx
railway variables set ELEVENLABS_API_KEY=sk_xxx
railway variables set ELEVENLABS_VOICE_ID=qVp1puw1HjHIbF91A9Xi
railway variables set DIASPORA_AI_VISA_API_KEY=dsp_visa_xxx
```

3. **Deploy:**
```bash
git push
# Railway auto-deploys from GitHub
```

### Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Click your phone number
4. Under "Voice Configuration":
   - Set "A call comes in" to **Webhook**
   - URL: `https://your-app.railway.app/incoming-call`
   - HTTP Method: **POST**
5. Save

---

## 🔌 API Endpoints

### `POST /incoming-call`

Twilio webhook endpoint. Returns TwiML to establish a bidirectional Media Stream.

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://your-app.railway.app/media-stream">
            <Parameter name="callSid" value="CAxxxxxx"/>
        </Stream>
    </Connect>
</Response>
```

### `POST /call-status`

Optional callback for call status events (completed, busy, failed, etc.)

### `GET /health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

### `WS /media-stream`

WebSocket endpoint for Twilio Media Streams. Handles:
- `connected` - Initial connection
- `start` - Stream metadata
- `media` - Audio chunks (base64 μ-law)
- `mark` - Playback completion
- `stop` - Stream ended

---

## 🛂 Visa API Integration

The backend integrates with the Diaspora AI Visa Requirements API to provide real-time visa information.

### How It Works

1. **Detection:** When a user asks about visas, the brain detects keywords like "visa", "do I need", "travel requirement"

2. **Parsing:** Country names are extracted and converted to ISO codes:
   - "Ghana" → GH
   - "London" / "UK" / "United Kingdom" → GB
   - "Nigeria" → NG

3. **API Call:** Request is made to `https://app.diasporaai.dev/api/v1/visa`

4. **Response Formatting:** API data is converted to natural speech

### Supported Countries

| Code | Country | Code | Country |
|------|---------|------|---------|
| GH | Ghana | GB | United Kingdom |
| NG | Nigeria | US | United States |
| KE | Kenya | CA | Canada |
| ZA | South Africa | DE | Germany |
| EG | Egypt | FR | France |

### Example Request

```typescript
const result = await checkVisaRequirements('GH', 'GB');
// Returns visa type, requirements, documents needed, etc.
```

---

## 🧪 Testing

### Test Locally

1. Start the server with `npm run dev`
2. Use ngrok: `ngrok http 8080`
3. Update Twilio webhook to ngrok URL
4. Call your Twilio number

### Test Scenarios

| Scenario | What to Say | Expected Response |
|----------|-------------|-------------------|
| Greeting | (Just answer) | "Hello! Thank you for calling Diaspora AI..." |
| General Info | "What is Diaspora AI?" | Explains the company and services |
| Booking | "I want to book a flight" | Directs to WhatsApp or website |
| Visa Query | "Do I need a visa from Ghana to UK?" | Fetches from Visa API and responds |
| Payment | "Can I pay with mobile money?" | Lists MTN MoMo, M-Pesa, etc. |
| Human | "Can I speak to someone?" | Offers to transfer to support |

### Logs to Watch

```
📞 Incoming call received
🔌 New WebSocket connection
🔗 Twilio Media Stream connected
📞 Call started - SID: CAxxxxx
🎤 Connecting to Deepgram...
🎤 Deepgram connected
💬 [ASSISTANT]: Hello! Thank you for calling Diaspora AI...
🔊 TTS completed in 337ms
📤 Sent 15 audio chunks to Twilio
✓ Audio playback complete: response-end-1
🎤 Final transcript: "Do I need a visa from Ghana to UK?"
💬 [USER]: Do I need a visa from Ghana to UK?
🛂 Visa query detected: GH → GB
🛂 Visa response generated in 245ms
📤 Sent 12 audio chunks to Twilio
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Audio sounds robotic/broken"
- **Cause:** Wrong audio format
- **Fix:** Ensure ElevenLabs is using `ulaw_8000` in URL params (not body)

#### "AI doesn't hear some words"
- **Cause:** Endpointing too aggressive
- **Fix:** Increase `endpointing` from 300ms to 500ms in transcriber.ts

#### "Long pauses before AI responds"
- **Cause:** High latency in one of the services
- **Fix:** Check Gemini response time in logs, consider shorter prompts

#### "Visa API not working"
- **Cause:** Missing API key
- **Fix:** Set `DIASPORA_AI_VISA_API_KEY` in Railway environment

#### "WebSocket connection failing"
- **Cause:** Wrong URL in TwiML
- **Fix:** Ensure WebSocket URL uses `wss://` (not `https://`)

### Debug Mode

Enable verbose logging by checking the console output. Key log prefixes:
- 📞 = Call events
- 🎤 = Transcription
- 🧠 = AI processing
- 🛂 = Visa API
- 🔊 = TTS
- 📤 = Audio sending
- ✓ = Playback complete

---

## 📊 Performance Metrics

Current production performance:

| Metric | Value |
|--------|-------|
| Greeting latency | ~400ms |
| Response latency | 600-800ms |
| Visa API latency | 200-400ms |
| TTS latency | 200-300ms |
| Audio chunk size | 200ms |
| End-to-end | ~1-1.5s |

---

## 🛡️ Security Considerations

- All API keys stored in environment variables
- No credentials in code or git
- HTTPS/WSS for all connections
- Railway provides SSL termination
- Twilio validates webhook signatures (optional enhancement)

---

## 📝 License

MIT License - Built for Diaspora AI by Travis

---

## 🔗 Related Links

- **Diaspora AI Website:** [diasporaai.dev](https://diasporaai.dev)
- **Booking App:** [app.diasporaai.dev](https://app.diasporaai.dev)
- **Visa API Docs:** [app.diasporaai.dev/api/v1/visa](https://app.diasporaai.dev/api/v1/visa)
- **GitHub Repository:** [github.com/angeloasante/AI_VOICEC_BACKEND](https://github.com/angeloasante/AI_VOICEC_BACKEND)
- **Railway Dashboard:** [railway.app](https://railway.app)

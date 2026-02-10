"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
exports.generateGreeting = generateGreeting;
const generative_ai_1 = require("@google/generative-ai");
const config_js_1 = require("../config.js");
const diaspora_ai_js_1 = require("../knowledge/diaspora-ai.js");
const call_session_js_1 = require("./call-session.js");
// Initialize Gemini client
const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.gemini.apiKey);
/**
 * Check if user is asking about visa requirements
 * Smart detection that prioritizes PASSPORT/CITIZENSHIP over residence
 */
function isVisaQuery(message) {
    const lowerMessage = message.toLowerCase();
    // Check for visa-related keywords
    const visaKeywords = ['visa', 'visas', 'travel requirement', 'do i need', 'can i travel', 'entry requirement', 'going to', 'traveling to', 'travelling to', 'travel from', 'travel to'];
    const hasVisaKeyword = visaKeywords.some(kw => lowerMessage.includes(kw));
    let passport = null;
    let destination = null;
    let residence = null;
    // Pattern 1: Detect citizenship/passport explicitly - THIS IS THE KEY FOR VISA
    // "I'm a Ghanaian citizen", "Ghanaian passport", "I'm Ghanaian", "I hold a Nigerian passport"
    const citizenshipPatterns = [
        /(?:i'm|i am|im)\s+(?:a\s+)?(\w+)\s+citizen/i,
        /(\w+)\s+passport/i,
        /(?:i'm|i am|im)\s+(?:a\s+)?(\w+)(?:\s+national)?/i,
        /(?:i\s+hold|holding)\s+(?:a\s+)?(\w+)\s+passport/i,
        /citizen\s+of\s+(\w+)/i,
        /nationality\s+(?:is\s+)?(\w+)/i,
    ];
    for (const pattern of citizenshipPatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
            const nationality = match[1];
            // Convert nationality to country code (Ghanaian -> GH)
            passport = (0, diaspora_ai_js_1.parseCountryCode)(nationality) || (0, diaspora_ai_js_1.parseCountryCode)(nationality.replace(/n$|an$|ian$|ish$|ese$|i$/i, ''));
            if (passport)
                break;
        }
    }
    // Pattern 2: Detect destination - "to Zanzibar", "going to Tanzania", etc.
    const destPatterns = [
        /(?:to|going to|travel(?:ing|ling)?\s+to|visit(?:ing)?)\s+(\w+(?:\s+\w+)?)/i,
    ];
    for (const pattern of destPatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
            destination = (0, diaspora_ai_js_1.parseCountryCode)(match[1]);
            if (destination)
                break;
        }
    }
    // Pattern 3: Detect residence - "from UK", "UK resident", "living in UK"
    const residencePatterns = [
        /(?:from|in|living in|based in|resident of|reside in)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
        /(\w+)\s+resident/i,
    ];
    for (const pattern of residencePatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
            const res = (0, diaspora_ai_js_1.parseCountryCode)(match[1]);
            // Only set residence if it's different from passport
            if (res && res !== passport) {
                residence = res;
                break;
            }
        }
    }
    // Fallback: Simple "X to Y" pattern if no passport detected
    if (!passport && !destination) {
        const simplePattern = /(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/i;
        const match = lowerMessage.match(simplePattern);
        if (match) {
            const from = (0, diaspora_ai_js_1.parseCountryCode)(match[1]);
            const to = (0, diaspora_ai_js_1.parseCountryCode)(match[2]);
            if (from && to) {
                passport = from;
                destination = to;
            }
        }
    }
    // If we found relevant info, it's a visa query
    if (destination || (hasVisaKeyword && (passport || destination))) {
        console.log(`🛂 Visa query parsed:`, { passport, destination, residence });
        return { isVisa: true, passport: passport || undefined, destination: destination || undefined, residence: residence || undefined };
    }
    if (hasVisaKeyword) {
        return { isVisa: true };
    }
    return { isVisa: false };
}
/**
 * Generate a response using Gemini AI
 * Streams the response for lower latency
 */
async function generateResponse(streamSid, userMessage, onChunk) {
    const startTime = Date.now();
    // Add user message to conversation history
    (0, call_session_js_1.addMessage)(streamSid, 'user', userMessage);
    // Check if this is a visa query
    const visaCheck = isVisaQuery(userMessage);
    if (visaCheck.isVisa && visaCheck.passport && visaCheck.destination) {
        // PASSPORT is what matters for visa - not where you're traveling FROM
        // e.g., Ghanaian living in UK traveling to Tanzania = check GH → TZ
        const fromCountry = visaCheck.passport;
        const toCountry = visaCheck.destination;
        console.log(`🛂 Visa query detected:`);
        console.log(`   📕 Passport: ${fromCountry}`);
        console.log(`   ✈️  Destination: ${toCountry}`);
        if (visaCheck.residence) {
            console.log(`   🏠 Residence: ${visaCheck.residence} (noted but using passport for visa check)`);
        }
        console.log(`🛂 Calling Visa API: ${fromCountry} → ${toCountry}`);
        const visaResult = await (0, diaspora_ai_js_1.checkVisaRequirements)(fromCountry, toCountry);
        console.log(`🛂 Visa API response:`, JSON.stringify(visaResult, null, 2));
        if (visaResult.success && visaResult.data) {
            const visaResponse = (0, diaspora_ai_js_1.formatVisaResponse)(visaResult.data);
            // Send the FULL visa response as one chunk for consistent speech
            await onChunk(visaResponse);
            const latency = Date.now() - startTime;
            console.log(`🛂 Visa response generated in ${latency}ms`);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', visaResponse);
            return visaResponse;
        }
        else {
            // Visa API failed or route not available - give user-friendly feedback
            console.log(`🛂 Visa API failed:`, visaResult.error);
            const fallbackResponse = `I don't currently have visa information for travel from ${fromCountry} to ${toCountry} in my system. I'd recommend checking our website at app.diasporaai.dev for the most up-to-date visa requirements, or I can connect you with one of our human agents who can help. Would you like me to do that?`;
            await onChunk(fallbackResponse);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', fallbackResponse);
            const latency = Date.now() - startTime;
            console.log(`🛂 Visa fallback response in ${latency}ms`);
            return fallbackResponse;
        }
    }
    else if (visaCheck.isVisa && (!visaCheck.passport || !visaCheck.destination)) {
        // User asked about visa but we couldn't extract all details - ask for clarification
        console.log(`🛂 Partial visa query - missing info:`, {
            hasPassport: !!visaCheck.passport,
            hasDestination: !!visaCheck.destination
        });
        // Let Gemini handle asking for the missing info
    }
    // Build the prompt with business context and conversation history
    const businessContext = (0, diaspora_ai_js_1.getBusinessContext)();
    const conversationHistory = (0, call_session_js_1.getConversationContext)(streamSid);
    const systemPrompt = `${businessContext}

CONVERSATION SO FAR:
${conversationHistory || '(This is the start of the conversation)'}

Remember: Keep your response concise and natural for a phone call. Don't use bullet points or formatting - just speak naturally. Maximum 2-3 sentences.`;
    try {
        const model = genAI.getGenerativeModel({
            model: config_js_1.config.gemini.model,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 150, // Keep responses short for voice
            },
        });
        // Start chat with context
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: 'model',
                    parts: [{ text: 'Understood. I\'m the AI phone assistant for Diaspora AI. I\'ll help customers with flight bookings, visa information, and general inquiries. I\'ll keep my responses natural and conversational.' }],
                },
            ],
        });
        // Stream the response
        const result = await chat.sendMessageStream(userMessage);
        let fullResponse = '';
        let sentenceBuffer = '';
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                fullResponse += text;
                sentenceBuffer += text;
                // Send chunks at sentence boundaries for natural TTS
                const sentenceEnders = /[.!?]\s/;
                const match = sentenceBuffer.match(sentenceEnders);
                if (match && match.index !== undefined) {
                    const endIndex = match.index + 1;
                    const sentence = sentenceBuffer.substring(0, endIndex).trim();
                    sentenceBuffer = sentenceBuffer.substring(endIndex + 1);
                    if (sentence) {
                        await onChunk(sentence);
                    }
                }
            }
        }
        // Send any remaining text
        if (sentenceBuffer.trim()) {
            await onChunk(sentenceBuffer.trim());
        }
        const latency = Date.now() - startTime;
        console.log(`🧠 Gemini response generated in ${latency}ms`);
        // Add assistant response to conversation history
        (0, call_session_js_1.addMessage)(streamSid, 'assistant', fullResponse);
        return fullResponse;
    }
    catch (error) {
        console.error('❌ Gemini API error:', error);
        // Fallback response
        const fallback = "I'm sorry, I'm having a bit of trouble understanding. Could you repeat that?";
        (0, call_session_js_1.addMessage)(streamSid, 'assistant', fallback);
        await onChunk(fallback);
        return fallback;
    }
}
/**
 * Generate a greeting for the start of a call
 */
async function generateGreeting(streamSid) {
    const greeting = "Hello! Thank you for calling Diaspora AI, your AI-powered travel assistant. How can I help you today?";
    (0, call_session_js_1.addMessage)(streamSid, 'assistant', greeting);
    return greeting;
}
//# sourceMappingURL=brain.js.map
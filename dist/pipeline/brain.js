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
 */
function isVisaQuery(message) {
    const lowerMessage = message.toLowerCase();
    // Check for visa-related keywords OR country-to-country patterns
    const visaKeywords = ['visa', 'visas', 'travel requirement', 'do i need', 'can i travel', 'entry requirement', 'going to', 'traveling to', 'travelling to'];
    const hasVisaKeyword = visaKeywords.some(kw => lowerMessage.includes(kw));
    // Also detect "X to Y" pattern when X and Y are recognizable countries
    const countryToCountryPattern = /(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/i;
    const countryMatch = lowerMessage.match(countryToCountryPattern);
    if (countryMatch) {
        const potentialFrom = (0, diaspora_ai_js_1.parseCountryCode)(countryMatch[1]);
        const potentialTo = (0, diaspora_ai_js_1.parseCountryCode)(countryMatch[2]);
        if (potentialFrom && potentialTo) {
            // Both are valid countries - treat as visa query
            return { isVisa: true, from: potentialFrom, to: potentialTo };
        }
    }
    if (!hasVisaKeyword) {
        return { isVisa: false };
    }
    // Try multiple patterns to extract countries
    let fromCountry = null;
    let toCountry = null;
    // Pattern 1: "from X to Y" or "X to Y"
    const fromToPattern = /(?:from\s+)?(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/i;
    const match1 = lowerMessage.match(fromToPattern);
    if (match1) {
        fromCountry = (0, diaspora_ai_js_1.parseCountryCode)(match1[1]);
        toCountry = (0, diaspora_ai_js_1.parseCountryCode)(match1[2]);
    }
    // Pattern 2: "as a [nationality] going to Y" (e.g., "as a Ghanaian going to Albania")
    if (!fromCountry || !toCountry) {
        const asNationalityPattern = /as\s+(?:a\s+)?(\w+)(?:\s+citizen)?(?:\s+going|\s+traveling|\s+travelling)?\s+to\s+(\w+)/i;
        const match2 = lowerMessage.match(asNationalityPattern);
        if (match2) {
            // Convert nationality to country (Ghanaian -> Ghana)
            fromCountry = (0, diaspora_ai_js_1.parseCountryCode)(match2[1].replace(/n$|an$|ian$|ish$|ese$|i$/i, '')) || (0, diaspora_ai_js_1.parseCountryCode)(match2[1]);
            toCountry = (0, diaspora_ai_js_1.parseCountryCode)(match2[2]);
        }
    }
    // Pattern 3: "[nationality] to Y" (e.g., "Ghanaian to UK")
    if (!fromCountry || !toCountry) {
        const nationalityToPattern = /(\w+)(?:\s+citizen)?\s+(?:going\s+)?to\s+(\w+)/i;
        const match3 = lowerMessage.match(nationalityToPattern);
        if (match3) {
            fromCountry = (0, diaspora_ai_js_1.parseCountryCode)(match3[1].replace(/n$|an$|ian$|ish$|ese$|i$/i, '')) || (0, diaspora_ai_js_1.parseCountryCode)(match3[1]);
            toCountry = (0, diaspora_ai_js_1.parseCountryCode)(match3[2]);
        }
    }
    if (fromCountry && toCountry) {
        return { isVisa: true, from: fromCountry, to: toCountry };
    }
    // If we have a visa keyword but couldn't extract countries, still flag as visa query
    return { isVisa: true };
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
    if (visaCheck.isVisa && visaCheck.from && visaCheck.to) {
        // Call the Visa API
        console.log(`🛂 Visa query detected: ${visaCheck.from} → ${visaCheck.to}`);
        const visaResult = await (0, diaspora_ai_js_1.checkVisaRequirements)(visaCheck.from, visaCheck.to);
        if (visaResult.success && visaResult.data) {
            const visaResponse = (0, diaspora_ai_js_1.formatVisaResponse)(visaResult.data);
            // Send the FULL visa response as one chunk for consistent speech
            // This avoids pauses between sentences and is faster
            await onChunk(visaResponse);
            const latency = Date.now() - startTime;
            console.log(`🛂 Visa response generated in ${latency}ms`);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', visaResponse);
            return visaResponse;
        }
        // If visa API failed, fall through to Gemini
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
exports.generateGreeting = generateGreeting;
const generative_ai_1 = require("@google/generative-ai");
const config_js_1 = require("../config.js");
const test_business_js_1 = require("../knowledge/test-business.js");
const call_session_js_1 = require("./call-session.js");
// Initialize Gemini client
const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.gemini.apiKey);
/**
 * Generate a response using Gemini AI
 * Streams the response for lower latency
 */
async function generateResponse(streamSid, userMessage, onChunk) {
    const startTime = Date.now();
    // Add user message to conversation history
    (0, call_session_js_1.addMessage)(streamSid, 'user', userMessage);
    // Build the prompt with business context and conversation history
    const businessContext = (0, test_business_js_1.getBusinessContext)();
    const conversationHistory = (0, call_session_js_1.getConversationContext)(streamSid);
    const systemPrompt = `${businessContext}

CONVERSATION SO FAR:
${conversationHistory || '(This is the start of the conversation)'}

Remember: Keep your response concise and natural for a phone call. Don't use bullet points or formatting - just speak naturally.`;
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
                    parts: [{ text: 'Understood. I\'m ready to help customers of Tony\'s Burger Joint. I\'ll keep my responses natural and conversational.' }],
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
                        onChunk(sentence);
                    }
                }
            }
        }
        // Send any remaining text
        if (sentenceBuffer.trim()) {
            onChunk(sentenceBuffer.trim());
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
        onChunk(fallback);
        return fallback;
    }
}
/**
 * Generate a greeting for the start of a call
 */
async function generateGreeting(streamSid) {
    const greeting = "Hi there! Thanks for calling Tony's Burger Joint. How can I help you today?";
    (0, call_session_js_1.addMessage)(streamSid, 'assistant', greeting);
    return greeting;
}
//# sourceMappingURL=brain.js.map
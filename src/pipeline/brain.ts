import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { getBusinessContext } from '../knowledge/test-business.js';
import { getConversationContext, addMessage } from './call-session.js';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate a response using Gemini AI
 * Streams the response for lower latency
 */
export async function generateResponse(
  streamSid: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<string> {
  const startTime = Date.now();
  
  // Add user message to conversation history
  addMessage(streamSid, 'user', userMessage);
  
  // Build the prompt with business context and conversation history
  const businessContext = getBusinessContext();
  const conversationHistory = getConversationContext(streamSid);
  
  const systemPrompt = `${businessContext}

CONVERSATION SO FAR:
${conversationHistory || '(This is the start of the conversation)'}

Remember: Keep your response concise and natural for a phone call. Don't use bullet points or formatting - just speak naturally.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: config.gemini.model,
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
    addMessage(streamSid, 'assistant', fullResponse);
    
    return fullResponse;
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    
    // Fallback response
    const fallback = "I'm sorry, I'm having a bit of trouble understanding. Could you repeat that?";
    addMessage(streamSid, 'assistant', fallback);
    onChunk(fallback);
    
    return fallback;
  }
}

/**
 * Generate a greeting for the start of a call
 */
export async function generateGreeting(streamSid: string): Promise<string> {
  const greeting = "Hi there! Thanks for calling Tony's Burger Joint. How can I help you today?";
  addMessage(streamSid, 'assistant', greeting);
  return greeting;
}

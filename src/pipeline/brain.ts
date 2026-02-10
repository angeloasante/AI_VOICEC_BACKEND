import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { 
  getBusinessContext, 
  checkVisaRequirements, 
  formatVisaResponse,
  parseCountryCode 
} from '../knowledge/diaspora-ai.js';
import { getConversationContext, addMessage } from './call-session.js';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Check if user is asking about visa requirements
 */
function isVisaQuery(message: string): { isVisa: boolean; from?: string; to?: string } {
  const lowerMessage = message.toLowerCase();
  
  // Check for visa-related keywords
  const visaKeywords = ['visa', 'visas', 'travel requirement', 'do i need', 'can i travel', 'entry requirement'];
  const hasVisaKeyword = visaKeywords.some(kw => lowerMessage.includes(kw));
  
  if (!hasVisaKeyword) {
    return { isVisa: false };
  }
  
  // Try to extract countries from the message
  // Common patterns: "from X to Y", "X to Y", "travel to Y from X"
  const fromToPattern = /(?:from\s+)?(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/i;
  const match = lowerMessage.match(fromToPattern);
  
  if (match) {
    const fromCountry = parseCountryCode(match[1]);
    const toCountry = parseCountryCode(match[2]);
    
    if (fromCountry && toCountry) {
      return { isVisa: true, from: fromCountry, to: toCountry };
    }
  }
  
  // If we have a visa keyword but couldn't extract countries, still flag as visa query
  return { isVisa: true };
}

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
  
  // Check if this is a visa query
  const visaCheck = isVisaQuery(userMessage);
  
  if (visaCheck.isVisa && visaCheck.from && visaCheck.to) {
    // Call the Visa API
    console.log(`🛂 Visa query detected: ${visaCheck.from} → ${visaCheck.to}`);
    
    const visaResult = await checkVisaRequirements(visaCheck.from, visaCheck.to);
    
    if (visaResult.success && visaResult.data) {
      const visaResponse = formatVisaResponse(visaResult.data);
      
      // Send the visa response in chunks for natural speech
      const sentences = visaResponse.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (sentence.trim()) {
          onChunk(sentence.trim());
        }
      }
      
      const latency = Date.now() - startTime;
      console.log(`🛂 Visa response generated in ${latency}ms`);
      
      addMessage(streamSid, 'assistant', visaResponse);
      return visaResponse;
    }
    // If visa API failed, fall through to Gemini
  }
  
  // Build the prompt with business context and conversation history
  const businessContext = getBusinessContext();
  const conversationHistory = getConversationContext(streamSid);
  
  const systemPrompt = `${businessContext}

CONVERSATION SO FAR:
${conversationHistory || '(This is the start of the conversation)'}

Remember: Keep your response concise and natural for a phone call. Don't use bullet points or formatting - just speak naturally. Maximum 2-3 sentences.`;

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
  const greeting = "Hello! Thank you for calling Diaspora AI, your AI-powered travel assistant. How can I help you today?";
  addMessage(streamSid, 'assistant', greeting);
  return greeting;
}

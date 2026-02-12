"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
exports.generateGreeting = generateGreeting;
const generative_ai_1 = require("@google/generative-ai");
const config_js_1 = require("../config.js");
const diaspora_ai_js_1 = require("../knowledge/diaspora-ai.js");
const call_session_js_1 = require("./call-session.js");
const sms_js_1 = require("../services/sms.js");
// Initialize Gemini client
const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.gemini.apiKey);
/**
 * Check if user consents to receiving SMS or is proactively requesting it
 * Returns { consents, declines, proactiveRequest }
 */
function checkSMSConsent(message) {
    const lowerMessage = message.toLowerCase().trim();
    // Proactive SMS request patterns - user asking for SMS without being offered
    const proactivePatterns = [
        'send me', 'text me', 'message me', 'sms me',
        'can you send', 'could you send', 'can you text',
        'send an sms', 'send a text', 'send a message',
        'send it to me', 'send that to me',
        'text that', 'message that', 'sms that',
    ];
    const proactiveRequest = proactivePatterns.some(phrase => lowerMessage.includes(phrase));
    // Consent phrases (response to offer)
    const consentPhrases = [
        'yes', 'yeah', 'yep', 'sure', 'please', 'ok', 'okay',
        'that would be great', 'that would be helpful',
        'i would like that', 'i\'d like that',
        'go ahead', 'please do', 'yes please',
    ];
    // Decline phrases
    const declinePhrases = [
        'no', 'nope', 'no thanks', 'no thank you',
        'don\'t', 'do not', 'i\'m good', 'i\'m fine',
        'that\'s okay', 'not necessary', 'no need',
    ];
    const consents = consentPhrases.some(phrase => lowerMessage.includes(phrase));
    const declines = declinePhrases.some(phrase => lowerMessage.includes(phrase));
    return { consents: consents || proactiveRequest, declines, proactiveRequest };
}
/**
 * Check if user wants to end the call
 * Returns true for goodbye phrases
 */
function isGoodbyeIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    // Direct goodbye phrases
    const goodbyePhrases = [
        'goodbye', 'good bye', 'bye', 'bye bye', 'byebye',
        "that's all", 'thats all', 'that is all',
        'thanks bye', 'thank you bye', 'thanks goodbye',
        "i'm done", 'im done', 'i am done',
        'nothing else', 'no thanks', 'no thank you',
        'have a good day', 'have a nice day',
        'take care', 'cheers', 'later', 'see you',
        'end call', 'hang up', "i'll go", 'i have to go',
        "that's it", 'thats it', 'that will be all',
        'no more questions', 'no further questions',
    ];
    // Check if message matches any goodbye phrase
    for (const phrase of goodbyePhrases) {
        if (lowerMessage.includes(phrase)) {
            console.log(`👋 Goodbye intent detected: "${message}"`);
            return true;
        }
    }
    return false;
}
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
    // Examples: "I'm a Ghanaian citizen", "Ghanaian passport", "I'm Ghanaian", "I hold a Nigerian passport"
    const citizenshipPatterns = [
        // Direct citizenship statements
        /(?:i'm|i am|im)\s+(?:a\s+)?(\w+)\s+citizen/i, // "I'm a Ghanaian citizen"
        /(\w+)\s+citizen/i, // "Ghanaian citizen"
        /(\w+)\s+national\b/i, // "Ghanaian national"
        /citizen\s+of\s+(\w+)/i, // "citizen of Ghana"
        /nationality\s+(?:is\s+)?(\w+)/i, // "nationality is Ghanaian"
        // Passport references
        /(\w+)\s+passport/i, // "Ghanaian passport"
        /(?:i\s+hold|holding|have)\s+(?:a\s+)?(\w+)\s+passport/i, // "I hold a Ghanaian passport"
        /(?:with|using|on)\s+(?:a\s+)?(\w+)\s+passport/i, // "with a Ghanaian passport", "traveling on a Ghanaian passport"
        /passport\s+(?:is\s+)?(?:from\s+)?(\w+)/i, // "my passport is Ghanaian"
        // "I'm [nationality]" patterns
        /(?:i'm|i am|im)\s+(?:a\s+)?(\w+)$/i, // "I'm a Ghanaian" at end of message
        /(?:i'm|i am|im)\s+(?:a\s+)?(\w+)\s+(?:living|based|residing|currently)/i, // "I'm a Ghanaian living in..."
        /(?:i'm|i am|im)\s+(\w+)\s+and/i, // "I'm Ghanaian and..."
        /(?:i'm|i am|im)\s+(?:a\s+)?(\w+)\s*[,\.]/i, // "I'm Ghanaian, ..." or "I'm Ghanaian."
        // "as a [nationality]" patterns  
        /as\s+(?:a\s+)?(\w+)\s+(?:trying|going|wanting|traveling|travelling|planning|looking)/i, // "as a Ghanaian trying to..."
        /as\s+(?:a\s+)?(\w+)\s+(?:citizen|national|person)/i, // "as a Ghanaian citizen"
        /as\s+(?:a\s+)?(\w+)\s+(?:i\s+need|do\s+i)/i, // "as a Ghanaian I need" or "as a Ghanaian do I need"
        // "from [country]" patterns - origin often means passport
        /(?:i'm|i am|im)\s+from\s+(\w+)/i, // "I'm from Ghana"
        /(?:i\s+come|coming)\s+from\s+(\w+)/i, // "I come from Ghana"
        /originally\s+from\s+(\w+)/i, // "originally from Ghana"
        /(?:born|raised)\s+in\s+(\w+)/i, // "born in Ghana" (likely passport)
        // "[nationality] here/person" patterns
        /(\w+)\s+here\b/i, // "Ghanaian here"
        /(\w+)\s+person\s+(?:going|trying|wanting|traveling)/i, // "Ghanaian person going to..."
        // "a [nationality] going/traveling" - very common phone pattern
        /\ba\s+(\w+)\s+(?:going|trying|traveling|travelling|wanting)\s+to/i, // "a Ghanaian going to UK"
        /\b(\w+)\s+(?:going|trying|traveling|travelling|wanting)\s+to\s+(?:go\s+)?(?:to\s+)?(\w+)/i, // "Ghanaian trying to go to UK"
        // Requirements for [nationality]
        /(?:visa|requirements?)\s+(?:for|as)\s+(?:a\s+)?(\w+)/i, // "visa for Ghanaians", "requirements for a Ghanaian"
        /(?:for|as)\s+(?:a\s+)?(\w+)\s+(?:citizen|national|passport)/i, // "for a Ghanaian citizen"
    ];
    for (const pattern of citizenshipPatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
            const nationality = match[1];
            // Filter out common false positives (verbs, pronouns, etc.)
            const falsePositiveWords = [
                'saying', 'going', 'trying', 'looking', 'calling', 'asking', 'thinking',
                'here', 'there', 'just', 'also', 'still', 'now', 'back', 'good', 'fine',
                'done', 'sorry', 'sure', 'okay', 'ready', 'able', 'glad', 'happy',
            ];
            if (falsePositiveWords.includes(nationality.toLowerCase())) {
                continue; // Skip this match, try next pattern
            }
            console.log(`🛂 Citizenship pattern matched: "${nationality}" from pattern: ${pattern}`);
            // Convert nationality to country code (Ghanaian -> GH)
            // Try the full word first (ghanaian -> GH), then try stripping suffix
            passport = (0, diaspora_ai_js_1.parseCountryCode)(nationality);
            if (!passport) {
                // Try stripping common nationality suffixes
                const stripped = nationality.replace(/n$|an$|ian$|ish$|ese$|i$/i, '');
                passport = (0, diaspora_ai_js_1.parseCountryCode)(stripped);
            }
            if (passport) {
                console.log(`🛂 Passport detected: ${passport} (from "${nationality}")`);
                break;
            }
        }
    }
    // Pattern 2: Detect destination - "to Zanzibar", "going to Tanzania", etc.
    const destPatterns = [
        /(?:to|going to|go to|trying to go to|travel(?:ing|ling)?\s+to|visit(?:ing)?|fly(?:ing)?\s+to)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
    ];
    for (const pattern of destPatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
            // Filter out false positives
            const word = match[1].toLowerCase();
            const falsePositives = ['me', 'you', 'us', 'them', 'know', 'check', 'help', 'book', 'get', 'see', 'find'];
            if (!falsePositives.includes(word)) {
                destination = (0, diaspora_ai_js_1.parseCountryCode)(match[1]);
                if (destination) {
                    console.log(`🛂 Destination detected: ${destination} (from "${match[1]}")`);
                    break;
                }
            }
        }
    }
    // Pattern 3: "from X" - this often means passport/origin country in visa context
    // Handles both "from Ghana to South Africa" AND standalone "From Ghana."
    if (!passport) {
        // First try "from X to Y" pattern
        const fromToPattern = /from\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+to\s+/i;
        const fromToMatch = lowerMessage.match(fromToPattern);
        if (fromToMatch) {
            const fromCountry = (0, diaspora_ai_js_1.parseCountryCode)(fromToMatch[1]);
            if (fromCountry) {
                passport = fromCountry;
                console.log(`🛂 Passport inferred from "from X to Y": ${passport} (from "${fromToMatch[1]}")`);
            }
        }
        // Also try standalone "from Ghana" or "from Ghana." at end
        if (!passport) {
            const fromStandalonePattern = /from\s+(?:the\s+)?(\w+(?:\s+\w+)?)\.?$/i;
            const fromStandaloneMatch = lowerMessage.match(fromStandalonePattern);
            if (fromStandaloneMatch) {
                const fromCountry = (0, diaspora_ai_js_1.parseCountryCode)(fromStandaloneMatch[1]);
                if (fromCountry) {
                    passport = fromCountry;
                    console.log(`🛂 Passport inferred from standalone "from X": ${passport} (from "${fromStandaloneMatch[1]}")`);
                }
            }
        }
        // Also try "travelling/traveling from X"
        if (!passport) {
            const travelFromPattern = /(?:travel(?:l)?ing|going)\s+from\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i;
            const travelFromMatch = lowerMessage.match(travelFromPattern);
            if (travelFromMatch) {
                const fromCountry = (0, diaspora_ai_js_1.parseCountryCode)(travelFromMatch[1]);
                if (fromCountry) {
                    passport = fromCountry;
                    console.log(`🛂 Passport inferred from "travelling from X": ${passport} (from "${travelFromMatch[1]}")`);
                }
            }
        }
    }
    // Pattern 4: Detect residence - "living in UK", "UK resident", "based in UK"
    // Only when explicitly about residence, not travel origin
    const residencePatterns = [
        /living\s+in\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
        /based\s+in\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
        /residing\s+in\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
        /(\w+)\s+resident/i,
    ];
    for (const pattern of residencePatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
            const res = (0, diaspora_ai_js_1.parseCountryCode)(match[1]);
            // Only set residence if it's different from passport
            if (res && res !== passport) {
                residence = res;
                console.log(`🛂 Residence detected: ${residence} (from "${match[1]}")`);
                break;
            }
        }
    }
    // Fallback: Simple "X to Y" pattern if no passport detected
    // BUT filter out false positives like "listen to me", "talk to me", etc.
    if (!passport && !destination) {
        const simplePattern = /(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/i;
        const match = lowerMessage.match(simplePattern);
        if (match) {
            // Filter out common false positives
            const falsePositives = ['me', 'you', 'us', 'them', 'him', 'her', 'it', 'this', 'that'];
            const toWord = match[2].toLowerCase();
            if (!falsePositives.includes(toWord)) {
                const from = (0, diaspora_ai_js_1.parseCountryCode)(match[1]);
                const to = (0, diaspora_ai_js_1.parseCountryCode)(match[2]);
                if (from && to) {
                    passport = from;
                    destination = to;
                }
            }
        }
    }
    // ALWAYS return any extracted info so we can accumulate across messages
    // Even if it's not a "visa query" per se, we want to track passport/destination
    const hasExtractedInfo = passport || destination || residence;
    const isVisaRelated = hasVisaKeyword || !!(passport && destination);
    if (hasExtractedInfo) {
        console.log(`🛂 Visa query parsed:`, { passport, destination, residence, isVisa: isVisaRelated });
        return {
            isVisa: isVisaRelated,
            passport: passport || undefined,
            destination: destination || undefined,
            residence: residence || undefined
        };
    }
    if (hasVisaKeyword) {
        return { isVisa: true };
    }
    return { isVisa: false };
}
/**
 * Generate a response using Gemini AI
 * Streams the response for lower latency
 * Returns { response: string, shouldEndCall: boolean }
 */
async function generateResponse(streamSid, userMessage, onChunk) {
    const startTime = Date.now();
    // Add user message to conversation history
    (0, call_session_js_1.addMessage)(streamSid, 'user', userMessage);
    // Check for goodbye intent FIRST
    if (isGoodbyeIntent(userMessage)) {
        // Before saying goodbye, send SMS if consented and we have visa info
        const goodbyeVisaCtx = (0, call_session_js_1.getVisaContext)(streamSid);
        const goodbyeCallerPhone = (0, call_session_js_1.getCallerPhone)(streamSid);
        if ((0, call_session_js_1.canSendSMS)(streamSid) && goodbyeVisaCtx?.lastVisaResponse && goodbyeCallerPhone) {
            console.log(`📱 Sending visa info SMS on call end...`);
            const smsResult = await (0, sms_js_1.sendVisaInfoSMS)(goodbyeCallerPhone, goodbyeVisaCtx.passport || 'Your country', goodbyeVisaCtx.destination || 'destination', goodbyeVisaCtx.visaRequired ?? true, goodbyeVisaCtx.lastVisaResponse.substring(0, 300) // Keep SMS concise
            );
            if (smsResult.success) {
                (0, call_session_js_1.markSMSSent)(streamSid);
            }
        }
        const goodbyeResponse = "Alright, take care! Safe travels and feel free to call us anytime. Bye!";
        // Mark the call for ending
        (0, call_session_js_1.markCallForEnding)(streamSid);
        await onChunk(goodbyeResponse);
        (0, call_session_js_1.addMessage)(streamSid, 'assistant', goodbyeResponse);
        const latency = Date.now() - startTime;
        console.log(`👋 Goodbye response generated in ${latency}ms - Call will end after audio plays`);
        return { response: goodbyeResponse, shouldEndCall: true };
    }
    // Check for SMS consent response (after we offered to send SMS) OR proactive SMS request
    const visaCtx = (0, call_session_js_1.getVisaContext)(streamSid);
    const callerPhone = (0, call_session_js_1.getCallerPhone)(streamSid);
    const smsConsentCheck = checkSMSConsent(userMessage);
    // Handle proactive SMS requests (user asks "can you send me an SMS?")
    if (smsConsentCheck.proactiveRequest && callerPhone && (0, sms_js_1.isSMSEnabled)()) {
        console.log(`📱 Proactive SMS request detected: "${userMessage}"`);
        if (visaCtx?.lastVisaResponse) {
            // We have visa info to send
            (0, call_session_js_1.setSMSConsent)(streamSid, true);
            const smsResult = await (0, sms_js_1.sendVisaInfoSMS)(callerPhone, visaCtx.passport || 'Your country', visaCtx.destination || 'destination', visaCtx.visaRequired ?? true, visaCtx.lastVisaResponse.substring(0, 300));
            let smsResponse;
            if (smsResult.success) {
                (0, call_session_js_1.markSMSSent)(streamSid);
                smsResponse = "Done! I've just sent the visa info to your phone. Anything else you need?";
            }
            else {
                console.error(`📱 SMS failed:`, smsResult.error);
                smsResponse = "Hmm, I'm having trouble sending that right now. You can find all the info on our website at diasporaai.dev. Anything else I can help with?";
            }
            await onChunk(smsResponse);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', smsResponse);
            return { response: smsResponse, shouldEndCall: false };
        }
        else {
            // No visa info yet - ask what they want sent
            const noInfoResponse = "Sure, I can text you! What info would you like me to send? If you tell me where you're traveling from and to, I can send you the visa requirements.";
            await onChunk(noInfoResponse);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', noInfoResponse);
            return { response: noInfoResponse, shouldEndCall: false };
        }
    }
    // Handle consent responses (user said yes/no to our SMS offer)
    if (visaCtx?.lastVisaResponse && callerPhone && !(0, call_session_js_1.hasSMSConsent)(streamSid)) {
        if (smsConsentCheck.consents) {
            // User said yes - send the SMS
            (0, call_session_js_1.setSMSConsent)(streamSid, true);
            console.log(`📱 User consented to SMS, sending visa info...`);
            const smsResult = await (0, sms_js_1.sendVisaInfoSMS)(callerPhone, visaCtx.passport || 'Your country', visaCtx.destination || 'destination', visaCtx.visaRequired ?? true, visaCtx.lastVisaResponse.substring(0, 300));
            let smsResponse;
            if (smsResult.success) {
                (0, call_session_js_1.markSMSSent)(streamSid);
                smsResponse = "I've sent that information to your phone. Is there anything else I can help you with?";
            }
            else {
                smsResponse = "I'm sorry, I couldn't send the text message right now. Is there anything else I can help you with?";
            }
            await onChunk(smsResponse);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', smsResponse);
            return { response: smsResponse, shouldEndCall: false };
        }
        else if (smsConsentCheck.declines) {
            // User said no
            const declineResponse = "No problem at all! Is there anything else I can help you with?";
            await onChunk(declineResponse);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', declineResponse);
            return { response: declineResponse, shouldEndCall: false };
        }
    }
    // Check if THIS message contains visa-related info
    const visaCheck = isVisaQuery(userMessage);
    // Update accumulated visa context with any new info from this message
    if (visaCheck.passport || visaCheck.destination || visaCheck.residence) {
        (0, call_session_js_1.updateVisaContext)(streamSid, {
            passport: visaCheck.passport,
            destination: visaCheck.destination,
            residence: visaCheck.residence,
        });
    }
    // Get accumulated context (may have info from previous messages)
    const ctx = (0, call_session_js_1.getVisaContext)(streamSid);
    // Check if user is confirming (said "yes", "correct", "that's right", etc.)
    const isConfirmation = /^(yes|yeah|yep|correct|that's right|right|exactly|affirmative|ok|okay|sure|please|go ahead)\.?$/i.test(userMessage.trim());
    // If we have complete visa info (from accumulated context) AND either:
    // 1. User just confirmed, OR
    // 2. All info was in this message
    const hasAllInfo = ctx?.passport && ctx?.destination;
    const shouldCallApi = hasAllInfo && !ctx?.apiCalled && (isConfirmation || (visaCheck.passport && visaCheck.destination));
    // ALSO force API call if we have all info and Gemini would otherwise just chat
    const forceApiCall = hasAllInfo && !ctx?.apiCalled;
    if (forceApiCall) {
        const fromCountry = ctx.passport;
        const toCountry = ctx.destination;
        console.log(`🛂 ====== VISA API CALL ======`);
        console.log(`🛂 Visa query - calling API NOW`);
        console.log(`   📕 Passport: ${fromCountry}`);
        console.log(`   ✈️  Destination: ${toCountry}`);
        if (ctx.residence) {
            console.log(`   🏠 Residence: ${ctx.residence} (noted but using passport for visa check)`);
        }
        console.log(`🛂 API URL: https://app.diasporaai.dev/api/v1/visa?from=${fromCountry}&to=${toCountry}`);
        // Mark that we're calling the API to prevent duplicate calls
        (0, call_session_js_1.markVisaApiCalled)(streamSid);
        const visaResult = await (0, diaspora_ai_js_1.checkVisaRequirements)(fromCountry, toCountry);
        console.log(`🛂 Visa API response:`, JSON.stringify(visaResult, null, 2));
        if (visaResult.success && visaResult.data) {
            const visaResponse = (0, diaspora_ai_js_1.formatVisaResponse)(visaResult.data);
            // Build response with SMS offer if enabled
            let fullResponse = visaResponse;
            const callerPhone = (0, call_session_js_1.getCallerPhone)(streamSid);
            if ((0, sms_js_1.isSMSEnabled)() && callerPhone && !(0, call_session_js_1.hasSMSConsent)(streamSid)) {
                fullResponse += " Would you like me to send this information to you as a text message?";
            }
            // Send the FULL visa response as one chunk for consistent speech
            await onChunk(fullResponse);
            const latency = Date.now() - startTime;
            console.log(`🛂 Visa response generated in ${latency}ms`);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', fullResponse);
            // Store visa data for potential SMS later
            (0, call_session_js_1.updateVisaContext)(streamSid, {
                lastVisaResponse: visaResponse,
                visaRequired: visaResult.data.visa?.required ?? true,
            });
            return { response: fullResponse, shouldEndCall: false };
        }
        else {
            // Visa API failed or route not available - give user-friendly feedback
            console.log(`🛂 Visa API failed:`, visaResult.error);
            const fallbackResponse = `I don't currently have visa information for travel from ${fromCountry} to ${toCountry} in my system. I'd recommend checking our website at app.diasporaai.dev for the most up-to-date visa requirements, or I can connect you with one of our human agents who can help. Would you like me to do that?`;
            await onChunk(fallbackResponse);
            (0, call_session_js_1.addMessage)(streamSid, 'assistant', fallbackResponse);
            const latency = Date.now() - startTime;
            console.log(`🛂 Visa fallback response in ${latency}ms`);
            return { response: fallbackResponse, shouldEndCall: false };
        }
    }
    // If we detected visa intent but missing some info, log it
    if (visaCheck.isVisa && !hasAllInfo) {
        console.log(`🛂 Partial visa info - accumulating context:`, {
            accumulated: ctx,
            thisMessage: { passport: visaCheck.passport, destination: visaCheck.destination }
        });
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
        return { response: fullResponse, shouldEndCall: false };
    }
    catch (error) {
        console.error('❌ Gemini API error:', error);
        // Fallback response
        const fallback = "I'm sorry, I'm having a bit of trouble understanding. Could you repeat that?";
        (0, call_session_js_1.addMessage)(streamSid, 'assistant', fallback);
        await onChunk(fallback);
        return { response: fallback, shouldEndCall: false };
    }
}
/**
 * Generate a greeting for the start of a call
 */
async function generateGreeting(streamSid) {
    const greeting = "Hey there! Thanks for calling Diaspora AI. What can I help you with today?";
    (0, call_session_js_1.addMessage)(streamSid, 'assistant', greeting);
    return greeting;
}
//# sourceMappingURL=brain.js.map
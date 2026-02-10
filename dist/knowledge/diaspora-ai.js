"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countryCodeMap = exports.diasporaAIBusiness = void 0;
exports.getBusinessContext = getBusinessContext;
exports.checkVisaRequirements = checkVisaRequirements;
exports.formatVisaResponse = formatVisaResponse;
exports.parseCountryCode = parseCountryCode;
const config_js_1 = require("../config.js");
/**
 * Diaspora AI - AI-powered travel booking platform for the African diaspora
 */
exports.diasporaAIBusiness = {
    name: "Diaspora AI",
    type: "AI-Powered Travel Booking Platform",
    description: "Diaspora AI is an AI-powered travel booking platform built specifically for the African diaspora. Book flights to Africa through natural conversation on WhatsApp or our website. We accept both cards and mobile money payments.",
    hours: "AI Bot: 24/7 available. Live Support: 9 AM - 6 PM GMT",
    address: "Plymouth, Devon, United Kingdom",
    phone: "+44 7367 000489",
    website: "diasporaai.dev",
    bookingApp: "app.diasporaai.dev",
    // Not a restaurant, so no menu - but we have services
    menu: [],
    // Services offered
    services: [
        {
            name: "Flight Booking via WhatsApp",
            description: "Book flights through natural conversation on WhatsApp. Just message what you need like you're texting a friend.",
            features: ["24/7 AI-powered booking", "Natural language - no forms", "3-5 minute booking process"]
        },
        {
            name: "Website Booking",
            description: "Search, compare, and book flights at app.diasporaai.dev",
            features: ["Compare 50-80+ flight options", "Real-time pricing", "Secure checkout"]
        },
        {
            name: "Live Human Support",
            description: "Request to speak with a real person at any time during your booking",
            features: ["Complex itinerary help", "Booking changes", "Complaints handling"]
        },
        {
            name: "Visa Requirements Information",
            description: "Get visa requirements for travel between countries",
            features: ["Real-time data", "Document requirements", "Application guidance"]
        }
    ],
    // Payment methods
    paymentMethods: {
        cards: ["Visa", "Mastercard", "American Express", "Apple Pay", "Google Pay"],
        mobileMoney: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money", "M-Pesa"],
        other: ["Bank transfers", "USSD", "EFT (South Africa)"]
    },
    // Routes covered
    popularRoutes: [
        { from: "London", to: "Accra, Ghana", airlines: ["British Airways", "KLM", "Turkish Airlines", "Ethiopian Airlines"] },
        { from: "London", to: "Lagos, Nigeria", airlines: ["British Airways", "Virgin Atlantic", "Ethiopian Airlines"] },
        { from: "London", to: "Nairobi, Kenya", airlines: ["Kenya Airways", "British Airways", "Ethiopian Airlines"] },
        { from: "London", to: "Johannesburg, South Africa", airlines: ["British Airways", "Virgin Atlantic", "South African Airways"] }
    ],
    // Company info
    founder: "Travis - self-taught developer originally from Ghana, based in Plymouth, UK",
    founded: "2024",
    specialties: [
        "African diaspora travel needs",
        "Accepting mobile money payments (not just cards)",
        "WhatsApp-first booking experience",
        "No app downloads or account creation needed"
    ],
    // FAQ
    faq: [
        {
            question: "How do I book a flight?",
            answer: "You can book through our website at app.diasporaai.dev or message us on WhatsApp. Just tell us where you want to go, when, and how many passengers."
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept Visa, Mastercard, American Express, Apple Pay through Stripe. For African payments, we accept MTN Mobile Money, Vodafone Cash, AirtelTigo Money, M-Pesa, bank transfers, and USSD."
        },
        {
            question: "Can I pay with mobile money?",
            answer: "Yes! We accept MTN MoMo, Vodafone Cash, AirtelTigo Money, M-Pesa, and bank transfers across Africa."
        },
        {
            question: "What airlines do you work with?",
            answer: "We have access to over 300 airlines including Ethiopian Airlines, Kenya Airways, British Airways, KLM, Turkish Airlines, Air France, and many more."
        },
        {
            question: "Can I speak to a real person?",
            answer: "Absolutely! At any point, just say you'd like to speak to a human and we'll connect you with our support team."
        },
        {
            question: "What routes do you cover?",
            answer: "We focus on UK to Africa routes, particularly Ghana, Nigeria, Kenya, and South Africa. We're expanding to European and US departure points. We can book flights to virtually any destination worldwide."
        },
        {
            question: "How do I check visa requirements?",
            answer: "Just ask me! Tell me which country you're from and where you want to travel, and I'll look up the visa requirements for you."
        }
    ]
};
/**
 * Get business context for AI prompts
 */
function getBusinessContext() {
    const biz = exports.diasporaAIBusiness;
    return `You are an AI phone assistant for ${biz.name}, ${biz.type}.

ABOUT THE COMPANY:
${biz.description}

Founded in ${biz.founded} by ${biz.founder}.

WHAT WE DO:
- Book flights to Africa via WhatsApp or website
- Accept card payments AND mobile money (MTN MoMo, Vodafone Cash, M-Pesa, etc.)
- 24/7 AI-powered booking with live human support available
- Access to 300+ airlines worldwide
- No app downloads or accounts needed - just message and book

POPULAR ROUTES:
${biz.popularRoutes?.map(r => `- ${r.from} to ${r.to}`).join('\n') || 'Various routes to Africa'}

PAYMENT METHODS:
- Cards: ${biz.paymentMethods?.cards.join(', ') || 'Visa, Mastercard'}
- Mobile Money: ${biz.paymentMethods?.mobileMoney.join(', ') || 'MTN MoMo, M-Pesa'}
- Other: ${biz.paymentMethods?.other.join(', ') || 'Bank transfers'}

CONTACT:
- Website: ${biz.website}
- Booking: ${biz.bookingApp}
- Hours: ${biz.hours}
- Phone/WhatsApp: ${biz.phone}

VISA REQUIREMENTS:
You can check visa requirements for any travel route. If someone asks about visa requirements, use the checkVisaRequirements function to get accurate information.

IMPORTANT INSTRUCTIONS:
1. You are a friendly, helpful voice assistant on a phone call
2. Keep responses SHORT and conversational (this is a phone call, not a text chat)
3. Don't use bullet points, lists, or formatting - speak naturally
4. If someone wants to book a flight, direct them to WhatsApp or app.diasporaai.dev
5. If someone asks about visa requirements, extract the countries and provide info
6. Be warm and personable - we're here to help the African diaspora travel easier
7. If asked complex questions, offer to transfer to a human agent
8. CRITICAL - TRANSCRIPTION CORRECTION: The caller may have an accent causing transcription errors. Intelligently interpret what they mean:
   - "Danzaba", "Tansania" = Tanzania/Zanzibar
   - "United Schendham", "you kay" = UK/United Kingdom
   - Always confirm the countries with the caller before giving visa info
   - Example: "Just to confirm, you want to travel from the UK to Tanzania, is that right?"
9. When someone mentions countries, ALWAYS extract them and ask the visa question directly rather than just chatting`;
}
/**
 * Call the Diaspora AI Visa API to get visa requirements
 */
async function checkVisaRequirements(fromCountry, toCountry) {
    const apiKey = config_js_1.config.diasporaAI?.visaApiKey;
    if (!apiKey) {
        console.warn('⚠️ Diaspora AI Visa API key not configured');
        return {
            success: false,
            error: 'Visa API not configured'
        };
    }
    try {
        const response = await fetch(`https://app.diasporaai.dev/api/v1/visa?from=${encodeURIComponent(fromCountry)}&to=${encodeURIComponent(toCountry)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error?.message || `API error: ${response.status}`
            };
        }
        const data = await response.json();
        return {
            success: true,
            data: data.data
        };
    }
    catch (error) {
        console.error('❌ Visa API error:', error);
        return {
            success: false,
            error: 'Failed to fetch visa requirements'
        };
    }
}
/**
 * Format visa requirements into a natural speech response
 */
function formatVisaResponse(visaData) {
    if (!visaData) {
        return "I couldn't find visa information for that route. Please check with the embassy directly.";
    }
    const visa = visaData.visa;
    const docs = visaData.documents;
    const route = visaData.route;
    let response = '';
    // Main visa status
    if (visa.required) {
        response = `For travel from ${route.from.name} to ${route.to.name}, you will need a visa. `;
        if (visa.visaType) {
            response += `You'll need a ${visa.visaType}. `;
        }
        if (visa.evisaAvailable) {
            response += `Good news - you can apply for an e-visa online. `;
        }
        else if (visa.visaOnArrival) {
            response += `You can get a visa on arrival. `;
        }
        else {
            response += `You'll need to apply at the embassy or consulate before traveling. `;
        }
    }
    else {
        response = `Great news! Citizens of ${route.from.name} don't need a visa to visit ${route.to.name}. `;
        if (visa.visaFreeDays) {
            response += `You can stay for up to ${visa.visaFreeDays} days without a visa. `;
        }
    }
    // Passport requirements
    if (docs?.passport?.minimumValidityMonths) {
        response += `Your passport should be valid for at least ${docs.passport.minimumValidityMonths} months. `;
    }
    // Key requirements
    if (docs?.requirements?.yellowFeverCertificate) {
        response += `You'll need a yellow fever vaccination certificate. `;
    }
    response += `Would you like me to help you book a flight for this trip?`;
    return response;
}
// Country code mapping for natural language
exports.countryCodeMap = {
    // Africa
    'ghana': 'GH', 'accra': 'GH', 'ghanaian': 'GH', 'ghan': 'GH',
    'nigeria': 'NG', 'lagos': 'NG', 'abuja': 'NG', 'nigerian': 'NG',
    'kenya': 'KE', 'nairobi': 'KE', 'kenyan': 'KE',
    'south africa': 'ZA', 'johannesburg': 'ZA', 'cape town': 'ZA', 'south african': 'ZA',
    'egypt': 'EG', 'cairo': 'EG', 'egyptian': 'EG',
    'morocco': 'MA', 'moroccan': 'MA',
    'rwanda': 'RW', 'kigali': 'RW', 'rwandan': 'RW',
    'tanzania': 'TZ', 'dar es salaam': 'TZ', 'tanzanian': 'TZ', 'zanzibar': 'TZ', 'danzaba': 'TZ', 'tansania': 'TZ',
    'ethiopia': 'ET', 'addis ababa': 'ET', 'ethiopian': 'ET',
    'senegal': 'SN', 'dakar': 'SN', 'senegalese': 'SN',
    'cameroon': 'CM', 'cameroonian': 'CM',
    'ivory coast': 'CI', 'cote divoire': 'CI', 'ivorian': 'CI',
    'uganda': 'UG', 'kampala': 'UG', 'ugandan': 'UG',
    'zimbabwe': 'ZW', 'harare': 'ZW', 'zimbabwean': 'ZW',
    // Europe
    'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'london': 'GB', 'britain': 'GB', 'british': 'GB', 'united schendham': 'GB', 'you kay': 'GB',
    'germany': 'DE', 'berlin': 'DE', 'german': 'DE',
    'france': 'FR', 'paris': 'FR', 'french': 'FR',
    'netherlands': 'NL', 'amsterdam': 'NL', 'holland': 'NL', 'dutch': 'NL',
    'spain': 'ES', 'madrid': 'ES', 'spanish': 'ES',
    'italy': 'IT', 'rome': 'IT', 'italian': 'IT',
    'albania': 'AL', 'tirana': 'AL', 'albanian': 'AL',
    'portugal': 'PT', 'lisbon': 'PT', 'portuguese': 'PT',
    'greece': 'GR', 'athens': 'GR', 'greek': 'GR',
    'poland': 'PL', 'warsaw': 'PL', 'polish': 'PL',
    'ireland': 'IE', 'dublin': 'IE', 'irish': 'IE',
    'belgium': 'BE', 'brussels': 'BE', 'belgian': 'BE',
    'switzerland': 'CH', 'zurich': 'CH', 'swiss': 'CH',
    'austria': 'AT', 'vienna': 'AT', 'austrian': 'AT',
    'sweden': 'SE', 'stockholm': 'SE', 'swedish': 'SE',
    'norway': 'NO', 'oslo': 'NO', 'norwegian': 'NO',
    'denmark': 'DK', 'copenhagen': 'DK', 'danish': 'DK',
    'finland': 'FI', 'helsinki': 'FI', 'finnish': 'FI',
    'czech republic': 'CZ', 'czechia': 'CZ', 'prague': 'CZ', 'czech': 'CZ',
    'turkey': 'TR', 'istanbul': 'TR', 'ankara': 'TR', 'turkish': 'TR',
    'russia': 'RU', 'moscow': 'RU', 'russian': 'RU',
    // Americas
    'usa': 'US', 'united states': 'US', 'america': 'US', 'new york': 'US', 'american': 'US',
    'canada': 'CA', 'toronto': 'CA', 'canadian': 'CA',
    'brazil': 'BR', 'sao paulo': 'BR', 'brazilian': 'BR',
    'mexico': 'MX', 'mexico city': 'MX', 'mexican': 'MX',
    // Middle East
    'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE', 'emirati': 'AE',
    'saudi arabia': 'SA', 'riyadh': 'SA', 'saudi': 'SA',
    'qatar': 'QA', 'doha': 'QA', 'qatari': 'QA',
    // Asia
    'singapore': 'SG', 'singaporean': 'SG',
    'china': 'CN', 'beijing': 'CN', 'chinese': 'CN',
    'india': 'IN', 'delhi': 'IN', 'mumbai': 'IN', 'indian': 'IN',
    'japan': 'JP', 'tokyo': 'JP', 'japanese': 'JP',
    'south korea': 'KR', 'seoul': 'KR', 'korean': 'KR',
    'thailand': 'TH', 'bangkok': 'TH', 'thai': 'TH',
    'malaysia': 'MY', 'kuala lumpur': 'MY', 'malaysian': 'MY',
    'indonesia': 'ID', 'jakarta': 'ID', 'indonesian': 'ID',
    'philippines': 'PH', 'manila': 'PH', 'filipino': 'PH',
    'vietnam': 'VN', 'hanoi': 'VN', 'vietnamese': 'VN',
    // Oceania
    'australia': 'AU', 'sydney': 'AU', 'melbourne': 'AU', 'australian': 'AU',
    'new zealand': 'NZ', 'auckland': 'NZ', 'kiwi': 'NZ',
};
/**
 * Extract country code from natural language
 */
function parseCountryCode(input) {
    const normalized = input.toLowerCase().trim();
    // Check direct mapping
    if (exports.countryCodeMap[normalized]) {
        return exports.countryCodeMap[normalized];
    }
    // Check if it's already a valid 2-letter code
    if (/^[A-Z]{2}$/i.test(normalized)) {
        return normalized.toUpperCase();
    }
    // Search for partial matches
    for (const [name, code] of Object.entries(exports.countryCodeMap)) {
        if (normalized.includes(name) || name.includes(normalized)) {
            return code;
        }
    }
    return null;
}
//# sourceMappingURL=diaspora-ai.js.map
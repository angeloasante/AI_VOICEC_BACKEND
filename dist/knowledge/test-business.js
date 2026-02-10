"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testBusiness = void 0;
exports.getBusinessContext = getBusinessContext;
// Hardcoded test business - a fake restaurant for MVP testing
exports.testBusiness = {
    name: "Tony's Burger Joint",
    type: "Fast Food Restaurant",
    description: "A friendly neighbourhood burger restaurant serving handcrafted burgers, crispy fries, and refreshing drinks. We pride ourselves on fresh ingredients and quick service.",
    hours: "Monday to Friday: 11am - 10pm, Saturday and Sunday: 12pm - 11pm",
    address: "123 High Street, London, W1A 1AA",
    phone: "+44 20 1234 5678",
    menu: [
        // Burgers
        {
            name: "Classic Beef Burger",
            description: "6oz beef patty with lettuce, tomato, onion, and our special sauce",
            price: 8.99,
            category: "Burgers",
            options: ["Add cheese (+£1)", "Add bacon (+£1.50)", "Make it double (+£3)"]
        },
        {
            name: "Chicken Burger",
            description: "Crispy fried chicken breast with mayo, lettuce, and pickles",
            price: 9.49,
            category: "Burgers",
            options: ["Grilled instead of fried", "Add cheese (+£1)", "Spicy version"]
        },
        {
            name: "Veggie Burger",
            description: "Plant-based patty with all the classic toppings",
            price: 8.49,
            category: "Burgers",
            options: ["Add vegan cheese (+£1)", "Extra veggies (free)"]
        },
        {
            name: "BBQ Bacon Burger",
            description: "Beef patty with crispy bacon, cheddar, onion rings, and BBQ sauce",
            price: 11.99,
            category: "Burgers",
            options: ["Make it double (+£3)"]
        },
        // Sides
        {
            name: "Regular Fries",
            description: "Crispy golden fries with a pinch of sea salt",
            price: 3.49,
            category: "Sides",
            options: ["Upgrade to large (+£1)"]
        },
        {
            name: "Large Fries",
            description: "Extra portion of our crispy golden fries",
            price: 4.49,
            category: "Sides"
        },
        {
            name: "Onion Rings",
            description: "Beer-battered onion rings, crispy and golden",
            price: 4.49,
            category: "Sides"
        },
        {
            name: "Coleslaw",
            description: "Creamy homemade coleslaw",
            price: 2.49,
            category: "Sides"
        },
        // Drinks
        {
            name: "Coca-Cola",
            description: "Classic Coca-Cola",
            price: 2.49,
            category: "Drinks",
            options: ["Regular", "Diet", "Zero"]
        },
        {
            name: "Fanta Orange",
            description: "Refreshing Fanta Orange",
            price: 2.49,
            category: "Drinks"
        },
        {
            name: "Sprite",
            description: "Crisp and refreshing Sprite",
            price: 2.49,
            category: "Drinks"
        },
        {
            name: "Milkshake",
            description: "Thick and creamy milkshake",
            price: 4.99,
            category: "Drinks",
            options: ["Chocolate", "Vanilla", "Strawberry"]
        },
        // Combos
        {
            name: "Burger Meal Deal",
            description: "Any burger with regular fries and a drink",
            price: 12.99,
            category: "Combos"
        },
        {
            name: "Family Feast",
            description: "4 burgers, 2 large fries, 4 drinks, and 2 sides",
            price: 44.99,
            category: "Combos"
        }
    ],
    faqs: [
        {
            question: "Do you deliver?",
            answer: "Yes, we deliver within a 3-mile radius. Delivery is free for orders over £20, otherwise there's a £2.99 delivery fee. Delivery usually takes 30-45 minutes."
        },
        {
            question: "Can I customise my order?",
            answer: "Absolutely! You can add or remove any toppings. Just let us know what you'd like and we'll make it happen."
        },
        {
            question: "Do you have vegetarian or vegan options?",
            answer: "Yes! Our veggie burger is vegetarian, and we can make it vegan by using our plant-based cheese. We also have vegan-friendly fries and salads."
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept cash, all major credit and debit cards, and Apple Pay or Google Pay for both in-store and delivery orders."
        },
        {
            question: "Can I book a table?",
            answer: "We're a casual walk-in restaurant, so no reservations needed. Just come on down! For groups larger than 8, give us a call ahead and we'll do our best to accommodate you."
        },
        {
            question: "Do you cater for allergies?",
            answer: "Yes, please let us know about any allergies when ordering. We can provide allergen information for all our menu items. Our kitchen does handle nuts, dairy, and gluten."
        }
    ],
    policies: [
        "Minimum order for delivery is £10",
        "Orders can be cancelled within 5 minutes of placing",
        "We don't accept returns on food items for hygiene reasons",
        "Tips are appreciated but not expected",
        "We're a family-friendly restaurant"
    ]
};
// Generate the context string for the AI prompt
function getBusinessContext() {
    const { name, type, description, hours, address, phone, menu, faqs, policies } = exports.testBusiness;
    let context = `You are a helpful AI assistant answering phone calls for ${name}, a ${type}.

ABOUT THE BUSINESS:
${description}

HOURS: ${hours}
ADDRESS: ${address}
PHONE: ${phone}

MENU:
`;
    // Group menu by category
    const categories = new Map();
    menu?.forEach(item => {
        if (!categories.has(item.category)) {
            categories.set(item.category, []);
        }
        categories.get(item.category).push(item);
    });
    categories.forEach((items, category) => {
        context += `\n${category}:\n`;
        items?.forEach(item => {
            context += `- ${item.name}: £${item.price.toFixed(2)} - ${item.description}`;
            if (item.options?.length) {
                context += ` (Options: ${item.options.join(', ')})`;
            }
            context += '\n';
        });
    });
    context += '\nFREQUENTLY ASKED QUESTIONS:\n';
    faqs?.forEach(faq => {
        context += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    });
    context += 'POLICIES:\n';
    policies?.forEach(policy => {
        context += `- ${policy}\n`;
    });
    context += `
IMPORTANT INSTRUCTIONS:
1. Be friendly, natural, and conversational - you're on a phone call!
2. Keep responses concise - this is a voice call, not a text chat
3. If taking an order, repeat it back to confirm
4. If you don't know something, say so honestly
5. Use British English spelling and phrases
6. Don't mention that you're an AI unless directly asked
7. If asked about something outside the business scope, politely redirect to what you can help with`;
    return context;
}
//# sourceMappingURL=test-business.js.map
export declare const config: {
    port: number;
    twilio: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
    };
    deepgram: {
        apiKey: string;
        model: string;
        language: string;
    };
    gemini: {
        apiKey: string;
        model: string;
    };
    elevenlabs: {
        apiKey: string;
        voiceId: string;
        modelId: string;
    };
    diasporaAI: {
        visaApiKey: string;
        visaApiUrl: string;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=config.d.ts.map
import OpenAI from "openai";

const clientOpenAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // Retry transient connection errors and avoid hanging requests
    maxRetries: 3,
    timeout: 10_000,
});

export default clientOpenAI;

import OpenAI from "openai";

const clientOpenAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
    timeout: 20_000,
});

export default clientOpenAI;

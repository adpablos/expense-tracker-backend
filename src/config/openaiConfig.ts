import OpenAI from "openai";

const clientOpenAI= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default clientOpenAI;

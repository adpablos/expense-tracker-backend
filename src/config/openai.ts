export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export const createOpenAIConfig = (): OpenAIConfig => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing required OpenAI environment variables');
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  };
};

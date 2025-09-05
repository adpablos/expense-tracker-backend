import OpenAI from 'openai';

import config from '../../../config/config';

const openaiClient = new OpenAI({
  apiKey: config.openai.apiKey,
  timeout: 20_000, // 20s request timeout
  maxRetries: 2, // basic retry policy
});

export default openaiClient;

import OpenAI from 'openai';

import config from '../../../config/config';

const openaiClient = new OpenAI({
  apiKey: config.openai.apiKey,
});

export default openaiClient;

import Anthropic from '@anthropic-ai/sdk';

export function getClient(apiKey?: string): Anthropic {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: key });
}

export async function callClaude(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  maxTokens = 4096,
): Promise<string> {
  const client = getClient(apiKey);
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response type from Claude');
}

export async function callClaudeWithImage(
  text: string,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  apiKey?: string
): Promise<string> {
  const client = getClient(apiKey);
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response type from Claude');
}

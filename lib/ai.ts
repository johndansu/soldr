import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

const PROVIDER = process.env.AI_PROVIDER ?? 'anthropic'

// Free models on OpenRouter for development
const OPENROUTER_MODELS = {
  default: 'meta-llama/llama-3.1-8b-instruct:free',
  quality: 'meta-llama/llama-3.3-70b-instruct:free',
} as const

// Production Claude models
const ANTHROPIC_MODELS = {
  default: 'claude-sonnet-4-6',
  fast: 'claude-haiku-4-5',
} as const

/**
 * Returns a language model for the current provider.
 * - AI_PROVIDER=openrouter → uses OPENROUTER_API_KEY, free dev models
 * - AI_PROVIDER=anthropic  → uses caller-supplied Anthropic key (BYOK)
 */
export function getModel(userApiKey?: string, quality: 'default' | 'quality' = 'default') {
  if (PROVIDER === 'openrouter') {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
    })
    return openrouter(OPENROUTER_MODELS[quality])
  }

  // Anthropic BYOK — requires caller to pass the decrypted user key
  if (!userApiKey) throw new Error('NO_API_KEY')
  const anthropic = createAnthropic({ apiKey: userApiKey })
  return anthropic(ANTHROPIC_MODELS.default)
}

export const isOpenRouter = PROVIDER === 'openrouter'

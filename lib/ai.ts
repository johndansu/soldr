import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

const PROVIDER = process.env.AI_PROVIDER ?? 'anthropic'

// Free models on OpenRouter for development
// Ordered by preference — first available wins
export const OPENROUTER_FREE_MODELS = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-120b:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
] as const

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
export function getModel(userApiKey?: string, modelIndex = 0) {
  if (PROVIDER === 'openrouter') {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
    })
    const model = OPENROUTER_FREE_MODELS[modelIndex % OPENROUTER_FREE_MODELS.length]
    // .chat() forces /chat/completions endpoint — OpenRouter doesn't support /responses
    return openrouter.chat(model)
  }

  // Anthropic BYOK — requires caller to pass the decrypted user key
  if (!userApiKey) throw new Error('NO_API_KEY')
  const anthropic = createAnthropic({ apiKey: userApiKey })
  return anthropic(ANTHROPIC_MODELS.default)
}

export const isOpenRouter = PROVIDER === 'openrouter'

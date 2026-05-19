import Anthropic from '@anthropic-ai/sdk'

export function buildClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

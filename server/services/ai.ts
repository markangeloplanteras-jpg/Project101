import { config } from '../config.js';

export interface AssistantContext {
  tasksDueToday: number;
  completedThisWeek: number;
  habits: string[];
  eventsToday: string[];
  topPriorities: string[];
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

const buildSystemPrompt = (context: AssistantContext, history: AssistantTurn[], message: string) => {
  const contextJson = JSON.stringify({
    tasksDueToday: context.tasksDueToday,
    completedThisWeek: context.completedThisWeek,
    habits: context.habits,
    eventsToday: context.eventsToday,
    topPriorities: context.topPriorities,
  });
  const historyLines = history
    .slice(-12)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n');
  return [
    'You are LifeOS, a calm and precise personal productivity assistant.',
    'You help users plan their day, prioritize tasks, summarize progress, suggest schedules, brainstorm goals, and answer productivity questions.',
    'Use the supplied user context when relevant. Never invent completed tasks, habits, events, finances, or facts that are not present.',
    'Never claim that an action was completed. If the user asks for a task to be done, explain how they can use LifeOS and give a focused recommendation.',
    'Be concise, warm, practical, and actionable. Use short paragraphs and optional checklists. Do not output tool syntax or pretend you have execution access.',
    'Recent conversation context:',
    historyLines || '(none yet)',
    `Current productivity context: ${contextJson}`,
    `User message: ${message}`,
  ].join('\n');
};

export class AIServiceError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'AI_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface AIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string } | string;
  message?: string;
}

export async function getAIStatus() {
  return {
    configured: config.ai.configured,
    model: config.ai.model,
    provider: config.ai.configured ? 'openai-compatible' : null,
    baseUrl: config.ai.configured ? config.ai.baseUrl : null,
  };
}

export async function generateAssistantReply(input: {
  message: string;
  context: AssistantContext;
  history: AssistantTurn[];
}): Promise<string> {
  if (!config.ai.configured) {
    throw new AIServiceError(503, 'The AI assistant is not configured yet. Add AI_API_KEY and AI_MODEL to the server environment to enable it.', 'AI_NOT_CONFIGURED');
  }

  const systemPrompt = buildSystemPrompt(input.context, input.history, input.message);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.32,
        max_tokens: 1400,
        messages: [
          { role: 'system', content: systemPrompt },
          ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
          { role: 'user', content: input.message },
        ],
      }),
    });

    const raw = (await response.json().catch(() => null)) as AIResponse | null;
    if (!response.ok) {
      const providerError = raw?.error;
      const providerMessage =
        typeof providerError === 'string'
          ? providerError
          : providerError?.message || raw?.message || 'The AI provider request failed.';
      throw new AIServiceError(response.status, providerMessage, 'AI_PROVIDER_ERROR');
    }

    const content = raw?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIServiceError(502, 'The AI provider returned an empty response.', 'AI_EMPTY_RESPONSE');
    }
    return content.trim();
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    const message = error instanceof Error ? error.message : 'The AI assistant could not be reached.';
    throw new AIServiceError(502, message, 'AI_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}

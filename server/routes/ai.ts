import { Router, type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { generateAssistantReply, AIServiceError } from '../services/ai';
import { getDataStore, type DataStore } from '../lib/dataStore';
import { aiChatSchema, aiConversationCreateSchema } from '../lib/validation';

export const aiRouter = Router();
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

aiRouter.get('/status', async (_req, res) => {
  const status = await generateAssistantStatus();
  return res.json({ data: status });
});

async function generateAssistantStatus() {
  const { getAIStatus } = await import('../services/ai');
  return getAIStatus();
}

aiRouter.post('/conversations', async (req, res, next: NextFunction) => {
  try {
    const parsed = aiConversationCreateSchema.parse(req.body);
    const store = getDataStore(req.auth!);
    const conversation = await store.createResource('ai_conversations', req.auth!.userId, {
      title: parsed.title,
      model: 'lifeos-assistant',
    });
    return res.status(201).json({ data: conversation });
  } catch (error) {
    return next(error);
  }
});

aiRouter.get('/conversations/:id/messages', async (req, res, next: NextFunction) => {
  try {
    const store = getDataStore(req.auth!);
    const messages = await store.getMessages(req.auth!.userId, req.params.id);
    return res.json({ data: messages });
  } catch (error) {
    return next(error);
  }
});

async function chatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = aiChatSchema.parse(req.body);
    const store = getDataStore(req.auth!);
    const context = {
      tasksDueToday: parsed.context.tasksDueToday,
      completedThisWeek: parsed.context.completedThisWeek,
      habits: parsed.context.habits,
      eventsToday: parsed.context.eventsToday,
      topPriorities: parsed.context.topPriorities,
    };

    let conversationId = parsed.conversationId;
    let title = 'New conversation';
    if (conversationId) {
      const conversationRow = await store.getConversation(req.auth!.userId, conversationId);
      if (!conversationRow) {
        return res.status(404).json({ error: { message: 'Conversation not found.', code: 'NOT_FOUND' } });
      }
      title = conversationRow.title;
    } else {
      const conversation = await store.createResource('ai_conversations', req.auth!.userId, {
        title: parsed.message.slice(0, 48) || 'New conversation',
        model: 'lifeos-assistant',
      });
      conversationId = conversation.id;
    }

    const historyBefore = conversationId && parsed.conversationId ? await store.getMessages(req.auth!.userId, conversationId) : [];
    const userMessage = await store.addMessage(req.auth!.userId, conversationId!, 'user', parsed.message);
    const historyAfterUser = await store.getMessages(req.auth!.userId, conversationId!);
    const history = historyAfterUser
      .filter((message) => message.id !== userMessage.id)
      .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));

    const reply = await generateAssistantReply({
      message: parsed.message,
      context,
      history,
    });
    const assistantMessage = await store.addMessage(req.auth!.userId, conversationId!, 'assistant', reply);
    await store.touchConversation(req.auth!.userId, conversationId!, title);

    return res.json({
      data: {
        conversation: { id: conversationId, title },
        userMessage,
        assistantMessage,
      },
    });
  } catch (error) {
    return next(error);
  }
}

aiRouter.post('/chat', aiLimiter, chatHandler);

export default aiRouter;

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Plus, Send, Settings2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { aiApi, type AIConversationMessage, type AIStatusResponse } from '../lib/api';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Small';
import { Badge } from '../components/ui/Small';
import { cn } from '../lib/cn';
import type { AIConversation } from '../types';

export function AssistantPage() {
  const { data, loading, error, refresh } = useData();
  const { user } = useAuth();
  const [status, setStatus] = useState<AIStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await aiApi.status();
        if (mounted) setStatus(response);
      } catch {
        if (mounted) setStatus({ data: { configured: false, model: 'gpt-4o-mini', provider: null, baseUrl: null } });
      } finally {
        if (mounted) setStatusLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setConversations(data?.aiConversations ?? []);
  }, [data?.aiConversations]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedId) {
        setMessages([]);
        return;
      }
      try {
        const response = await aiApi.getMessages(selectedId);
        setMessages(response);
      } catch (caught) {
        setMessages([]);
        if (caught instanceof Error) setInput((current) => current);
      }
    };
    void loadMessages();
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const contextValue = useMemo(() => {
    const tasksDueToday = (data?.tasks ?? []).filter((task) => task.status !== 'completed' && task.due_date?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    const completedThisWeek = (data?.tasks ?? []).filter((task) => task.completed_at && new Date(task.completed_at).getTime() >= Date.now() - 7 * 86_400_000).length;
    const habits = (data?.habits ?? []).filter((habit) => !habit.archived).map((habit) => habit.name);
    const eventsToday = (data?.events ?? []).filter((event) => event.start_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    const topPriorities = (data?.tasks ?? [])
      .filter((task) => task.status !== 'completed')
      .sort((a, b) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 3) - ({ urgent: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 3))
      .slice(0, 5)
      .map((task) => task.title);
    return { tasksDueToday, completedThisWeek, habits, eventsToday, topPriorities };
  }, [data]);

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || pending || !status?.data.configured) return;
    setPending(true);
    setInput('');
    const conversationContext = {
      tasksDueToday: contextValue.tasksDueToday,
      completedThisWeek: contextValue.completedThisWeek,
      habits: contextValue.habits,
      eventsToday: contextValue.eventsToday,
      topPriorities: contextValue.topPriorities,
    };
    try {
      const response = await aiApi.chat(selectedId, message, conversationContext);
      const conversation = response.data.conversation;
      setSelectedId(conversation.id);
      setMessages((current) => [...current.filter((item) => item.conversation_id === conversation.id || item.id !== response.data.userMessage.id), response.data.userMessage, response.data.assistantMessage]);
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
    } catch (caught) {
      // Error state can be surfaced through a lightweight local notice.
      void caught;
    } finally {
      setPending(false);
    }
  };

  const newConversation = async () => {
    const response = await aiApi.createConversation('New conversation');
    setSelectedId(response.data.id);
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  if (statusLoading) {
    return <div className="card h-96 animate-pulse rounded-2xl" />;
  }

  const aiStatus = status?.data;
  const configured = aiStatus?.configured ?? false;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card flex h-[calc(100vh-12rem)] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-default p-4">
          <h2 className="font-display font-bold">Assistant</h2>
          <Button variant="secondary" size="sm" onClick={() => void newConversation()}><Plus className="h-4 w-4" /> New</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.map((conversation) => (
            <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={cn('menu-item w-full', selectedId === conversation.id && 'bg-accent-500/10 text-accent-600 dark:text-accent-300')}>
              <Sparkles className="h-4 w-4" />
              <span className="truncate">{conversation.title}</span>
            </button>
          ))}
          {!conversations.length ? <p className="px-3 py-2 text-sm text-muted">No conversations yet.</p> : null}
        </div>
      </aside>

      <section className="card flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-default p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500"><Bot className="h-5 w-5" /></span>
            <div>
              <h3 className="font-display font-bold">LifeOS Assistant</h3>
              <p className="text-xs text-muted">{configured ? `Powered by ${aiStatus?.model}` : 'Local productivity companion'}</p>
            </div>
          </div>
          <Badge tone={configured ? 'green' : 'amber'}>{configured ? 'AI ready' : 'Setup required'}</Badge>
        </div>

        {!configured ? (
          <div className="m-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h4 className="font-display font-semibold">AI assistant setup</h4>
            <p className="mt-2 text-sm text-muted">LifeOS needs a server-side AI provider key to generate responses. Add these variables to the Express server environment, then restart:</p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">AI_API_KEY=your_provider_key\nAI_BASE_URL=https://api.openai.com/v1\nAI_MODEL=gpt-4o-mini</pre>
            <p className="mt-3 text-xs text-muted">The assistant can help you plan your day, prioritize tasks, summarize progress, suggest schedules, brainstorm goals, and answer productivity questions. It does not perform actions on your behalf.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refresh()}>Refresh status</Button>
          </div>
        ) : null}

        <div ref={scrollRef} className="chat-scroll flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length ? (
            messages.map((message) => (
              <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed', message.role === 'user' ? 'bg-accent-500 text-white' : 'bg-surface-soft border border-default')}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Ask your first question" description="The assistant can help you plan the day using your real tasks, habits, and events." />
          )}
          {typing ? (
            <div className="flex justify-start">
              <div className="rounded-3xl border border-default bg-surface-soft px-4 py-3">
                <span className="typing-dot h-2 w-2 rounded-full bg-accent-500" />
                <span className="typing-dot ml-1 h-2 w-2 rounded-full bg-accent-500" />
                <span className="typing-dot ml-1 h-2 w-2 rounded-full bg-accent-500" />
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-default p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-default bg-surface-soft p-2">
            <textarea className="field min-h-11 max-h-32 resize-none border-0 bg-transparent p-2 shadow-none" placeholder="Plan my day, prioritize my tasks, or brainstorm a goal…" value={input} onChange={(event) => setInput(event.target.value)} rows={1} />
            <Button variant="primary" size="sm" onClick={() => void sendMessage()} disabled={!input.trim() || pending || !configured}><Send className="h-4 w-4" /></Button>
          </div>
          <p className="mt-2 text-xs text-muted">The assistant uses your private task context. It cannot complete actions on your behalf.</p>
        </div>
      </section>
    </div>
  );
}

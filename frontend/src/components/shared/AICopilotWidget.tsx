import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractErrorMessage } from '@/services/api';
import * as aiService from '@/services/ai.service';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

const SUGGESTIONS = ['Show all emergencies', 'Which gate is busiest?', 'Stadium performance', 'Who needs maintenance?'];

/**
 * AI Copilot — a floating assistant available from any authenticated page,
 * backed by the same rule-based chatbot endpoint as the Fan Experience
 * chatbot (chatbot.service.ts). The operator-facing intents (revenue,
 * busiest gate, emergencies, maintenance, performance) live in that same
 * endpoint, so this widget picks them up automatically — no separate model.
 */
export function AICopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: "Hi, I'm the AI Copilot. Ask me about operations, revenue, gates, emergencies, or maintenance." },
  ]);
  const [input, setInput] = useState('');

  const chatMutation = useMutation({
    mutationFn: (message: string) => aiService.askChatbot(message),
    onSuccess: (reply) => setMessages((prev) => [...prev, { role: 'bot', text: reply }]),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    chatMutation.mutate(text);
    setInput('');
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full p-0 shadow-lg"
        title="AI Copilot"
        aria-label="Open AI Copilot"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[28rem] w-80 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border bg-primary px-3 py-2 text-primary-foreground">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Bot className="h-4 w-4" /> AI Copilot
        </span>
        <button onClick={() => setOpen(false)} aria-label="Close AI Copilot" className="rounded p-0.5 hover:bg-primary-foreground/20">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-lg bg-muted px-2.5 py-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1 border-t border-border p-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 border-t border-border p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask the Copilot..."
          className="h-8 text-xs"
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => send(input)} disabled={chatMutation.isPending}>
          {chatMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

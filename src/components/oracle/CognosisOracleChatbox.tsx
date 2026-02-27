'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageSquare, Send, X, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STARTER_MESSAGE =
  "I am Cognosis Oracle. Ask about consciousness claims, test design, or experiment interpretation.";

export default function CognosisOracleChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: STARTER_MESSAGE },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const panelTitle = useMemo(() => 'Cognosis Oracle', []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/oracle/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        details?: string;
        upstreamStatus?: number;
      };

      if (!response.ok || !data.answer) {
        const detail = data.details ? ` ${data.details}` : '';
        const status = data.upstreamStatus ? ` (upstream ${data.upstreamStatus})` : '';
        throw new Error(`${data.error || 'Oracle request failed.'}${status}${detail}`);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer as string }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I could not complete that request right now. Check server configuration and try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[10010]">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full border border-cyan-400/30 bg-[#0f1520]/95 px-4 py-3 text-sm font-medium text-cyan-200 shadow-lg shadow-cyan-950/40 transition hover:border-cyan-300 hover:bg-[#122135]"
          aria-label="Open Cognosis Oracle chat"
        >
          <MessageSquare className="h-4 w-4 text-cyan-300" />
          Ask Cognosis Oracle
        </button>
      )}

      {isOpen && (
        <div className="flex h-[70vh] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border border-[#1a2535] bg-[#0f1520] shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between border-b border-[#1a2535] bg-[#121e2d] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-semibold text-slate-100">{panelTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-slate-400 transition hover:bg-[#1a2535] hover:text-slate-200"
              aria-label="Close Cognosis Oracle chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'assistant'
                    ? 'bg-[#142030] text-slate-100'
                    : 'ml-auto bg-cyan-500 text-[#041015]'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            ))}

            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#142030] px-3 py-2 text-sm text-slate-200">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                Thinking
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="border-t border-red-900/40 bg-red-900/20 px-4 py-2 text-xs text-red-300">{error}</div>}

          <div className="border-t border-[#1a2535] bg-[#101b29] p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask a consciousness question..."
                className="h-10 flex-1 rounded-lg border border-[#1a2535] bg-[#0a1018] px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-[#041015] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-900/40 disabled:text-slate-500"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

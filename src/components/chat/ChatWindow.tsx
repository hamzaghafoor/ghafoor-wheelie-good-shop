import { useEffect, useRef, useState } from "react";
import { Send, User, X, Minus, Headphones } from "lucide-react";
import logo from "@/assets/logo.png";
import { runEngine, welcomeMessage } from "@/lib/chatbot/engine";
import type { ChatMessage, ConversationState, EngineResult } from "@/lib/chatbot/types";

type Props = { onClose?: () => void; embedded?: boolean; onEngineResult?: (r: EngineResult, userMsg: string) => void };

const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatWindow({ onClose, embedded, onEngineResult }: Props) {
  const [state, setState] = useState<ConversationState>({ automationEnabled: true, humanRequested: false, collected: {} });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const w = welcomeMessage();
    return [{ id: uid(), sender: "bot", text: w.text, quickReplies: w.quickReplies, source: w.source, confidence: w.confidence, createdAt: Date.now() }];
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((m) => [...m, { id: uid(), sender: "user", text: trimmed, createdAt: Date.now() }]);

    if (state.humanRequested || !state.automationEnabled) return;

    setTyping(true);
    setTimeout(() => {
      const res = runEngine(trimmed, state);
      onEngineResult?.(res, trimmed);
      setMessages((m) => [...m, {
        id: uid(), sender: res.triggerHumanHandover ? "system" : "bot",
        text: res.text, quickReplies: res.quickReplies, source: res.source, confidence: res.confidence, intent: res.intent,
        createdAt: Date.now(),
      }]);
      setState((s) => ({
        ...s,
        ...(res.nextState || {}),
        collected: { ...s.collected, ...(res.nextState?.collected || {}) },
        humanRequested: s.humanRequested || !!res.triggerHumanHandover,
        automationEnabled: res.triggerHumanHandover ? false : s.automationEnabled,
      }));
      setTyping(false);
    }, 450);
  }

  function requestHuman() {
    setMessages((m) => [...m, { id: uid(), sender: "user", text: "Talk to a Person", createdAt: Date.now() }]);
    setMessages((m) => [...m, { id: uid(), sender: "system", text: "I've forwarded your conversation to the Ghafoor Motors team. A team member will respond as soon as possible.", createdAt: Date.now() }]);
    setState((s) => ({ ...s, humanRequested: true, automationEnabled: false }));
  }

  return (
    <div className={`flex flex-col overflow-hidden bg-surface ${embedded ? "h-full rounded-xl border border-border" : "h-[560px] w-[380px] rounded-2xl border border-border shadow-2xl"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-ink px-4 py-3 text-white">
        <img src={logo} alt="" className="h-9 w-9 rounded-full" />
        <div className="flex-1">
          <div className="text-sm font-semibold leading-none">Ghafoor Motors</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" /> Typically replies instantly
          </div>
        </div>
        <button onClick={requestHuman} title="Talk to a person" className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
          <Headphones className="h-4 w-4" />
        </button>
        {onClose && (
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#F7F7F5] px-3 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onQuick={send} />
        ))}
        {typing && (
          <div className="flex gap-1 px-3 py-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}
        {state.humanRequested && (
          <div className="mx-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-[#8a6210]" style={{ background: "#FEF3E0", borderColor: "#D99A19", color: "#8a6210" }}>
            Automation paused — waiting for a team member.
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-border bg-surface p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={state.humanRequested ? "A team member will reply..." : "Type a message... (English or Roman Urdu)"}
          className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
        />
        <button type="submit" aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white hover:bg-primary-hover">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg, onQuick }: { msg: ChatMessage; onQuick: (t: string) => void }) {
  if (msg.sender === "system") {
    return <div className="mx-auto max-w-[85%] rounded-full bg-ink/5 px-3 py-1.5 text-center text-[11px] text-muted-foreground">{msg.text}</div>;
  }
  const isUser = msg.sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "bg-primary text-white" : "bg-white text-foreground shadow-sm"}`}>
        <div className="whitespace-pre-wrap">{msg.text}</div>
        {!!msg.quickReplies?.length && !isUser && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.quickReplies.map((q) => (
              <button key={q} onClick={() => onQuick(q)} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

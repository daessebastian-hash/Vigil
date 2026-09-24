import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useStore } from '../state/store';
import { CoachText } from '../components/ui';
import { coachPrompts, coachReply, outlook } from '../data/insights';
import { PROFILE } from '../data/physiology';

interface Message {
  id: number;
  from: 'coach' | 'me';
  text: string;
}

export function Coach() {
  const { selectedDay: day, days } = useStore();
  const [messages, setMessages] = useState<Message[]>(() => {
    const o = outlook(day, days);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return [{ id: 0, from: 'coach', text: `${greeting}, ${PROFILE.firstName}. **${o.title}.** ${o.body}` }];
  });
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { id: m.length, from: 'me', text: q }]);
    setDraft('');
    setThinking(true);
    timer.current = window.setTimeout(() => {
      setMessages((m) => [...m, { id: m.length, from: 'coach', text: coachReply(q, day, days) }]);
      setThinking(false);
    }, 700);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  const asked = new Set(messages.filter((m) => m.from === 'me').map((m) => m.text));
  const prompts = coachPrompts(day).filter((p) => !asked.has(p));

  return (
    <div className="screen coach">
      <header className="page-header">
        <h1>
          <Sparkles size={22} /> Coach
        </h1>
        <p>Answers from your own sleep, recovery and strain data</p>
      </header>

      <div className="chat" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`bubble bubble-${m.from}`}>
            {m.from === 'coach' ? <CoachText text={m.text} /> : m.text}
          </div>
        ))}
        {thinking && (
          <div className="bubble bubble-coach typing" aria-label="Coach is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      {prompts.length > 0 && (
        <div className="chips">
          {prompts.map((p) => (
            <button key={p} type="button" className="chip" onClick={() => ask(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      <div ref={endRef} className="chat-end" />

      <form className="composer" onSubmit={onSubmit}>
        <label htmlFor="coach-input" className="sr-only">
          Ask Coach
        </label>
        <input id="coach-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about your sleep, training, recovery…" autoComplete="off" />
        <button type="submit" aria-label="Send" disabled={!draft.trim() || thinking}>
          <ArrowUp size={18} strokeWidth={2.6} />
        </button>
      </form>
    </div>
  );
}

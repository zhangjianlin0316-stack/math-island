import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import * as A from "./audio";

export function useAudioState() {
  const [, set] = useState(0);
  useEffect(() => A.subscribe(() => set((n) => n + 1)), []);
  return { engine: A.getEngine(), voiceOn: A.getVoiceOn(), paiVoice: A.getPaiVoice(), speaker: A.currentSpeaker() };
}

export function Teacher({ talking, text, size = 84 }: { talking: boolean; text: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!talking) { setOpen(false); return; }
    const id = setInterval(() => setOpen((o) => !o), 140 + Math.random() * 60);
    return () => clearInterval(id);
  }, [talking]);
  useEffect(() => { const id = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 150); }, 3700); return () => clearInterval(id); }, []);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ flex: `0 0 ${size}px`, textAlign: "center" }}>
        <svg viewBox="0 0 120 140" width={size} height={size * 1.17} style={{ transform: talking ? "translateY(-2px)" : "none", transition: "transform .2s" }}>
          <path d="M18 140 Q20 100 60 98 Q100 100 102 140Z" fill="#4C8DFF" />
          <path d="M50 99 L60 116 L70 99Z" fill="#fff" />
          <rect x={52} y={84} width={16} height={16} fill="#F5C9A6" />
          <circle cx={60} cy={20} r={14} fill="#3b2a20" />
          <ellipse cx={60} cy={56} rx={33} ry={36} fill="#3b2a20" />
          <ellipse cx={60} cy={60} rx={27} ry={30} fill="#FCD9BE" />
          <path d="M33 50 Q45 30 62 36 Q78 30 88 52 Q80 38 60 42 Q42 40 33 50Z" fill="#3b2a20" />
          <g fill="none" stroke="#5b4636" strokeWidth={2.2}><circle cx={48} cy={60} r={8} /><circle cx={72} cy={60} r={8} /><line x1={56} y1={60} x2={64} y2={60} /></g>
          <ellipse cx={48} cy={60} rx={2.8} ry={blink ? 0.6 : 3} fill="#2b1d14" />
          <ellipse cx={72} cy={60} rx={2.8} ry={blink ? 0.6 : 3} fill="#2b1d14" />
          <circle cx={40} cy={73} r={4} fill="#F06595" opacity={0.35} /><circle cx={80} cy={73} r={4} fill="#F06595" opacity={0.35} />
          {open ? <ellipse cx={60} cy={79} rx={6} ry={4.5} fill="#B03A48" /> : <path d="M53 77 Q60 83 67 77" stroke="#B03A48" strokeWidth={2.5} fill="none" strokeLinecap="round" />}
        </svg>
        <div style={{ fontSize: 12, color: "#5b6372", fontWeight: 600 }}>王老师</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, background: "#EEF4FF", border: "1.5px solid #c9d8ff", borderRadius: 16, padding: "10px 14px", fontSize: 15.5, lineHeight: 1.65, minHeight: 56, color: "#1f2430" }}>
        {text || "点「老师讲解」，王老师给你讲一讲～"}
      </div>
    </div>
  );
}

export function VoiceBar() {
  const s = useAudioState();
  const pill = (on: boolean): CSSProperties => ({ border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: on ? "#4C8DFF" : "#f3ecdc", color: on ? "#fff" : "#1f2430" });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 13, color: "#5b6372" }}>
      <button style={pill(s.voiceOn)} onClick={() => A.setVoiceOn(!s.voiceOn)}>{s.voiceOn ? "🔊 老师语音：开" : "🔇 老师语音：关"}</button>
      <span>声音：</span>
      <button style={pill(s.engine === "kokoro")} onClick={() => A.setEngine("kokoro")}>本地开源（Kokoro）</button>
      <button style={pill(s.engine === "edge")} onClick={() => A.setEngine("edge")}>更自然（在线微软）</button>
    </div>
  );
}

type Msg = { role: "user" | "assistant"; content: string };
const CHIPS = ["为什么直角是90度？", "这道题我不会，怎么想？", "分数是什么意思？", "π是什么？"];

export function PaiChat({ context, levelName }: { context: string; levelName: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "我是小派！有什么数学问题都可以问我哦～" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const s = useAudioState();
  const end = useRef<HTMLDivElement>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => { if (location.protocol === "file:" || (window as unknown as { __AUDIO?: unknown }).__AUDIO) { setOnline(false); return; } fetch("api/health").then((r) => r.json()).then((j) => setOnline(!!j.llm)).catch(() => setOnline(false)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);

  const send = async (text: string) => {
    text = text.trim().slice(0, 200);
    if (!text || busy) return;
    if (online === false) {
      setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "现在小派的 AI 大脑没有连上（离线版只能看动画、玩闯关）。要和小派自由聊天，需要打开在电脑上运行的完整版哦～" }]);
      setInput(""); return;
    }
    const hist: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...hist, { role: "assistant", content: "" }]); setInput(""); setBusy(true);
    let acc = "";
    try {
      const r = await fetch("api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist.slice(1).slice(-8), context }) });
      if (!r.ok || !r.body) throw new Error("bad");
      const rd = r.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const a = acc;
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: a }]);
      }
    } catch {
      acc = acc || "哎呀，小派的脑袋卡住了，等一下再问我吧～";
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]);
    }
    setBusy(false);
    if (A.getPaiVoice() && acc) A.speakText(acc, "pai", "chat");
  };

  const btn: CSSProperties = { border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ ...btn, position: "fixed", right: 16, bottom: 18, zIndex: 50, background: "#FF9F43", color: "#fff", padding: "12px 18px", fontSize: 16, boxShadow: "0 6px 18px rgba(0,0,0,.18)" }}>💬 问小派</button>
  );
  return (
    <div style={{ position: "fixed", right: 0, bottom: 0, zIndex: 50, width: "min(440px, 100vw)", height: "min(72vh, 620px)", background: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, boxShadow: "0 -6px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #eee" }}>
        <span style={{ width: 30, height: 30, borderRadius: 15, background: "#FFD43B", border: "3px solid #FF9F43", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#FF9F43" }}>π</span>
        <div style={{ flex: 1, lineHeight: 1.3 }}><div style={{ fontWeight: 700 }}>问小派</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{online === false ? "离线版 · AI 答疑未连接" : `AI 答疑 · 正在学「${levelName}」`}</div></div>
        <button onClick={() => A.setPaiVoice(!s.paiVoice)} style={{ ...btn, padding: "6px 10px", fontSize: 12, background: s.paiVoice ? "#e5edff" : "#f3ecdc", color: "#1f2430" }}>{s.paiVoice ? "🔊 朗读" : "🔇 不读"}</button>
        <button onClick={() => { setOpen(false); }} style={{ ...btn, padding: "6px 10px", background: "#f3ecdc", color: "#1f2430" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gap: 8, alignContent: "start", background: "#fffaf0" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ justifySelf: m.role === "user" ? "end" : "start", maxWidth: "85%", background: m.role === "user" ? "#4C8DFF" : "#fff", color: m.role === "user" ? "#fff" : "#1f2430", border: m.role === "user" ? "none" : "1.5px solid #ece3d0", borderRadius: 14, padding: "8px 12px", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {m.content || (busy && i === msgs.length - 1 ? "小派在想……" : "")}
            {m.role === "assistant" && m.content && !(busy && i === msgs.length - 1) && <button onClick={() => A.speakText(m.content, "pai", "chat")} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, marginLeft: 4 }} aria-label="朗读">🔊</button>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "6px 10px 0" }}>
        {CHIPS.map((c) => <button key={c} disabled={busy} onClick={() => send(c)} style={{ ...btn, flex: "0 0 auto", padding: "5px 10px", fontSize: 12, background: "#f3ecdc", color: "#1f2430" }}>{c}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 6, padding: 10 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入你的问题…" maxLength={200} style={{ flex: 1, minWidth: 0, border: "1.5px solid #ece3d0", borderRadius: 999, padding: "10px 14px", fontSize: 16, fontFamily: "inherit" }} />
        <button type="submit" disabled={busy || !input.trim()} style={{ ...btn, background: "#4C8DFF", color: "#fff", opacity: busy || !input.trim() ? 0.5 : 1 }}>发送</button>
      </form>
    </div>
  );
}

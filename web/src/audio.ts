export type Engine = "kokoro" | "edge";
const LS = typeof localStorage !== "undefined" ? localStorage : null;
let engine: Engine = (LS?.getItem("mi_engine") as Engine) || "kokoro";
let voiceOn = LS?.getItem("mi_voice") !== "0";
let paiVoice = LS?.getItem("mi_pai_voice") !== "0";
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const getEngine = () => engine;
export const setEngine = (e: Engine) => { engine = e; LS?.setItem("mi_engine", e); emit(); };
export const getVoiceOn = () => voiceOn;
export const setVoiceOn = (v: boolean) => { voiceOn = v; LS?.setItem("mi_voice", v ? "1" : "0"); if (!v) stop(); emit(); };
export const getPaiVoice = () => paiVoice;
export const setPaiVoice = (v: boolean) => { paiVoice = v; LS?.setItem("mi_pai_voice", v ? "1" : "0"); emit(); };

export const player: HTMLAudioElement = typeof Audio !== "undefined" ? new Audio() : ({} as HTMLAudioElement);
player.preload = "auto";
let token = 0;
let speaker: string = "";
export const current = () => token;
export const currentSpeaker = () => speaker;

let unlocked = false;
function unlock() {
  if (unlocked) return; unlocked = true;
  try { player.src = window.__AUDIO ? "data:audio/mpeg;base64," + window.__AUDIO["silence"] : "audio/silence.mp3"; const p = player.play(); if (p) p.catch(() => {}); } catch { /* ignore */ }
}
if (typeof document !== "undefined") document.addEventListener("pointerdown", unlock, { capture: true });

export function stop() { token++; speaker = ""; try { player.onended = null; player.pause(); } catch { /* ignore */ } emit(); }

/** Play a URL. Resolves to a token (>0) when playback started, or 0 if it failed (autoplay blocked / 404). */
export async function play(url: string, who: string, onEnd?: () => void): Promise<number> {
  stop();
  const my = ++token; speaker = who;
  player.onended = () => { if (token === my) { speaker = ""; emit(); onEnd && onEnd(); } };
  player.src = url;
  try { await player.play(); } catch { if (token === my) { speaker = ""; emit(); } return 0; }
  if (token !== my) return 0;
  emit();
  return my;
}
declare global { interface Window { __AUDIO?: Record<string, string> } }
export const narrUrl = (id: string) => {
  const emb = typeof window !== "undefined" ? window.__AUDIO : undefined;
  if (emb) return "data:audio/mpeg;base64," + (emb[`${engine}/${id}`] ?? emb[`kokoro/${id}`] ?? emb[`edge/${id}`]);
  return `audio/${engine}/${id}.mp3`;
};

const ttsCache = new Map<string, string>();
export async function speakText(text: string, role: "pai" | "teacher", who: string): Promise<number> {
  const key = engine + role + text;
  let url = ttsCache.get(key);
  if (!url) {
    try {
      const r = await fetch("api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, role, engine }) });
      if (!r.ok) return 0;
      url = URL.createObjectURL(await r.blob()); ttsCache.set(key, url);
    } catch { return 0; }
  }
  return play(url, who);
}

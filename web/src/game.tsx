import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as R from "./rewards";
import * as AU from "./audio";
import { Diagram } from "./diagrams";
import COMP from "./comp.json";

export interface CompQ { id: string; band: string; type: string; d: number; q: string; answer: string; hints: string[]; sol: string[]; dg: unknown; mode: "pad" | "choice"; options: string[] | null; unit: string; src: string | null }
export const PROBLEMS = COMP as unknown as CompQ[];
R.setBandResolver((id) => PROBLEMS.find((p) => p.id === id)?.band ?? "");

declare global { interface Window { __IMG?: Record<string, string> } }
export const imgUrl = (id: string) => (typeof window !== "undefined" && window.__IMG?.[id]) || `skins/${id}.webp`;

export function useSave() {
  const [, set] = useState(0);
  useEffect(() => R.subscribe(() => set((n) => n + 1)), []);
  return R.get();
}
const FRAME: Record<string, CSSProperties> = {
  frame_none: { border: "3px solid #fff" },
  frame_bronze: { border: "4px solid #c58b4a", boxShadow: "0 0 0 2px #f3d2a8" },
  frame_silver: { border: "4px solid #c0c7d1", boxShadow: "0 0 0 2px #fff, 0 0 10px #aab4c3" },
  frame_purple: { border: "4px solid #8C6CF2", boxShadow: "0 0 14px #b49cff, 0 0 0 2px #e5dcff" },
  frame_rainbow: { border: "4px solid transparent", background: "linear-gradient(#fff,#fff) padding-box, conic-gradient(from var(--a,0deg), #FF6B6B, #FFD43B, #2FB344, #15AABF, #8C6CF2, #FF6B6B) border-box", animation: "miSpin 3s linear infinite", boxShadow: "0 0 14px rgba(255,159,67,.6)" },
};
export const GLOBAL_CSS = `@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}@keyframes miSpin{to{--a:360deg}}
@keyframes miPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes miFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes miShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}`;

function BgLayer({ id }: { id: string }) {
  return id === "bg_none"
    ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#fff3c4,#ffd8a8 60%,#ffc9de)" }} />
    : <img src={imgUrl(id)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
}
export function Avatar({ equip, w = 240, still = false }: { equip: Record<R.Slot, string>; w?: number; still?: boolean }) {
  const h = w * 4 / 3;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 18, overflow: "hidden", ...FRAME[equip.frame], flex: "0 0 auto" }}>
      <BgLayer id={equip.bg} />
      <img src={imgUrl(equip.char)} alt="" style={{ position: "absolute", left: "8%", bottom: "2%", width: "84%", animation: still ? undefined : "miFloat 3.2s ease-in-out infinite", filter: "drop-shadow(0 6px 8px rgba(0,0,0,.25))" }} />
      {equip.pet !== "pet_none" && <img src={imgUrl(equip.pet)} alt="" style={{ position: "absolute", right: "2%", bottom: "2%", width: "36%", animation: still ? undefined : "miFloat 2.4s ease-in-out infinite .4s", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.25))" }} />}
    </div>
  );
}
export function AvatarHead({ equip, size = 52 }: { equip: Record<R.Slot, string>; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", ...FRAME[equip.frame], flex: "0 0 auto", position: "relative" }}>
      <BgLayer id={equip.bg} />
      <img src={imgUrl(equip.char)} alt="我的形象" style={{ position: "absolute", width: "190%", left: "-45%", top: "-6%" }} />
    </div>
  );
}
export function StatusBar({ onOpen }: { onOpen: (v: string) => void }) {
  const s = useSave(); const lv = R.levelOf(s.xp); const a = R.xpForLevel(lv), b = R.xpForLevel(lv + 1);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #ece3d0", borderRadius: 16, padding: "8px 12px", flexWrap: "wrap" }}>
      <button onClick={() => onOpen("wardrobe")} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }} aria-label="我的形象"><AvatarHead equip={s.equip} /></button>
      <div style={{ flex: "1 1 140px", minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{`Lv.${lv} ${R.titleOf(lv)}`}</div>
        <div style={{ height: 8, background: "#f3ecdc", borderRadius: 4, overflow: "hidden", marginTop: 4 }}><div style={{ width: `${Math.min(100, ((s.xp - a) / (b - a)) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#8C6CF2,#4C8DFF)" }} /></div>
        <div style={{ fontSize: 11, color: "#8a91a0", marginTop: 2 }}>{`经验 ${s.xp - a}/${b - a}　连续签到 ${s.daily.streak} 天`}</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 800 }}>
        <span style={{ background: "#fff4d6", borderRadius: 999, padding: "5px 10px" }}>🪙 {s.coins}</span>
        <button onClick={() => onOpen("ach")} style={{ border: "none", background: s.chests ? "#ffe3e3" : "#f3ecdc", borderRadius: 999, padding: "5px 10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", animation: s.chests ? "miShake 1s ease-in-out infinite" : undefined }}>🎁 {s.chests}</button>
      </div>
    </div>
  );
}
export function Toasts() {
  useSave(); const ts = R.getToasts();
  return (
    <div style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 80, display: "grid", gap: 6, width: "min(92vw, 420px)", pointerEvents: "none" }}>
      {ts.map((t) => <div key={t.id} style={{ animation: "miPop .35s ease-out", background: t.kind === "ach" ? "#8C6CF2" : t.kind === "item" ? "#FF9F43" : t.kind === "level" ? "#2FB344" : t.kind === "chest" ? "#F06595" : "#1f2430", color: "#fff", borderRadius: 14, padding: "9px 14px", fontWeight: 700, fontSize: 14, boxShadow: "0 6px 16px rgba(0,0,0,.2)" }}>{t.text}</div>)}
    </div>
  );
}
const pill = (on: boolean, extra?: CSSProperties): CSSProperties => ({ border: "none", borderRadius: 999, padding: "7px 13px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: on ? "#4C8DFF" : "#f3ecdc", color: on ? "#fff" : "#1f2430", ...extra });
const card: CSSProperties = { background: "#fff", border: "1px solid #ece3d0", borderRadius: 16, padding: 14 };
const SLOT_NAME: Record<R.Slot, string> = { char: "服装形象", bg: "背景", pet: "宠物", frame: "头像框" };

function ItemThumb({ it }: { it: R.Item }) {
  if (it.slot === "frame") return <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ffe8a3", ...FRAME[it.id], margin: "0 auto" }} />;
  if (it.id.endsWith("_none")) return <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", color: "#8a91a0", fontSize: 13, background: it.slot === "bg" ? "linear-gradient(160deg,#fff3c4,#ffd8a8 60%,#ffc9de)" : "#faf6ec", borderRadius: 10 }}>{it.slot === "bg" ? "默认" : "无"}</div>;
  return <img src={imgUrl(it.id)} alt={it.name} loading="lazy" style={{ width: "100%", height: 96, objectFit: it.slot === "bg" ? "cover" : "contain", borderRadius: 10, background: "#faf6ec" }} />;
}
function ItemCard({ it, owned, equipped, onClick, label }: { it: R.Item; owned: boolean; equipped: boolean; onClick: () => void; label: ReactNode }) {
  return (
    <button onClick={onClick} style={{ ...card, padding: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "center", display: "grid", gap: 4, borderColor: equipped ? "#2FB344" : R.RARITY_COLOR[it.rarity], borderWidth: equipped ? 3 : 1.5, borderStyle: "solid", opacity: owned ? 1 : 0.85, position: "relative" }}>
      <span style={{ position: "absolute", top: 6, left: 6, zIndex: 1, fontSize: 10, fontWeight: 800, color: "#fff", background: R.RARITY_COLOR[it.rarity], borderRadius: 6, padding: "1px 5px" }}>{it.rarity}</span>
      <div style={{ filter: owned ? undefined : "grayscale(.5)" }}><ItemThumb it={it} /></div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2430" }}>{it.name}</div>
      <div style={{ fontSize: 12, color: "#5b6372" }}>{label}</div>
    </button>
  );
}
export function Wardrobe() {
  const s = useSave(); const [slot, setSlot] = useState<R.Slot>("char");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center" }}>
        <Avatar equip={s.equip} w={220} />
        <div style={{ flex: "1 1 200px", display: "grid", gap: 6, fontSize: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>我的衣橱</div>
          {(Object.keys(SLOT_NAME) as R.Slot[]).map((k) => <div key={k}>{`${SLOT_NAME[k]}：`}<b>{R.itemById(s.equip[k]).name}</b></div>)}
          <div style={{ color: "#8a91a0", fontSize: 12 }}>{`已收集 ${s.owned.filter((i) => !i.endsWith("_none")).length}/${R.ITEMS.filter((i) => !i.id.endsWith("_none")).length} 件。点下面的物品就能换上。`}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(Object.keys(SLOT_NAME) as R.Slot[]).map((k) => <button key={k} style={pill(slot === k)} onClick={() => setSlot(k)}>{SLOT_NAME[k]}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8 }}>
        {R.ITEMS.filter((i) => i.slot === slot).map((it) => {
          const own = s.owned.includes(it.id), eq = s.equip[slot] === it.id;
          return <ItemCard key={it.id} it={it} owned={own} equipped={eq} onClick={() => own && R.equip(it.id)} label={eq ? "✅ 穿戴中" : own ? "点击换上" : it.price !== undefined ? `🔒 商店 ${it.price} 金币` : `🔒 ${R.UNLOCK_TEXT[it.unlock ?? ""] ?? "宝箱"}`} />;
        })}
      </div>
    </div>
  );
}
export function Shop() {
  const s = useSave(); const [msg, setMsg] = useState(""); const [slot, setSlot] = useState<R.Slot | "all">("all");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontWeight: 800, fontSize: 18 }}>形象商店</span><span style={{ background: "#fff4d6", borderRadius: 999, padding: "4px 10px", fontWeight: 800 }}>🪙 {s.coins}</span><span style={{ fontSize: 12, color: "#8a91a0" }}>答题、闯关、签到、成就都能赚金币</span></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(["all", "char", "bg", "pet", "frame"] as const).map((k) => <button key={k} style={pill(slot === k)} onClick={() => setSlot(k)}>{k === "all" ? "全部" : SLOT_NAME[k]}</button>)}</div>
      {msg && <div style={{ ...card, padding: 10, background: "#fff4d6" }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8 }}>
        {R.ITEMS.filter((i) => !i.id.endsWith("_none") && (slot === "all" || i.slot === slot)).map((it) => {
          const own = s.owned.includes(it.id);
          return <ItemCard key={it.id} it={it} owned={own} equipped={false} onClick={() => { if (own) { R.equip(it.id); setMsg(`已换上「${it.name}」`); return; } const e = R.buy(it.id); if (e) setMsg(e); else { R.equip(it.id); setMsg(`买下并换上了「${it.name}」！`); } }}
            label={own ? "已拥有 · 点击换上" : it.price !== undefined ? <b style={{ color: s.coins >= it.price ? "#2f9e44" : "#c92a2a" }}>{`🪙 ${it.price}${it.unlock ? " 或 " + R.UNLOCK_TEXT[it.unlock] : ""}`}</b> : `🔒 ${R.UNLOCK_TEXT[it.unlock ?? ""] ?? ""}`} />;
        })}
      </div>
      <div style={{ fontSize: 12, color: "#8a91a0" }}>传说物品不能直接买：完成对应挑战，或者从宝箱里开出来（宝箱 35% 概率出物品：普通 50%、稀有 30%、史诗 15%、传说 5%）。</div>
    </div>
  );
}
export function Achievements() {
  const s = useSave(); const [last, setLast] = useState<{ coins: number; item?: R.Item } | null>(null);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 46, animation: s.chests ? "miShake 1s ease-in-out infinite" : undefined }}>🎁</div>
        <div style={{ flex: "1 1 160px" }}><div style={{ fontWeight: 800 }}>{`我的宝箱：${s.chests} 个`}</div><div style={{ fontSize: 12, color: "#5b6372" }}>升级、掌握关卡、每解出 5 道竞赛题、部分成就都会送宝箱。</div></div>
        <button disabled={!s.chests} onClick={() => setLast(R.openChest())} style={pill(!!s.chests, { opacity: s.chests ? 1 : 0.5 })}>打开宝箱</button>
      </div>
      {last && <div style={{ ...card, animation: "miPop .4s", textAlign: "center", background: "#fff8e6" }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{`获得 ${last.coins} 金币${last.item ? `和${last.item.rarity}「${last.item.name}」！` : "！"}`}</div>
        {last.item && <div style={{ maxWidth: 160, margin: "8px auto 0" }}><ItemThumb it={last.item} /></div>}
      </div>}
      <div style={{ ...card }}><b>每日签到</b>：每天第一次打开就自动签到，连续签到第 n 天得 10×n 金币（最多 70）。当前连续 {s.daily.streak} 天，最长 {s.daily.best} 天。</div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{`成就徽章 ${s.ach.length}/${R.ACHS.length}`}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {R.ACHS.map((a) => { const got = s.ach.includes(a.id); return (
          <div key={a.id} style={{ ...card, padding: 10, display: "flex", gap: 10, alignItems: "center", opacity: got ? 1 : 0.6, borderColor: got ? "#FFD43B" : "#ece3d0", borderWidth: got ? 2 : 1, borderStyle: "solid" }}>
            <div style={{ fontSize: 28, filter: got ? undefined : "grayscale(1)" }}>🏅</div>
            <div><div style={{ fontWeight: 700 }}>{a.name}</div><div style={{ fontSize: 12, color: "#5b6372" }}>{a.desc}</div><div style={{ fontSize: 12, color: "#c77700" }}>{`🪙 ${a.coins}${a.chest ? " + 🎁" : ""}${got ? " · 已获得" : ""}`}</div></div>
          </div>); })}
      </div>
      <details style={{ fontSize: 12, color: "#8a91a0" }}><summary>家长设置</summary><button onClick={() => { if (confirm("确定清空全部进度和奖励吗？")) R.resetAll(); }} style={pill(false, { marginTop: 6, fontSize: 12 })}>清空进度</button></details>
    </div>
  );
}

const BANDS = [["低", "低年级（1–2）"], ["中", "中年级（3–4）"], ["高", "高年级（5–6）"]];
export function Competition({ say }: { say: (t: string, m: "happy" | "think" | "cheer" | "encourage") => void }) {
  const s = useSave();
  const [band, setBand] = useState("低"); const [type, setType] = useState("全部"); const [cur, setCur] = useState<CompQ | null>(null);
  const [tries, setTries] = useState(0); const [done, setDone] = useState(false); const [ok, setOk] = useState(false); const [pad, setPad] = useState(""); const [chosen, setChosen] = useState("");
  const list = PROBLEMS.filter((p) => p.band === band); const types = ["全部", ...Array.from(new Set(list.map((p) => p.type)))];
  const shown = list.filter((p) => type === "全部" || p.type === type);
  const open = (p: CompQ) => { setCur(p); setTries(0); setDone(false); setOk(false); setPad(""); setChosen(""); AU.stop(); say(`竞赛题来啦！这是「${p.type}」。先自己想一想，卡住了小派会一步一步提示你～`, "happy"); };
  const submit = (v: string) => {
    if (!cur || done || v === "") return;
    const good = cur.mode === "pad" ? Math.abs(Number(v) - Number(cur.answer)) < 1e-6 : v === cur.answer;
    setChosen(v);
    R.onCompAnswer(cur.id, cur.band, good, tries);
    if (good) { setDone(true); setOk(true); say(tries === 0 ? "一次就做对了，太厉害啦！你有竞赛选手的头脑！" : "改正后做对啦！坚持思考就是最棒的！", "cheer"); return; }
    const nt = tries + 1; setTries(nt); setPad("");
    if (nt === 1) say("没关系，竞赛题就是要多想一想～ 提示一：" + cur.hints[0], "think");
    else if (nt === 2) say("提示二：" + cur.hints[1], "think");
    else { setDone(true); setOk(false); say("提示三：" + cur.hints[2] + " 我们一起看看详细解答吧！正确答案是 " + cur.answer + (cur.unit || "") + "。", "encourage"); }
  };
  const next = () => { if (!cur) return; const i = shown.findIndex((p) => p.id === cur.id); const nx = shown.slice(i + 1).find((p) => !s.comp[p.id]?.solved) ?? shown[(i + 1) % shown.length]; open(nx); };
  if (cur) {
    const dot = cur.answer.includes(".");
    const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", dot ? "." : "清空", "0", "⌫"];
    const tap = (k: string) => { if (done) return; if (k === "⌫") setPad((x) => x.slice(0, -1)); else if (k === "清空") setPad(""); else if (k === ".") setPad((x) => (x.includes(".") ? x : x + ".")); else setPad((x) => (x.length < 7 ? x + k : x)); };
    const speaking = AU.currentSpeaker() === "solution";
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={pill(false)} onClick={() => { setCur(null); AU.stop(); }}>← 题目列表</button>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "#ffe8cc", fontWeight: 700 }}>{`${cur.band}年级组 · ${cur.type}`}</span>
          <span style={{ fontSize: 12, color: "#8a91a0" }}>{`难度 ${"★".repeat(cur.d)}${"☆".repeat(3 - cur.d)}　奖励 🪙${R.COMP_REWARD[cur.band][0]}`}</span>
          {s.comp[cur.id]?.solved && <span style={{ fontSize: 12, color: "#2f9e44", fontWeight: 700 }}>✅ 已解出</span>}
        </div>
        <div style={{ ...card, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6 }}>{cur.q}</div>
          <Diagram dg={cur.dg} />
          {cur.mode === "choice" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(cur.options ?? []).map((o) => { const isA = done && o === cur.answer, bad = !isA && o === chosen && (tries > 0 || done); return <button key={o} onClick={() => submit(o)} style={pill(false, { fontSize: 17, padding: "10px 18px", background: isA ? "#2FB344" : bad ? "#ffd8d8" : "#f3ecdc", color: isA ? "#fff" : "#1f2430" })}>{o}</button>; })}</div>
          ) : (
            <div style={{ display: "grid", gap: 8, maxWidth: 300 }}>
              <div style={{ border: `2px solid ${done ? (ok ? "#2FB344" : "#c9bfa9") : "#FF9F43"}`, borderRadius: 12, padding: "8px 14px", fontSize: 26, fontWeight: 700, minHeight: 44 }}>{done ? (ok ? chosen : cur.answer) : pad || " "}<span style={{ fontSize: 15, color: "#8a91a0", marginLeft: 6 }}>{cur.unit}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>{keys.map((k) => <button key={k} onClick={() => tap(k)} style={pill(false, { borderRadius: 12, fontSize: 20, padding: "10px 0" })}>{k}</button>)}</div>
              <button disabled={done || !pad} onClick={() => submit(pad)} style={pill(true, { borderRadius: 12, opacity: done || !pad ? 0.5 : 1 })}>确定</button>
            </div>
          )}
          {tries > 0 && !done && <div style={{ border: "1.5px dashed #c9bfa9", borderRadius: 12, padding: 10, fontSize: 14, lineHeight: 1.7 }}>{cur.hints.slice(0, tries).map((h, i) => <div key={i}>{`💡 提示${i + 1}：${h}`}</div>)}</div>}
          {done && <div style={{ background: "#EEF4FF", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b>📖 详细解答</b>
              <button onClick={() => (speaking ? AU.stop() : AU.play(AU.narrUrl(`comp_${cur.id}`), "solution"))} style={pill(true, { background: "#2FB344", fontSize: 13, padding: "5px 12px" })}>{speaking ? "⏹ 停止" : "🔊 王老师讲题"}</button></div>
            {cur.sol.map((x, i) => <div key={i} style={{ fontSize: 15, lineHeight: 1.7 }}>{`第 ${i + 1} 步：${x}`}</div>)}
            <div style={{ fontWeight: 700 }}>{`答案：${cur.answer}${cur.unit}`}</div>
            {cur.src && <div style={{ fontSize: 12, color: "#8a91a0" }}>{`题型出处：${cur.src}（原创改编）`}</div>}
          </div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{done && <button style={pill(true)} onClick={next}>下一题 →</button>}</div>
        </div>
      </div>
    );
  }
  const solvedIn = (b: string) => PROBLEMS.filter((p) => p.band === b && s.comp[p.id]?.solved).length;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#5b6372", lineHeight: 1.6 }}>{`竞赛挑战：仿小学数学竞赛常见题型的原创题，共 ${PROBLEMS.length} 道。一次答对奖励最多，用了提示奖励减半。每解出 5 道题送 1 个宝箱！`}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{BANDS.map(([b, n]) => <button key={b} style={pill(band === b)} onClick={() => { setBand(b); setType("全部"); }}>{`${n} ${solvedIn(b)}/${PROBLEMS.filter((p) => p.band === b).length}`}</button>)}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{types.map((t) => <button key={t} style={pill(type === t, { padding: "5px 10px", fontSize: 12, background: type === t ? "#FF9F43" : "#f3ecdc" })} onClick={() => setType(t)}>{t}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
        {shown.map((p, i) => { const st = s.comp[p.id]; return (
          <button key={p.id} onClick={() => open(p)} style={{ ...card, padding: 10, textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "grid", gap: 4, borderLeft: `6px solid ${st?.solved ? "#2FB344" : "#FF9F43"}` }}>
            <div style={{ fontSize: 12, color: "#8a91a0" }}>{`第 ${i + 1} 题 · ${p.type} · ${"★".repeat(p.d)}`}{st?.solved ? (st.first ? " · 🏆 一次答对" : " · ✅ 已解出") : ""}</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#1f2430", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.q}</div>
          </button>); })}
      </div>
    </div>
  );
}

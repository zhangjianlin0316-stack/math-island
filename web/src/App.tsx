import { useState, useEffect, useRef, useGrokTheme, type ReactNode, type CSSProperties, type ChangeEvent } from "./grok";
import * as AU from "./audio";
import { Teacher, VoiceBar, PaiChat, useAudioState } from "./extras";
import * as RW from "./rewards";
import { StatusBar, Toasts, Competition, Wardrobe, Shop, Achievements, AvatarHead, GLOBAL_CSS, useSave } from "./game";

type Theme = ReturnType<typeof useGrokTheme>;
type Mood = "happy" | "think" | "cheer" | "encourage";
type Pt = { x: number; y: number };
type Tri3 = [number, number, number];

const K = { red: "#FF6B6B", orange: "#FF9F43", yellow: "#FFD43B", green: "#2FB344", teal: "#15AABF", blue: "#4C8DFF", purple: "#8C6CF2", pink: "#F06595" };
const MASTER = 5;
const CN = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const cnN = (n: number): string => (n <= 10 ? CN[n] : n < 20 ? "十" + CN[n - 10] : CN[Math.floor(n / 10)] + "十" + (n % 10 ? CN[n % 10] : ""));
const cnF = (k: number, n: number): string => `${cnN(n)}分之${cnN(k)}`;
function kj(a: number, b: number): string {
  const s = Math.min(a, b), l = Math.max(a, b), p = s * l;
  const ps = p < 10 ? "得" + CN[p] : p === 10 ? "一十" : (p < 20 ? "十" : CN[Math.floor(p / 10)] + "十") + (p % 10 ? CN[p % 10] : "");
  return CN[s] + CN[l] + ps;
}
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a), 0, 1);
const ease = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const rnd = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function shuffle<T>(a: T[]): T[] { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = b[i]; b[i] = b[j]; b[j] = x; } return b; }
const rad = (d: number): number => (d * Math.PI) / 180;
const fmt = (n: number): string => String(Math.round(n * 100) / 100);
function sector(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1));
  const x2 = cx + r * Math.cos(rad(a2)), y2 = cy - r * Math.sin(rad(a2));
  return `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 0 ${x2} ${y2}Z`;
}
function svg(vb: string, kids: ReactNode, max: number = 520): ReactNode {
  return <svg viewBox={vb} width="100%" style={{ maxWidth: max, display: "block", margin: "0 auto" }}>{kids}</svg>;
}
function useTimeline(ms: number, k: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const st = performance.now();
    const step = (now: number) => { const p = Math.min(1, (now - st) / ms); setT(p); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ms, k]);
  return t;
}

interface Q {
  prompt: string; sig?: string; mode: "choice" | "pad" | "angle" | "shade"; answer: string;
  options?: string[]; ok?: (v: string) => boolean; draw?: () => ReactNode; hintDraw?: () => ReactNode;
  hints: [string, string, string]; parts?: number; showDeg?: boolean; dot?: boolean;
}
interface Level {
  id: string; tag: string; name: string; color: string; intro: string; keys: string[];
  dur: number; caps: [number, string][]; ex: (t: number, th: Theme) => ReactNode; gen: (d: number) => Q;
}

/* ---------- small figures ---------- */
function protractor(V: Pt, R: number, th: Theme): ReactNode {
  const ticks: ReactNode[] = [];
  for (let a = 0; a <= 180; a += 10) {
    const c = Math.cos(rad(a)), s = Math.sin(rad(a)), L = a % 30 === 0 ? 12 : 7;
    ticks.push(<line key={a} x1={V.x + R * c} y1={V.y - R * s} x2={V.x + (R - L) * c} y2={V.y - (R - L) * s} stroke={th.text.tertiary} />);
    if (a % 30 === 0) ticks.push(<text key={"t" + a} x={V.x + (R - 24) * c} y={V.y - (R - 24) * s + 4} textAnchor="middle" fontSize={10} fill={th.text.tertiary}>{a}</text>);
  }
  return <g><path d={`M${V.x - R} ${V.y}A${R} ${R} 0 0 1 ${V.x + R} ${V.y}Z`} fill={K.teal} fillOpacity={0.1} stroke={K.teal} strokeOpacity={0.6} />{ticks}</g>;
}
function angleEls(deg: number, rot: number, V: Pt, L: number, th: Theme, mark: boolean, ref90: boolean, color?: string): ReactNode {
  const pt = (a: number, l: number): Pt => ({ x: V.x + l * Math.cos(rad(a)), y: V.y - l * Math.sin(rad(a)) });
  const col = color ?? (Math.abs(deg - 90) < 0.5 ? K.green : deg < 90 ? K.blue : K.orange);
  const p1 = pt(rot, L), p2 = pt(rot + deg, L), r9 = pt(rot + 90, L);
  const sq = (s: number): string => { const u = pt(rot, s), w = pt(rot + 90, s); return `M${u.x} ${u.y}L${u.x + w.x - V.x} ${u.y + w.y - V.y}L${w.x} ${w.y}`; };
  return (
    <g>
      {ref90 && <g><line x1={V.x} y1={V.y} x2={r9.x} y2={r9.y} stroke={th.text.secondary} strokeWidth={2} strokeDasharray="6 5" /><path d={sq(18)} fill="none" stroke={th.text.secondary} strokeWidth={1.5} strokeDasharray="3 3" /></g>}
      {mark ? <path d={sq(18) + "L" + V.x + " " + V.y + "Z"} fill={K.green} fillOpacity={0.3} stroke={K.green} strokeWidth={2} /> : <path d={sector(V.x, V.y, 28, rot, rot + deg)} fill={col} fillOpacity={0.3} stroke={col} />}
      <line x1={V.x} y1={V.y} x2={p1.x} y2={p1.y} stroke={th.text.primary} strokeWidth={4} strokeLinecap="round" />
      <line x1={V.x} y1={V.y} x2={p2.x} y2={p2.y} stroke={col} strokeWidth={4} strokeLinecap="round" />
      <circle cx={V.x} cy={V.y} r={5} fill={th.text.primary} />
    </g>
  );
}
function AngleFig({ deg, rot = 0, ref90 = false, mark = false, proto = false, showDeg = false }: { deg: number; rot?: number; ref90?: boolean; mark?: boolean; proto?: boolean; showDeg?: boolean }) {
  const th = useGrokTheme();
  if (proto) {
    const V = { x: 160, y: 175 };
    return svg("0 0 320 195", <g>{protractor(V, 120, th)}{angleEls(deg, 0, V, 145, th, mark || deg === 90, ref90)}{showDeg && <text x={10} y={28} fontSize={22} fontWeight={700} fill={th.text.primary}>{deg}°</text>}</g>, 440);
  }
  return svg("0 0 320 200", angleEls(deg, rot, { x: 160, y: 100 }, 85, th, mark, ref90, K.purple), 360);
}
function Pizza({ n, on, tap }: { n: number; on: boolean[]; tap?: (i: number) => void }) {
  return svg("0 0 200 200", (
    <g>
      <circle cx={100} cy={100} r={94} fill={K.orange} />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={sector(100, 100, 84, 90 - ((i + 1) * 360) / n, 90 - (i * 360) / n)} fill={on[i] ? K.red : "#FFE39A"} stroke="#9A6400" strokeWidth={2.5}
          onClick={tap ? () => tap(i) : undefined} style={{ cursor: tap ? "pointer" : "default" }} />
      ))}
    </g>
  ), 230);
}
function FracBar({ n, k, label }: { n: number; k: number; label?: string }) {
  const th = useGrokTheme();
  const w = 280 / n;
  return svg("0 0 300 56", (
    <g>
      {Array.from({ length: n }, (_, i) => <rect key={i} x={10 + i * w} y={6} width={w} height={28} fill={i < k ? K.pink : "transparent"} stroke={th.text.primary} strokeWidth={1.5} />)}
      {label && <text x={150} y={50} textAnchor="middle" fontSize={13} fill={th.text.secondary}>{label}</text>}
    </g>
  ), 360);
}
function TenFrame({ a, b, minus }: { a: number; b: number; minus: boolean }) {
  const th = useGrokTheme();
  const c = 26, out: ReactNode[] = [];
  for (let i = 0; i < 20; i++) {
    const f = Math.floor(i / 10), j = i % 10, x = 12 + f * 150 + (j % 5) * c, y = 8 + Math.floor(j / 5) * c;
    out.push(<rect key={"r" + i} x={x} y={y} width={c} height={c} fill="none" stroke={th.border.strong} />);
    const has = minus ? i < a : i < a + b;
    if (has) {
      const cross = minus && i >= a - b;
      out.push(<circle key={"d" + i} cx={x + c / 2} cy={y + c / 2} r={9} fill={cross ? th.text.tertiary : !minus && i >= a ? K.blue : K.red} opacity={cross ? 0.5 : 1} />);
      if (cross) out.push(<path key={"x" + i} d={`M${x + 6} ${y + 6}L${x + c - 6} ${y + c - 6}M${x + c - 6} ${y + 6}L${x + 6} ${y + c - 6}`} stroke={th.text.primary} strokeWidth={2} />);
    }
  }
  return svg("0 0 310 66", <g>{out}</g>, 420);
}
function Dots({ r, c }: { r: number; c: number }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out.push(<circle key={i + "-" + j} cx={16 + j * 24} cy={16 + i * 24} r={8} fill={i % 2 ? K.orange : K.yellow} />);
  return svg(`0 0 ${c * 24 + 8} ${r * 24 + 8}`, <g>{out}</g>, c * 24 + 8);
}
function RectFig({ a, b, grid = false, all = false, la, lb }: { a: number; b: number; grid?: boolean; all?: boolean; la: string; lb: string }) {
  const th = useGrokTheme();
  const c = Math.min(220 / a, 110 / b, 30), w = a * c, h = b * c, ox = (320 - w) / 2, oy = 22;
  const lines: ReactNode[] = [];
  if (grid) {
    for (let i = 1; i < a; i++) lines.push(<line key={"v" + i} x1={ox + i * c} y1={oy} x2={ox + i * c} y2={oy + h} stroke={th.border.strong} />);
    for (let j = 1; j < b; j++) lines.push(<line key={"h" + j} x1={ox} y1={oy + j * c} x2={ox + w} y2={oy + j * c} stroke={th.border.strong} />);
  }
  return svg(`0 0 320 ${h + 52}`, (
    <g>
      <rect x={ox} y={oy} width={w} height={h} fill={K.blue} fillOpacity={0.18} stroke={th.text.primary} strokeWidth={2.5} />
      {lines}
      <text x={ox + w / 2} y={oy + h + 22} textAnchor="middle" fontSize={14} fill={th.text.primary}>{la}</text>
      <text x={ox - 8} y={oy + h / 2 + 5} textAnchor="end" fontSize={14} fill={th.text.primary}>{lb}</text>
      {all && <text x={ox + w / 2} y={oy - 6} textAnchor="middle" fontSize={14} fill={th.text.primary}>{la}</text>}
      {all && <text x={ox + w + 8} y={oy + h / 2 + 5} fontSize={14} fill={th.text.primary}>{lb}</text>}
    </g>
  ), 400);
}
function TriFig({ ang, lab, right }: { ang: Tri3; lab: [string, string, string]; right?: number }) {
  const th = useGrokTheme();
  const [A, B, C] = ang;
  const bl = Math.sin(rad(B)) / Math.sin(rad(C));
  const raw: Pt[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: bl * Math.cos(rad(A)), y: bl * Math.sin(rad(A)) }];
  const minX = Math.min(...raw.map((p) => p.x)), maxX = Math.max(...raw.map((p) => p.x)), maxY = Math.max(...raw.map((p) => p.y));
  const s = Math.min(250 / (maxX - minX), 125 / maxY), ox = (320 - (maxX - minX) * s) / 2 - minX * s;
  const P = raw.map((p) => ({ x: ox + p.x * s, y: 160 - p.y * s }));
  const G = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3 };
  const cols = [K.red, K.blue, K.green];
  let mk: ReactNode = null;
  if (right !== undefined) {
    const V = P[right], o = P.filter((_, i) => i !== right);
    const u = o.map((q) => { const dx = q.x - V.x, dy = q.y - V.y, l = Math.hypot(dx, dy); return { x: (dx / l) * 14, y: (dy / l) * 14 }; });
    mk = <path d={`M${V.x + u[0].x} ${V.y + u[0].y}L${V.x + u[0].x + u[1].x} ${V.y + u[0].y + u[1].y}L${V.x + u[1].x} ${V.y + u[1].y}`} fill="none" stroke={th.text.primary} strokeWidth={1.5} />;
  }
  return svg("0 0 320 180", (
    <g>
      <polygon points={P.map((p) => `${p.x},${p.y}`).join(" ")} fill={K.purple} fillOpacity={0.15} stroke={th.text.primary} strokeWidth={2.5} strokeLinejoin="round" />
      {mk}
      {P.map((V, i) => { const dx = G.x - V.x, dy = G.y - V.y, l = Math.hypot(dx, dy); return <text key={i} x={V.x + (dx / l) * 34} y={V.y + (dy / l) * 34 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={cols[i]}>{lab[i]}</text>; })}
    </g>
  ), 400);
}
function CircleFig({ lab, dia = false, note }: { lab: string; dia?: boolean; note?: string }) {
  const th = useGrokTheme();
  return svg("0 0 320 180", (
    <g>
      <circle cx={160} cy={82} r={64} fill={K.teal} fillOpacity={0.15} stroke={th.text.primary} strokeWidth={2.5} />
      <circle cx={160} cy={82} r={3.5} fill={th.text.primary} />
      <line x1={dia ? 96 : 160} y1={82} x2={224} y2={82} stroke={K.red} strokeWidth={3} />
      <text x={dia ? 160 : 192} y={74} textAnchor="middle" fontSize={14} fontWeight={700} fill={th.text.primary}>{lab}</text>
      {note && <text x={160} y={172} textAnchor="middle" fontSize={14} fill={th.text.secondary}>{note}</text>}
    </g>
  ), 380);
}
function RightTri({ a, b, la, lb, lc }: { a: number; b: number; la: string; lb: string; lc: string }) {
  const th = useGrokTheme();
  const s = Math.min(170 / a, 115 / b), R = { x: 80, y: 140 }, A = { x: 80 + a * s, y: 140 }, B = { x: 80, y: 140 - b * s };
  return svg("0 0 320 170", (
    <g>
      <polygon points={`${R.x},${R.y} ${A.x},${A.y} ${B.x},${B.y}`} fill={K.yellow} fillOpacity={0.25} stroke={th.text.primary} strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`M${R.x + 12} ${R.y}L${R.x + 12} ${R.y - 12}L${R.x} ${R.y - 12}`} fill="none" stroke={th.text.primary} />
      <text x={(R.x + A.x) / 2} y={R.y + 20} textAnchor="middle" fontSize={14} fontWeight={700} fill={K.red}>{la}</text>
      <text x={R.x - 8} y={(R.y + B.y) / 2 + 5} textAnchor="end" fontSize={14} fontWeight={700} fill={K.blue}>{lb}</text>
      <text x={(A.x + B.x) / 2 + 12} y={(A.y + B.y) / 2 - 8} fontSize={14} fontWeight={700} fill={K.purple}>{lc}</text>
    </g>
  ), 380);
}

/* ---------- explanation animations ---------- */
function exAdd(t: number, th: Theme): ReactNode {
  const c = 28;
  const pos = (f: number, i: number): Pt => ({ x: (f ? 196 : 24) + c / 2 + (i % 5) * c, y: 46 + c / 2 + Math.floor(i / 5) * c });
  const m = ease(seg(t, 0.3, 0.62)), full = t > 0.62;
  const cells: ReactNode[] = [], dots: ReactNode[] = [];
  for (let f = 0; f < 2; f++) for (let i = 0; i < 10; i++) { const p = pos(f, i); cells.push(<rect key={`c${f}${i}`} x={p.x - c / 2} y={p.y - c / 2} width={c} height={c} fill="none" stroke={f === 0 && full ? K.green : th.border.strong} strokeWidth={f === 0 && full ? 2.5 : 1} />); }
  for (let i = 0; i < 8; i++) { const p = pos(0, i); dots.push(<circle key={"r" + i} cx={p.x} cy={p.y} r={10} fill={K.red} />); }
  for (let j = 0; j < 5; j++) { const s = pos(1, j), e = j < 2 ? pos(0, 8 + j) : pos(1, j - 2); dots.push(<circle key={"b" + j} cx={lerp(s.x, e.x, m)} cy={lerp(s.y, e.y, m)} r={10} fill={K.blue} />); }
  return svg("0 0 360 170", (
    <g>
      <text x={94} y={34} textAnchor="middle" fill={th.text.secondary} fontSize={14}>{full ? "满十啦！" : "8 个"}</text>
      <text x={266} y={34} textAnchor="middle" fill={th.text.secondary} fontSize={14}>{full ? "还剩 3 个" : "5 个"}</text>
      {cells}{dots}
      <text x={180} y={150} textAnchor="middle" fill={th.text.primary} fontSize={20} fontWeight={700}>{t < 0.3 ? "8 + 5 = ?" : !full ? "把 5 分成 2 和 3……" : "8 + 2 = 10，10 + 3 = 13"}</text>
    </g>
  ));
}
function exMul(t: number, th: Theme): ReactNode {
  const out: ReactNode[] = [], sums = ["4", "4 + 4 = 8", "4 + 4 + 4 = 12"];
  for (let r = 0; r < 3; r++) {
    const a = seg(t, 0.05 + r * 0.18, 0.18 + r * 0.18);
    for (let c = 0; c < 4; c++) out.push(<circle key={`${r}${c}`} cx={40 + c * 36} cy={36 + r * 36} r={12 * a} fill={K.orange} />);
    if (a >= 1) out.push(<text key={"s" + r} x={190} y={41 + r * 36} fontSize={15} fill={th.text.primary}>{sums[r]}</text>);
  }
  if (t > 0.82) for (let c = 0; c < 4; c++) out.push(<rect key={"col" + c} x={40 + c * 36 - 16} y={18} width={32} height={108} rx={16} fill="none" stroke={K.blue} strokeWidth={2.5} />);
  return svg("0 0 360 175", (
    <g>
      {out}
      {t > 0.62 && <text x={180} y={158} textAnchor="middle" fontSize={18} fontWeight={700} fill={th.text.primary}>{t < 0.82 ? "3 × 4 = 12（三四十二）" : "竖着看是 4 个 3：4 × 3 = 12"}</text>}
    </g>
  ));
}
function exAngle(t: number, th: Theme): ReactNode {
  const a = t < 0.2 ? lerp(10, 50, ease(seg(t, 0, 0.2))) : t < 0.38 ? lerp(50, 90, ease(seg(t, 0.2, 0.38))) : t < 0.58 ? 90 : t < 0.78 ? lerp(90, 140, ease(seg(t, 0.58, 0.78))) : lerp(140, 90, ease(seg(t, 0.78, 0.92)));
  const d = Math.round(a), V = { x: 180, y: 172 };
  return svg("0 0 360 195", (
    <g>
      {protractor(V, 128, th)}
      {angleEls(d, 0, V, 150, th, d === 90, false)}
      <text x={12} y={30} fontSize={22} fontWeight={700} fill={th.text.primary}>{d}°</text>
      <text x={12} y={56} fontSize={18} fontWeight={700} fill={d === 90 ? K.green : d < 90 ? K.blue : K.orange}>{d === 90 ? "直角" : d < 90 ? "锐角" : "钝角"}</text>
    </g>
  ));
}
function exFrac(t: number, th: Theme): ReactNode {
  const cuts = Math.floor(seg(t, 0, 0.28) * 8 + 1e-4), sh = Math.floor(seg(t, 0.32, 0.7) * 3 + 1e-4);
  return svg("0 0 360 200", (
    <g>
      <circle cx={100} cy={100} r={84} fill={K.orange} />
      <circle cx={100} cy={100} r={74} fill="#FFE39A" />
      {Array.from({ length: sh }, (_, i) => <path key={"s" + i} d={sector(100, 100, 74, 90 - (i + 1) * 45, 90 - i * 45)} fill={K.red} />)}
      {Array.from({ length: cuts }, (_, i) => <line key={"l" + i} x1={100} y1={100} x2={100 + 84 * Math.cos(rad(90 - i * 45))} y2={100 - 84 * Math.sin(rad(90 - i * 45))} stroke="#9A6400" strokeWidth={2.5} />)}
      <text x={255} y={82} textAnchor="middle" fontSize={40} fontWeight={700} fill={K.red}>{sh}</text>
      <line x1={225} y1={96} x2={285} y2={96} stroke={th.text.primary} strokeWidth={3} />
      <text x={255} y={136} textAnchor="middle" fontSize={40} fontWeight={700} fill={th.text.primary}>{cuts}</text>
      <text x={295} y={74} fontSize={13} fill={th.text.secondary}>分子</text>
      <text x={295} y={128} fontSize={13} fill={th.text.secondary}>分母</text>
      {t > 0.72 && <text x={255} y={172} textAnchor="middle" fontSize={16} fontWeight={700} fill={th.text.primary}>八分之三</text>}
    </g>
  ));
}
function exArea(t: number, th: Theme): ReactNode {
  const cnt = Math.floor(seg(t, 0, 0.5) * 15 + 1e-4), p = seg(t, 0.65, 0.9);
  const cells: ReactNode[] = [];
  for (let k = 0; k < 15; k++) cells.push(<rect key={k} x={100 + (k % 5) * 32} y={20 + Math.floor(k / 5) * 32} width={32} height={32} fill={k < cnt ? K.blue : "none"} fillOpacity={0.45} stroke={th.border.strong} />);
  return svg("0 0 360 190", (
    <g>
      {cells}
      <path d="M100 20h160v96h-160Z" fill="none" stroke={K.red} strokeWidth={4} strokeDasharray={512} strokeDashoffset={512 * (1 - p)} />
      <text x={180} y={134} textAnchor="middle" fontSize={12} fill={th.text.secondary}>长 5 厘米</text>
      <text x={92} y={72} textAnchor="end" fontSize={12} fill={th.text.secondary}>宽 3 厘米</text>
      <text x={180} y={156} textAnchor="middle" fontSize={15} fontWeight={700} fill={th.text.primary}>{t < 0.55 ? `已经铺了 ${cnt} 个小方格` : "面积 = 长 × 宽 = 5 × 3 = 15 平方厘米"}</text>
      {t > 0.65 && <text x={180} y={180} textAnchor="middle" fontSize={15} fontWeight={700} fill={K.red}>{t < 0.9 ? "沿着边走一圈……" : "周长 = (5 + 3) × 2 = 16 厘米"}</text>}
    </g>
  ));
}
function exTri(t: number, th: Theme): ReactNode {
  const A = { x: 50, y: 135 }, B = { x: 270, y: 135 }, C = { x: 115, y: 30 };
  const dir = (p: Pt, q: Pt): number => (Math.atan2(-(q.y - p.y), q.x - p.x) * 180) / Math.PI;
  const aA = dir(A, C), aB = 180 - dir(B, C), P = { x: 160, y: 195 }, r = 30;
  const W = [
    { f: A, d: sector(0, 0, r, 0, aA), rot: 0, col: K.red, s: 0.25, lab: "∠1" },
    { f: C, d: sector(0, 0, r, 180 + aA, 360 - aB), rot: 180, col: K.blue, s: 0.38, lab: "∠2" },
    { f: B, d: sector(0, 0, r, 180 - aB, 180), rot: 0, col: K.green, s: 0.5, lab: "∠3" },
  ];
  return svg("0 0 330 215", (
    <g>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={th.text.primary} strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={30} y1={P.y} x2={300} y2={P.y} stroke={th.text.tertiary} strokeWidth={2} strokeDasharray={t > 0.82 ? "0" : "5 5"} />
      {W.map((w, i) => {
        const m = ease(seg(t, w.s, w.s + 0.3));
        return (
          <g key={i}>
            {m > 0 && <path d={w.d} transform={`translate(${w.f.x} ${w.f.y})`} fill={w.col} fillOpacity={0.15} />}
            <path d={w.d} transform={`translate(${lerp(w.f.x, P.x, m)} ${lerp(w.f.y, P.y, m)}) rotate(${lerp(0, w.rot, m)})`} fill={w.col} fillOpacity={0.85} stroke={th.text.primary} strokeWidth={1} />
          </g>
        );
      })}
      {t < 0.25 && <g><text x={88} y={128} fontSize={13} fill={K.red} fontWeight={700}>∠1</text><text x={113} y={68} fontSize={13} fill={K.blue} fontWeight={700}>∠2</text><text x={222} y={128} fontSize={13} fill={K.green} fontWeight={700}>∠3</text></g>}
      {t > 0.82 && <g><text x={322} y={34} textAnchor="end" fontSize={15} fontWeight={700} fill={th.text.primary}>拼成一个平角！</text><text x={322} y={58} textAnchor="end" fontSize={15} fontWeight={700} fill={th.text.primary}>∠1+∠2+∠3=180°</text></g>}
    </g>
  ));
}
function exCircle(t: number, th: Theme): ReactNode {
  if (t < 0.55) {
    const tt = ease(seg(t, 0.05, 0.45)), r = 28, x0 = 30, th0 = tt * 2 * Math.PI, cx = x0 + r * th0, cy = 130 - r;
    const ticks: ReactNode[] = [];
    if (t > 0.46) for (let i = 0; i < 3; i++) ticks.push(<g key={i}><path d={`M${x0 + i * 56 + 2} 142v8h52v-8`} fill="none" stroke={i % 2 ? K.orange : K.green} strokeWidth={2} /><text x={x0 + i * 56 + 28} y={164} textAnchor="middle" fontSize={13} fill={th.text.primary}>d</text></g>);
    return svg("0 0 360 200", (
      <g>
        <line x1={10} y1={130} x2={350} y2={130} stroke={th.border.strong} />
        <line x1={x0} y1={130} x2={x0 + r * th0} y2={130} stroke={K.red} strokeWidth={5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill={K.blue} fillOpacity={0.15} stroke={K.blue} strokeWidth={3} />
        {tt === 0 && <g><line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={K.green} strokeWidth={2} /><text x={cx} y={cy - 6} textAnchor="middle" fontSize={12} fill={th.text.primary}>d</text></g>}
        <circle cx={cx - r * Math.sin(th0)} cy={cy + r * Math.cos(th0)} r={5} fill={K.red} />
        {ticks}
        {t > 0.46 && <text x={180} y={190} textAnchor="middle" fontSize={15} fontWeight={700} fill={th.text.primary}>周长 = 3 个直径多一点 ≈ 3.14 × 直径</text>}
      </g>
    ));
  }
  const n = 16, r = 50, h = Math.PI / n, w = 2 * r * Math.sin(h), sx = 190, by = 140, m = ease(seg(t, 0.6, 0.88));
  const wedge = `M0 0L${-r * Math.sin(h)} ${-r * Math.cos(h)}A${r} ${r} 0 0 1 ${r * Math.sin(h)} ${-r * Math.cos(h)}Z`;
  return svg("0 0 360 200", (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const up = i < n / 2, k = up ? i : i - n / 2, phi = (i + 0.5) * (360 / n);
        const tx = up ? sx + k * w : sx + k * w + w / 2, ty = up ? by : by - r * Math.cos(h), tr = up ? (phi > 180 ? 360 : 0) : 180;
        return <path key={i} d={wedge} transform={`translate(${lerp(85, tx, m)} ${lerp(100, ty, m)}) rotate(${lerp(phi, tr, m)})`} fill={up ? K.orange : K.blue} stroke={th.text.primary} strokeWidth={0.8} />;
      })}
      {t > 0.88 && <g><text x={sx + 72} y={166} textAnchor="middle" fontSize={13} fill={th.text.primary}>长 ≈ πr（周长的一半）</text><text x={sx - w / 2 - 6} y={120} textAnchor="end" fontSize={13} fill={th.text.primary}>宽 r</text><text x={180} y={192} textAnchor="middle" fontSize={16} fontWeight={700} fill={th.text.primary}>面积 = πr × r = πr²</text></g>}
    </g>
  ));
}
function exPyth(t: number, th: Theme): ReactNode {
  const u = 14, na = Math.floor(seg(t, 0.05, 0.3) * 9 + 1e-4), nb = Math.floor(seg(t, 0.35, 0.6) * 16 + 1e-4), nc = Math.floor(seg(t, 0.65, 0.92) * 25 + 1e-4);
  const A = { x: 172, y: 150 }, Bv = { x: -42, y: -56 }, N = { x: 56, y: -42 };
  const cells: ReactNode[] = [];
  for (let i = 0; i < 9; i++) cells.push(<rect key={"a" + i} x={130 + (i % 3) * u} y={150 + Math.floor(i / 3) * u} width={u} height={u} fill={i < na ? K.red : "none"} fillOpacity={0.7} stroke={th.border.strong} />);
  for (let i = 0; i < 16; i++) cells.push(<rect key={"b" + i} x={74 + (i % 4) * u} y={94 + Math.floor(i / 4) * u} width={u} height={u} fill={i < nb ? K.blue : "none"} fillOpacity={0.7} stroke={th.border.strong} />);
  for (let k = 0; k < 25; k++) {
    const s = k % 5, q = Math.floor(k / 5);
    const p = (ds: number, dq: number): string => `${A.x + ((s + ds) * Bv.x) / 5 + ((q + dq) * N.x) / 5},${A.y + ((s + ds) * Bv.y) / 5 + ((q + dq) * N.y) / 5}`;
    cells.push(<polygon key={"c" + k} points={`${p(0, 0)} ${p(1, 0)} ${p(1, 1)} ${p(0, 1)}`} fill={k < nc ? (k < 9 ? K.red : K.blue) : "none"} fillOpacity={0.7} stroke={th.border.strong} />);
  }
  return svg("0 0 360 205", (
    <g>
      {cells}
      <polygon points="130,150 172,150 130,94" fill={K.yellow} fillOpacity={0.6} stroke={th.text.primary} strokeWidth={2} />
      <text x={262} y={150} fontSize={14} fill={K.red} fontWeight={700}>{na ? `a² = ${na}` : ""}</text>
      <text x={262} y={170} fontSize={14} fill={K.blue} fontWeight={700}>{nb ? `b² = ${nb}` : ""}</text>
      <text x={262} y={190} fontSize={14} fill={th.text.primary} fontWeight={700}>{nc ? `c² = ${nc}` : ""}</text>
      <text x={150} y={166} fontSize={12} fill={th.text.primary}>3</text>
      <text x={120} y={126} fontSize={12} fill={th.text.primary}>4</text>
      {t > 0.92 && <text x={12} y={30} fontSize={17} fontWeight={700} fill={th.text.primary}>9 + 16 = 25：a² + b² = c²</text>}
    </g>
  ));
}

/* ---------- levels ---------- */
const LV: Level[] = [
  {
    id: "add", tag: "1年级", name: "20以内加减法", color: K.red, dur: 7000,
    intro: "这一关是一年级的「20以内加减法」。小派教你一个秘密武器：凑十法！先看动画吧～",
    keys: ["凑十法：8 + 5 → 8 + 2 = 10，10 + 3 = 13", "破十法：15 − 7 → 10 − 7 = 3，3 + 5 = 8", "不进位、不退位：先算个位，再加上 10"],
    caps: [[0, "左边有 8 个红点，右边有 5 个蓝点。8 + 5 等于几？"], [0.3, "8 还差 2 个就满 10 了，从 5 里拿 2 个过来。"], [0.62, "满十啦！10 再加剩下的 3，就是 13。这就是「凑十法」。"]],
    ex: exAdd,
    gen: (d: number): Q => {
      const plus = Math.random() < 0.55;
      let a = 0, b = 0;
      if (d === 1) { if (plus) { a = rnd(1, 9); b = rnd(1, 10 - a); } else { a = rnd(2, 10); b = rnd(1, a); } }
      else if (d === 2) { if (plus) { a = rnd(11, 18); b = rnd(1, 19 - a); } else { a = rnd(11, 19); b = rnd(1, a - 10); } }
      else { if (plus) { a = rnd(2, 9); b = rnd(11 - a, 9); } else { a = rnd(11, 18); b = rnd(a - 9, 9); } }
      const ans = plus ? a + b : a - b;
      let h0 = "可以掰掰手指，或者在脑子里数一数哦。", h2 = "";
      if (plus && a < 10 && b < 10 && ans > 10) { const big = Math.max(a, b), sm = Math.min(a, b), need = 10 - big; h0 = "想一想：先凑成 10 会不会更简单？"; h2 = `凑十法：${big} 还差 ${need} 就是 10，把 ${sm} 分成 ${need} 和 ${sm - need}，10 + ${sm - need} = ${ans}。`; }
      else if (plus && a > 10) h2 = `先算个位：${a - 10} + ${b} = ${a - 10 + b}，再加上 10，得 ${ans}。`;
      else if (plus) h2 = `从 ${a} 开始，再往后数 ${b} 个，就是 ${ans}。`;
      else if (a > 10 && b > a - 10) { h0 = "试试「破十法」：先用 10 去减。"; h2 = `破十法：把 ${a} 分成 10 和 ${a - 10}，10 − ${b} = ${10 - b}，${10 - b} + ${a - 10} = ${ans}。`; }
      else if (a > 10) h2 = `先算个位：${a - 10} − ${b} = ${a - 10 - b}，再加上 10，得 ${ans}。`;
      else h2 = `${a} 个去掉 ${b} 个，还剩 ${ans} 个。`;
      return { prompt: `${a} ${plus ? "+" : "−"} ${b} = ?`, mode: "pad", answer: String(ans), hints: [h0, "看看小方格里的圆点（打叉的是去掉的），数一数就知道啦。", h2], hintDraw: () => <TenFrame a={a} b={b} minus={!plus} /> };
    },
  },
  {
    id: "mul", tag: "2年级", name: "乘法口诀", color: K.orange, dur: 7000,
    intro: "二年级的乘法口诀来啦！乘法就是「几个几」连加的快捷方式。",
    keys: ["3 × 4 表示 3 个 4 相加", "乘法口诀：三四十二", "交换两个数的位置，积不变：3 × 4 = 4 × 3", "除法是乘法的反过来：12 ÷ 3 = 4"],
    caps: [[0, "一行摆 4 个，摆 3 行。"], [0.62, "3 个 4 相加：4 + 4 + 4 = 12，写成 3 × 4 = 12。"], [0.82, "竖着看，是 4 个 3，所以 4 × 3 也等于 12。"]],
    ex: exMul,
    gen: (d: number): Q => {
      const a = d === 1 ? rnd(2, 5) : rnd(2, 9), b = rnd(d === 1 ? 1 : 2, 9), p = a * b, k = kj(a, b);
      const fig = () => <Dots r={a} c={b} />;
      if (d === 3 && Math.random() < 0.6) {
        if (Math.random() < 0.5) return { prompt: `${p} ÷ ${a} = ?`, mode: "pad", answer: String(b), hintDraw: fig, hints: [`想一想：${a} 乘几等于 ${p}？`, `看图：${p} 个圆点平均分成 ${a} 行，每行几个？`, `用口诀「${k}」，所以 ${p} ÷ ${a} = ${b}。`] };
        return { prompt: `? × ${b} = ${p}`, mode: "pad", answer: String(a), hintDraw: fig, hints: [`想一想：几乘 ${b} 等于 ${p}？`, `看图：每行 ${b} 个，一共 ${p} 个，有几行？`, `用口诀「${k}」，所以 ${a} × ${b} = ${p}，? 就是 ${a}。`] };
      }
      const add = a <= 5 ? Array.from({ length: a }, () => String(b)).join(" + ") : `${a} 个 ${b} 相加`;
      return { prompt: `${a} × ${b} = ?`, mode: "pad", answer: String(p), hintDraw: fig, hints: [`背一背 ${Math.min(a, b)} 的乘法口诀试试～`, `看图：${a} 行，每行 ${b} 个圆点，一共有多少个？`, `${a} × ${b} 表示 ${a} 个 ${b}：${add} = ${p}，口诀「${k}」。`] };
    },
  },
  {
    id: "angle", tag: "2年级", name: "认识直角、锐角、钝角", color: K.green, dur: 9000,
    intro: "我们来认识角！直角、锐角、钝角是三兄弟，看看它们有什么不同。",
    keys: ["直角 = 90°，用小正方形标出", "锐角：小于 90°", "钝角：大于 90° 且小于 180°", "角的大小只看两条边张开多大，和边的长短无关"],
    caps: [[0, "角有一个顶点和两条边。转动一条边，角就变大或变小。"], [0.2, "比直角小的角，叫锐角。"], [0.38, "正好 90° 的角叫直角，用一个小正方形做标记。"], [0.6, "比直角大、比平角（180°）小的角，叫钝角。"], [0.82, "小技巧：把一张纸对折，再对折，折出来的角就是直角！"]],
    ex: exAngle,
    gen: (d: number): Q => {
      if (Math.random() < 0.6) {
        const ty = pick(["锐角", "直角", "钝角"]);
        const deg = ty === "直角" ? 90 : ty === "锐角" ? (d === 1 ? rnd(20, 60) : d === 2 ? rnd(35, 75) : rnd(70, 84)) : d === 1 ? rnd(120, 160) : d === 2 ? rnd(105, 145) : rnd(96, 110);
        const rot = d === 1 ? 0 : rnd(0, 35) * 10;
        return {
          prompt: "这个角是什么角？", sig: `${deg}-${rot}`, mode: "choice", options: ["锐角", "直角", "钝角"], answer: ty,
          draw: () => <AngleFig deg={deg} rot={rot} />, hintDraw: () => <AngleFig deg={deg} rot={rot} ref90 />,
          hints: ["直角正好是 90°，就像课本的角。比一比：这个角比直角大，还是比直角小？", "小派在旁边放了一个直角（虚线和小方块），你来比一比。", `这个角是 ${deg}°。小于 90° 是锐角，等于 90° 是直角，大于 90° 小于 180° 是钝角，所以它是${ty}。`],
        };
      }
      const ty = pick(["直角", "直角", "锐角", "钝角"]), tol = d === 1 ? 3 : d === 2 ? 2 : 1;
      return {
        prompt: `拖动滑块，做出一个${ty}，再点「确定」。`, sig: "s" + ty + d, mode: "angle", showDeg: d < 3,
        answer: ty === "直角" ? "90°" : ty === "锐角" ? "小于 90° 的角，比如 45°" : "大于 90°、小于 180° 的角，比如 120°",
        ok: (v: string) => { const n = Number(v); return ty === "直角" ? Math.abs(n - 90) <= tol : ty === "锐角" ? n > 0 && n < 90 - tol : n > 90 + tol && n < 180; },
        hintDraw: () => <AngleFig deg={90} proto mark />,
        hints: [ty === "直角" ? "直角是 90°，它的标记是一个小正方形。" : ty === "锐角" ? "锐角比直角小，张口要小一点哦。" : "钝角比直角大，但还没有变成一条直线。", "看提示图里的直角，再对着量角器上的 90 刻度调一调。", ty === "直角" ? "把转动的边对准量角器上的 90，出现绿色小正方形就对啦。" : ty === "锐角" ? "把边转到 0 和 90 之间，比如 45°。" : "把边转到 90 和 180 之间，比如 120°。"],
      };
    },
  },
  {
    id: "frac", tag: "3年级", name: "认识分数", color: K.pink, dur: 7000,
    intro: "三年级的分数：把一个披萨平均分，就能看到分数啦！",
    keys: ["平均分是前提：每一份要一样大", "分母：平均分成几份；分子：取了几份", "同分母：分子大的分数大", "同分子：分母小的分数大（分得越少，每份越大）"],
    caps: [[0, "把一个披萨平均切成 8 份，每份一样大。"], [0.3, "拿出其中的 3 份……"], [0.72, "3 份占 8 份中的 3 份，写作 3/8，读作「八分之三」。下面的 8 是分母，上面的 3 是分子。"]],
    ex: exFrac,
    gen: (d: number): Q => {
      const r = Math.random();
      if (d >= 2 && r < 0.3) {
        let k1 = 1, n1 = 2, k2 = 1, n2 = 2;
        if (d === 2) { n1 = rnd(3, 9); n2 = n1; k1 = rnd(1, n1 - 1); do { k2 = rnd(1, n1 - 1); } while (k2 === k1); }
        else { k1 = rnd(1, 3); k2 = k1; n1 = rnd(k1 + 1, 9); do { n2 = rnd(k1 + 1, 9); } while (n2 === n1); }
        const ans = k1 / n1 > k2 / n2 ? ">" : "<", same = n1 === n2;
        return {
          prompt: `比大小：${k1}/${n1} ○ ${k2}/${n2}`, mode: "choice", options: [">", "<", "="], answer: ans,
          hintDraw: () => <div><FracBar n={n1} k={k1} label={`${k1}/${n1}`} /><FracBar n={n2} k={k2} label={`${k2}/${n2}`} /></div>,
          hints: [same ? "分母一样，说明每份一样大，比一比取了几份。" : "取的份数一样，那就比每一份的大小：分得越多，每份越小。", "看看两条长条图，哪一条涂得更长？", same ? `分母都是 ${n1}，${k1} 份比 ${k2} 份${k1 > k2 ? "多" : "少"}，所以 ${k1}/${n1} ${ans} ${k2}/${n2}。` : `都取 ${k1} 份；分成 ${n1} 份时每份比分成 ${n2} 份时${n1 < n2 ? "大" : "小"}，所以 ${k1}/${n1} ${ans} ${k2}/${n2}。`],
        };
      }
      if (r < 0.65) {
        let k = 1, n = 2, m = 2;
        if (d === 3) { const e = pick<Tri3>([[1, 2, 4], [1, 2, 6], [1, 2, 8], [1, 3, 6], [2, 3, 6], [1, 4, 8], [3, 4, 8]]); k = e[0]; n = e[1]; m = e[2]; }
        else { n = d === 1 ? rnd(2, 4) : rnd(3, 8); k = rnd(1, n - 1); m = n; }
        const need = (k * m) / n;
        return {
          prompt: `点一点披萨，涂出整个披萨的 ${k}/${n}（${cnF(k, n)}）。`, sig: `sh${k}/${n}/${m}`, mode: "shade", parts: m, answer: `涂 ${need} 块`,
          ok: (v: string) => Number(v) === need, hintDraw: () => <FracBar n={m} k={need} label={`${m} 块里涂 ${need} 块`} />,
          hints: [m === n ? "分母是平均分成几份，分子是要涂几份。" : `披萨切成了 ${m} 块，${k}/${n} 要先把这些块平均分成 ${n} 组哦。`, "看看下面的长条图，照着涂一涂。", m === n ? `平均分成 ${n} 份，涂其中的 ${k} 份。` : `${m} 块平均分成 ${n} 组，每组 ${m / n} 块；取 ${k} 组，就是 ${need} 块。`],
        };
      }
      const n = d === 1 ? rnd(2, 5) : rnd(3, 9), k = rnd(1, n - 1);
      const base = Array.from({ length: n }, (_, i) => i < k);
      const on = d >= 2 ? shuffle(base) : base;
      const right = `${k}/${n}`;
      const others = Array.from(new Set([`${n}/${k}`, `${n - k}/${n}`, `${k}/${n + 1}`, `${k}/${n - k}`, `${k + 1}/${n}`])).filter((x) => x !== right);
      return {
        prompt: "涂色部分占整个披萨的几分之几？", sig: right, mode: "choice", options: shuffle([right, ...others.slice(0, 3)]), answer: right,
        draw: () => <Pizza n={n} on={on} />, hintDraw: () => <FracBar n={n} k={k} />,
        hints: ["数一数：一共平均分成了几份？涂色的有几份？", "看看长条图：涂色部分和整条比一比。", `一共平均分成 ${n} 份，涂了 ${k} 份，就是 ${k}/${n}，读作${cnF(k, n)}。`],
      };
    },
  },
  {
    id: "area", tag: "3年级", name: "长方形的周长与面积", color: K.blue, dur: 9000,
    intro: "周长和面积总是分不清？看动画：一个是绕一圈的线，一个是铺满的面。",
    keys: ["周长：沿着边线走一圈的长度，单位是厘米", "面积：图形占的面有多大，单位是平方厘米", "长方形周长 = (长 + 宽) × 2", "长方形面积 = 长 × 宽"],
    caps: [[0, "用 1 平方厘米的小方格铺满长方形：每行 5 个，铺 3 行。"], [0.55, "一共 15 个小方格，面积就是 15 平方厘米，正好是 长 × 宽。"], [0.65, "周长是沿着边线走一圈：长 + 宽 + 长 + 宽。"], [0.92, "(5 + 3) × 2 = 16 厘米。记住：周长是线，面积是面！"]],
    ex: exArea,
    gen: (d: number): Q => {
      let a = rnd(3, d === 1 ? 6 : 9), b = rnd(2, d === 1 ? 4 : 6);
      if (b > a) { const x = a; a = b; b = x; }
      if (d === 3 && Math.random() < 0.5) {
        const S = a * b;
        return { prompt: `长方形的面积是 ${S} 平方厘米，长 ${a} 厘米，宽是多少厘米？`, mode: "pad", answer: String(b), draw: () => <RectFig a={a} b={b} la={`${a} 厘米`} lb="? 厘米" />, hintDraw: () => <RectFig a={a} b={b} grid la={`每行 ${a} 个`} lb="几行？" />, hints: ["面积 = 长 × 宽。现在知道了面积和长，宽怎么求？", `看图：每行 ${a} 个小方格，一共 ${S} 个，有几行？`, `宽 = 面积 ÷ 长 = ${S} ÷ ${a} = ${b}（厘米）。`] };
      }
      const area = Math.random() < 0.5;
      return {
        prompt: `这个长方形的${area ? "面积是多少平方厘米" : "周长是多少厘米"}？`, sig: `${a}x${b}${area}`, mode: "pad", answer: String(area ? a * b : 2 * (a + b)),
        draw: () => <RectFig a={a} b={b} grid={d === 1} la={`长 ${a} 厘米`} lb={`宽 ${b} 厘米`} />, hintDraw: () => <RectFig a={a} b={b} grid={area} all={!area} la={`${a}`} lb={`${b}`} />,
        hints: area ? ["面积就是图形里面有多少个 1 平方厘米的小方格。", "小派把小方格画出来了，可以一行一行地数。", `每行 ${a} 个，有 ${b} 行：${a} × ${b} = ${a * b}（平方厘米）。`] : ["周长是沿着图形边线走一圈的长度。", "小派把四条边都标出来了：两条长、两条宽。", `${a} + ${b} + ${a} + ${b} = (${a} + ${b}) × 2 = ${2 * (a + b)}（厘米）。`],
      };
    },
  },
  {
    id: "tri", tag: "4年级", name: "三角形内角和", color: K.purple, dur: 8000,
    intro: "四年级的神奇发现：任何三角形的三个角加起来都一样！猜猜是多少度？",
    keys: ["三角形三个内角的和是 180°", "第三个角 = 180° − 已知的两个角", "直角三角形的两个锐角加起来是 90°", "等腰三角形的两个底角相等"],
    caps: [[0, "一个三角形有三个角，我们给它们涂上颜色。"], [0.25, "把三个角「撕」下来，拼到一起……"], [0.82, "三个角正好拼成一条直线——平角，就是 180°！任何三角形都是这样。"]],
    ex: exTri,
    gen: (d: number): Q => {
      const kind = d === 1 ? 0 : d === 2 ? (Math.random() < 0.5 ? 1 : 0) : Math.random() < 0.6 ? 2 : 1;
      if (kind === 2) {
        const top = rnd(2, 14) * 10, base = (180 - top) / 2, askBase = Math.random() < 0.6;
        return { prompt: askBase ? `等腰三角形的顶角是 ${top}°，一个底角是多少度？` : `等腰三角形的一个底角是 ${base}°，顶角是多少度？`, mode: "pad", answer: String(askBase ? base : top), draw: () => <TriFig ang={[base, base, top]} lab={askBase ? ["?", "?", `${top}°`] : [`${base}°`, `${base}°`, "?"]} />, hints: ["等腰三角形的两个底角相等哦。三个角加起来是多少度？", "想想撕角拼图：三个角拼成一个平角，就是 180°。", askBase ? `(180° − ${top}°) ÷ 2 = ${base}°。` : `180° − ${base}° − ${base}° = ${top}°。`] };
      }
      if (kind === 1) {
        const A = rnd(4, 14) * 5;
        return { prompt: `直角三角形的一个锐角是 ${A}°，另一个锐角是多少度？`, mode: "pad", answer: String(90 - A), draw: () => <TriFig ang={[A, 90, 90 - A]} lab={[`${A}°`, "90°", "?"]} right={1} />, hints: ["直角三角形里有一个角是 90° 哦。", "三个角合起来是 180°，直角已经占了 90°……", `180° − 90° − ${A}° = ${90 - A}°。`] };
      }
      let A = 0, B = 0;
      if (d === 1) { A = rnd(4, 9) * 10; B = rnd(3, Math.min(9, (160 - A) / 10)) * 10; }
      else { A = rnd(6, 20) * 5; B = rnd(6, (160 - A) / 5) * 5; }
      const C = 180 - A - B;
      return { prompt: `三角形的两个角是 ${A}° 和 ${B}°，第三个角是多少度？`, mode: "pad", answer: String(C), draw: () => <TriFig ang={[A, B, C]} lab={[`${A}°`, `${B}°`, "?"]} />, hints: ["三角形三个内角的和是多少度？想想撕角拼图的动画。", "三个角拼起来是一个平角（一条直线），就是 180°。", `180° − ${A}° − ${B}° = ${C}°。`] };
    },
  },
  {
    id: "circle", tag: "6年级", name: "圆的周长与面积", color: K.teal, dur: 11000,
    intro: "六年级的圆：圆滚一圈有多长？圆的面积怎么算？跟小派一起看看吧！",
    keys: ["直径 d = 2 × 半径 r", "周长 C = πd = 2πr，π 取 3.14", "面积 S = πr²（切开拼成近似长方形）"],
    caps: [[0, "让一个圆在直线上滚一圈，红线的长度就是它的周长。"], [0.46, "量一量：周长是直径的 3 倍多一点，约 3.14 倍，这个数叫圆周率 π。"], [0.56, "把圆切成很多小扇形，一正一反拼起来……"], [0.88, "变成近似的长方形：长是周长的一半 πr，宽是半径 r，所以面积 S = πr²。"]],
    ex: exCircle,
    gen: (d: number): Q => {
      const kind = pick(d === 1 ? ["r2d", "d2r", "Cd"] : d === 2 ? ["Cr", "Sr", "Cd"] : ["Sd", "Cr", "Sr"]);
      const r = rnd(1, d === 3 ? 10 : 5), D = rnd(1, 6);
      let prompt = "", ans = 0, h0 = "", h2 = "", fig: () => ReactNode = () => <CircleFig lab={`r = ${r} 厘米`} />;
      if (kind === "r2d") { prompt = `圆的半径是 ${r} 厘米，直径是多少厘米？`; ans = 2 * r; h0 = "直径是半径的 2 倍。"; h2 = `d = 2r = 2 × ${r} = ${2 * r}（厘米）。`; }
      else if (kind === "d2r") { prompt = `圆的直径是 ${2 * r} 厘米，半径是多少厘米？`; ans = r; h0 = "半径是直径的一半。"; h2 = `r = d ÷ 2 = ${2 * r} ÷ 2 = ${r}（厘米）。`; fig = () => <CircleFig dia lab={`d = ${2 * r} 厘米`} />; }
      else if (kind === "Cd") { prompt = `直径是 ${D} 厘米的圆，周长是多少厘米？（π 取 3.14）`; ans = 3.14 * D; h0 = "周长 = π × 直径。"; h2 = `C = πd = 3.14 × ${D} = ${fmt(ans)}（厘米）。`; fig = () => <CircleFig dia lab={`d = ${D} 厘米`} />; }
      else if (kind === "Cr") { prompt = `半径是 ${r} 厘米的圆，周长是多少厘米？（π 取 3.14）`; ans = 2 * 3.14 * r; h0 = "周长 = 2 × π × 半径。"; h2 = `C = 2πr = 2 × 3.14 × ${r} = ${fmt(ans)}（厘米）。`; }
      else if (kind === "Sr") { prompt = `半径是 ${r} 厘米的圆，面积是多少平方厘米？（π 取 3.14）`; ans = 3.14 * r * r; h0 = "面积 = π × 半径 × 半径。"; h2 = `S = πr² = 3.14 × ${r} × ${r} = ${fmt(ans)}（平方厘米）。`; }
      else { const dd = 2 * rnd(1, 5), rr = dd / 2; prompt = `直径是 ${dd} 厘米的圆，面积是多少平方厘米？（π 取 3.14）`; ans = 3.14 * rr * rr; h0 = "求面积要用半径哦，先把直径变成半径。"; h2 = `r = ${dd} ÷ 2 = ${rr}，S = 3.14 × ${rr} × ${rr} = ${fmt(ans)}（平方厘米）。`; fig = () => <CircleFig dia lab={`d = ${dd} 厘米`} />; }
      const target = Math.round(ans * 100) / 100;
      return { prompt, mode: "pad", dot: true, answer: fmt(ans), ok: (v: string) => v !== "" && Math.abs(Number(v) - target) < 0.005, draw: fig, hintDraw: () => <CircleFig dia lab="d = 2r" note="C = πd = 2πr　S = πr²　π ≈ 3.14" />, hints: [h0, "回忆动画：圆滚一圈约是直径的 3.14 倍；切开拼成长方形，面积是 πr × r。", h2] };
    },
  },
  {
    id: "pyth", tag: "挑战关·初中预习", name: "勾股定理", color: K.yellow, dur: 9000,
    intro: "挑战关！勾股定理是初中八年级的知识，不在小学课本里。我们先来偷偷预习一下～",
    keys: ["直角三角形：a² + b² = c²（c 是斜边，直角对面的边）", "勾三股四弦五：3² + 4² = 5²", "初中八年级下册正式学习，这里只是预习"],
    caps: [[0, "直角三角形的两条直角边 a = 3、b = 4，斜边是 c。在每条边上画一个正方形。"], [0.35, "数一数小方格：a 边上 9 个，b 边上 16 个。"], [0.65, "斜边上的大正方形有几个？9 + 16 = 25 个，一个不多一个不少！"], [0.92, "这就是勾股定理：a² + b² = c²。古人叫它「勾三股四弦五」，数学家赵爽还用「弦图」证明了它。"]],
    ex: exPyth,
    gen: (d: number): Q => {
      const T: Tri3[] = d === 1 ? [[3, 4, 5], [6, 8, 10]] : [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]];
      if (d === 3 && Math.random() < 0.4) {
        const s = Math.random() < 0.5 ? pick(T) : pick<Tri3>([[4, 5, 6], [5, 6, 8], [2, 3, 4], [6, 7, 9], [5, 7, 9]]);
        const [x, y, z] = s, eq = x * x + y * y === z * z;
        return { prompt: `三条边长分别是 ${x}、${y}、${z}，能围成直角三角形吗？`, mode: "choice", options: ["能", "不能"], answer: eq ? "能" : "不能", hints: ["用勾股定理检验：两条短边的平方加起来，等不等于最长边的平方？", `先算 ${x}² + ${y}²，再算 ${z}²，比一比。`, `${x}² + ${y}² = ${x * x} + ${y * y} = ${x * x + y * y}，${z}² = ${z * z}，${eq ? "相等，所以能" : "不相等，所以不能"}。`] };
      }
      const [a, b, c] = pick(T);
      if (d >= 2 && Math.random() < 0.5) return { prompt: `直角三角形的斜边是 ${c}，一条直角边是 ${a}，另一条直角边是多少？`, mode: "pad", answer: String(b), draw: () => <RightTri a={a} b={b} la={`${a}`} lb="?" lc={`${c}`} />, hintDraw: () => <RightTri a={a} b={b} la={`${a}² = ${a * a}`} lb="b² = ?" lc={`${c}² = ${c * c}`} />, hints: ["记住咒语：a² + b² = c²，那么 b² = c² − a²。", "先算斜边的平方，再减去已知直角边的平方。", `b² = ${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}，${b} × ${b} = ${b * b}，所以 b = ${b}。`] };
      return { prompt: `直角三角形的两条直角边是 ${a} 和 ${b}，斜边是多少？`, mode: "pad", answer: String(c), draw: () => <RightTri a={a} b={b} la={`${a}`} lb={`${b}`} lc="?" />, hintDraw: () => <RightTri a={a} b={b} la={`${a}² = ${a * a}`} lb={`${b}² = ${b * b}`} lc="c² = ?" />, hints: ["记住咒语：a² + b² = c²。", "先算两个小正方形的面积，再加起来。", `c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}，${c} × ${c} = ${c * c}，所以 c = ${c}。`] };
    },
  },
];

/* ---------- curriculum map ---------- */
const DOM = ["数与代数", "图形与几何", "统计与概率", "综合与实践"];
const DOMC = [K.red, K.blue, K.green, K.orange];
const MAP: string[][][] = [
  [["10以内数的认识与加减法：加法是合起来，减法是去掉", "11–20各数的认识", "20以内进位加法、退位减法：凑十法、破十法@add", "100以内数的认识；两位数加减整十数、一位数"], ["认识立体图形：长方体、正方体、圆柱、球", "认识平面图形：长方形、正方形、三角形、圆；七巧板"], ["分类与整理：按标准分类，用简单表格记录"], ["位置：上下、前后、左右", "认识钟表：整时、半时", "认识人民币：元、角、分，简单购物", "找规律"]],
  [["100以内加减法（笔算，进位、退位）", "表内乘法：几个几相加，2–9的乘法口诀@mul", "表内除法：平均分，用口诀求商", "有余数的除法：余数比除数小", "万以内数的认识", "混合运算：先乘除后加减，有括号先算括号里"], ["长度单位：厘米和米，1米=100厘米", "角的初步认识：顶点和边，直角、锐角、钝角@angle", "观察物体：从不同方向看", "图形的运动：轴对称、平移、旋转现象"], ["数据收集整理：调查、记录、简单统计表"], ["认识时间：几时几分，1时=60分", "克和千克：1千克=1000克", "数学广角：搭配、推理"]],
  [["万以内加减法（笔算）", "多位数乘一位数、两位数乘两位数", "除数是一位数的除法", "倍的认识", "分数的初步认识：几分之一、几分之几，比大小@frac", "小数的初步认识"], ["测量：毫米、分米、千米、吨", "长方形和正方形：四边形，周长@area", "面积：平方厘米、平方分米、平方米，长方形面积=长×宽@area", "位置与方向：东、南、西、北等八个方向"], ["复式统计表"], ["时、分、秒；年、月、日；24时计时法", "数学广角：集合、搭配"]],
  [["大数的认识：亿以内和亿以上的数", "三位数乘两位数、除数是两位数的除法", "四则运算与运算定律：交换律、结合律、分配律", "小数的意义和性质；小数加减法"], ["线段、射线、直线", "角的度量：量角器，平角=180°，周角=360°", "平行与垂直；平行四边形和梯形", "三角形：分类、三边关系、内角和180°@tri", "公顷和平方千米", "轴对称与平移"], ["条形统计图；平均数"], ["数学广角：优化（沏茶、烙饼）、鸡兔同笼"]],
  [["小数乘法、小数除法；循环小数", "用字母表示数", "简易方程（2022课标调整到初中学段，部分现行教材仍保留）", "因数与倍数：2、3、5的倍数特征，质数与合数", "分数的意义和性质：约分、通分", "分数加法和减法"], ["位置：用数对表示", "多边形的面积：平行四边形、三角形、梯形、组合图形", "长方体和正方体：表面积、体积和容积", "图形的运动：旋转"], ["可能性：一定、可能、不可能", "折线统计图"], ["数学广角：植树问题、找次品"]],
  [["分数乘法、分数除法；倒数", "比：比的意义和基本性质，按比分配", "百分数：折扣、成数、税率、利率", "比例：正比例、比例尺（反比例在2022课标调整到初中学段）", "负数（2022课标调整到初中学段，部分现行教材仍保留）"], ["位置与方向：根据方向和距离确定位置", "圆：半径、直径，周长C=πd，面积S=πr²@circle", "扇形；圆柱与圆锥：表面积与体积"], ["扇形统计图"], ["数学广角：数与形、鸽巢问题", "整理和复习，小升初衔接"]],
];
const STAGE = ["第一学段（1–2年级）", "第一学段（1–2年级）", "第二学段（3–4年级）", "第二学段（3–4年级）", "第三学段（5–6年级）", "第三学段（5–6年级）"];

/* ---------- NPC ---------- */
function Npc({ text, mood, n }: { text: string; mood: Mood; n: number }) {
  const au = useAudioState();
  const th = useGrokTheme();
  const [blink, setBlink] = useState(false);
  const [hop, setHop] = useState(false);
  useEffect(() => { const id = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 160); }, 3200); return () => clearInterval(id); }, []);
  useEffect(() => { setHop(true); const id = setTimeout(() => setHop(false), 260); return () => clearTimeout(id); }, [n]);
  const mouth = mood === "cheer" ? <path d="M38 68Q50 88 62 68Z" fill="#C2255C" /> : mood === "think" ? <circle cx={52} cy={72} r={4} fill="#5C3B00" /> : mood === "encourage" ? <path d="M42 71Q50 77 58 71" stroke="#5C3B00" strokeWidth={3} fill="none" strokeLinecap="round" /> : <path d="M39 68Q50 80 61 68" stroke="#5C3B00" strokeWidth={3} fill="none" strokeLinecap="round" />;
  const look = mood === "think" ? -3 : 0;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ width: 76, flex: "0 0 76px", textAlign: "center", transform: hop ? "translateY(-7px)" : "none", transition: "transform .25s" }}>
        <svg viewBox="0 0 100 112" width="76" height="85">
          <line x1={50} y1={20} x2={50} y2={6} stroke={K.orange} strokeWidth={3} />
          <polygon points="50,0 53,6 59,6 54,10 56,16 50,12 44,16 46,10 41,6 47,6" fill={K.yellow} stroke={K.orange} />
          {mood === "cheer" && <g stroke={K.orange} strokeWidth={5} strokeLinecap="round"><line x1={14} y1={58} x2={2} y2={40} /><line x1={86} y1={58} x2={98} y2={40} /></g>}
          <ellipse cx={50} cy={62} rx={40} ry={40} fill={K.yellow} stroke={K.orange} strokeWidth={5} />
          <ellipse cx={37} cy={52} rx={8} ry={blink ? 1 : 9} fill="#fff" />
          <ellipse cx={63} cy={52} rx={8} ry={blink ? 1 : 9} fill="#fff" />
          {!blink && <g fill="#222"><circle cx={38} cy={53 + look} r={4} /><circle cx={64} cy={53 + look} r={4} /></g>}
          <circle cx={26} cy={66} r={5} fill={K.pink} opacity={0.6} /><circle cx={74} cy={66} r={5} fill={K.pink} opacity={0.6} />
          {mouth}
          <text x={50} y={96} textAnchor="middle" fontSize={16} fontWeight={700} fill={K.orange}>π</text>
        </svg>
        <div style={{ fontSize: 12, color: th.text.secondary, fontWeight: 600 }}>小派</div>
      </div>
      <div style={{ flex: "1 1 150px", minWidth: 0, background: th.bg.elevated, border: `1.5px solid ${th.border.default}`, borderRadius: 16, padding: "10px 14px", fontSize: 15, lineHeight: 1.65, color: th.text.primary }}>{text}<button onClick={() => (au.speaker === "npc" ? AU.stop() : AU.speakText(text, "pai", "npc"))} aria-label="小派读给我听" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, marginLeft: 6, verticalAlign: "middle" }}>{au.speaker === "npc" ? "⏹" : "🔊"}</button></div>
    </div>
  );
}
function Star({ on }: { on: boolean }) {
  const th = useGrokTheme();
  return <svg viewBox="0 0 24 24" width="18" height="18"><polygon points="12,2 15,9 22,9.3 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.3 9,9" fill={on ? K.yellow : "none"} stroke={on ? K.orange : th.border.strong} strokeWidth={1.5} /></svg>;
}
function Explainer({ lv, k }: { lv: Level; k: number }) {
  const th = useGrokTheme();
  const au = useAudioState();
  const [t, setT] = useState(0);
  const [man, setMan] = useState<number | null>(null);
  const [talking, setTalking] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    let cancelled = false, raf = 0;
    setMan(null); setT(0); setTalking(false);
    const caps = lv.caps;
    const ends = caps.map((_, i) => (i + 1 < caps.length ? caps[i + 1][0] : 1));
    const silent = (from: number) => {
      setTalking(false);
      const st = performance.now() - from * lv.dur;
      const step = (now: number) => { if (cancelled) return; const p = Math.min(1, (now - st) / lv.dur); setT(p); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const playSeg = async (i: number) => {
      if (cancelled) return;
      if (i >= caps.length) { setT(1); setTalking(false); return; }
      setT(caps[i][0]);
      const tok = await AU.play(AU.narrUrl(`${lv.id}_${i}`), "teacher", () => { if (cancelled) return; setT(ends[i]); setTalking(false); setTimeout(() => playSeg(i + 1), 300); });
      if (cancelled) return;
      if (!tok) { silent(caps[i][0]); return; }
      setTalking(true);
      const tick = () => {
        if (cancelled || AU.current() !== tok) return;
        const a = AU.player, d = a.duration;
        if (d && isFinite(d)) setT(lerp(caps[i][0], ends[i], Math.min(1, a.currentTime / d)));
        if (!a.ended) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (AU.getVoiceOn()) playSeg(0); else silent(0);
    return () => { cancelled = true; cancelAnimationFrame(raf); if (AU.currentSpeaker() === "teacher") AU.stop(); };
  }, [k, lv.id, run, au.engine]);
  const tt = man ?? t;
  const cap = lv.caps.filter((c) => c[0] <= tt + 1e-6).pop();
  const speaking = talking && au.speaker === "teacher";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Teacher talking={speaking} text={cap ? cap[1] : ""} />
      {lv.ex(tt, th)}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: th.text.tertiary }}>
        <button onClick={() => { if (!au.voiceOn) AU.setVoiceOn(true); setRun((r) => r + 1); }} style={{ border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "#2FB344", color: "#fff" }}>{speaking ? "🔁 从头讲" : "▶ 老师讲解"}</button>
        {speaking && <button onClick={() => { AU.stop(); setTalking(false); }} style={{ border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: th.fill.secondary, color: th.text.primary }}>⏸ 暂停</button>}
        <span>拖动看慢动作</span>
        <input type="range" min={0} max={100} value={Math.round(tt * 100)} onChange={(e: ChangeEvent<HTMLInputElement>) => { AU.stop(); setTalking(false); setMan(Number(e.target.value) / 100); }} style={{ flex: "1 1 140px", accentColor: lv.color }} />
      </div>
    </div>
  );
}

interface P { streak: number; best: number; right: number; wrong: number; d: number; slump: number; mastered: boolean }
const P0: P = { streak: 0, best: 0, right: 0, wrong: 0, d: 1, slump: 0, mastered: false };
const starsOf = (p: P): number => (p.mastered ? 3 : p.best >= 3 ? 2 : p.best >= 1 ? 1 : 0);
const PRAISE = ["答对啦！你真棒！", "太聪明了！", "完全正确，继续保持！", "哇，又对了！", "漂亮！小派为你鼓掌！", "想得真清楚！"];

export default function App() {
  const th = useGrokTheme();
  const [view, setView] = useState<"home" | "map" | "level" | "comp" | "wardrobe" | "shop" | "ach">("home");
  const save = useSave();
  const [cur, setCur] = useState(0);
  const [tab, setTab] = useState<"learn" | "play">("learn");
  const [prog, setProg] = useState<Record<string, P>>(() => (RW.get().prog as Record<string, P>) ?? {});
  useEffect(() => { RW.setProg(prog); }, [prog]);
  useEffect(() => { RW.dailyCheck(); }, []);
  const [npc, setNpc] = useState<{ text: string; mood: Mood; n: number }>({ text: "你好呀，我是小派！欢迎来到数学探险岛。每一关先看动画讲解，再玩小游戏；连续答对 5 题就算掌握这个概念。做错了也没关系，小派会一步一步提示你！", mood: "happy", n: 0 });
  const [q, setQ] = useState<Q | null>(null);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [okLast, setOkLast] = useState(false);
  const [chosen, setChosen] = useState("");
  const [pad, setPad] = useState("");
  const [ang, setAng] = useState(30);
  const [shade, setShade] = useState<boolean[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [review, setReview] = useState(false);
  const [exKey, setExKey] = useState(0);
  const [mapG, setMapG] = useState(0);

  const say = (text: string, mood: Mood) => setNpc((o) => ({ text, mood, n: o.n + 1 }));
  const pOf = (id: string): P => prog[id] ?? P0;
  const lv = LV[cur];
  const total = LV.reduce((s, l) => s + starsOf(pOf(l.id)), 0);
  const recIdx = LV.findIndex((l) => !pOf(l.id).mastered);
  const nextRec = (i: number, pr: Record<string, P>): number => { for (let k = 1; k <= LV.length; k++) { const j = (i + k) % LV.length; if (!(pr[LV[j].id] ?? P0).mastered) return j; } return -1; };

  const fresh = (i: number, d: number) => {
    const L = LV[i];
    let nq = L.gen(d);
    for (let k = 0; k < 6 && q && (nq.sig ?? nq.prompt) === (q.sig ?? q.prompt); k++) nq = L.gen(d);
    setQ(nq); setTries(0); setDone(false); setOkLast(false); setChosen(""); setPad("");
    setAng(Math.random() < 0.5 ? rnd(10, 50) : rnd(130, 170));
    setShade(Array.from({ length: nq.parts ?? 0 }, () => false)); setShowHint(false);
  };
  const enter = (i: number) => { AU.stop(); setCur(i); setView("level"); setTab("learn"); setExKey((k) => k + 1); setReview(false); setQ(null); say(LV[i].intro, "happy"); };
  const play = () => {
    setTab("play");
    const p = pOf(lv.id);
    if (!q) fresh(cur, p.d);
    say(p.mastered ? "你已经掌握这一关啦，再练练巩固一下吧！" : `挑战开始！连续答对 ${MASTER} 题就算掌握。遇到困难别怕，小派会给你提示～`, "happy");
  };
  const replay = () => { setTab("learn"); setExKey((k) => k + 1); say("我们再看一遍动画。看懂了就回来挑战，小派等你！", "encourage"); };
  const next = () => { fresh(cur, pOf(lv.id).d); say(pick(["下一题来啦！", "继续加油！", "这题你一定行！", "仔细看题哦～"]), "happy"); };

  const submit = (v: string) => {
    if (!q || done) return;
    const p = pOf(lv.id);
    const good = q.ok ? q.ok(v) : q.mode === "pad" ? v !== "" && Math.abs(Number(v) - Number(q.answer)) < 1e-6 : v === q.answer;
    setChosen(v);
    if (good) {
      const first = tries === 0, streak = first ? p.streak + 1 : 0;
      let dd = p.d, mood: Mood = "happy";
      let msg = first ? pick(PRAISE) : "改正后做对啦！知错就改，真了不起！";
      const newly = !p.mastered && streak >= MASTER;
      if (first && streak % 3 === 0 && dd < 3) { dd++; msg = `连续答对 ${streak} 题！小派给你升到难度 ${dd}，准备好了吗？`; mood = "cheer"; }
      else if (first && streak >= 2 && !p.mastered && !newly) msg += ` 已经连对 ${streak} 题，再对 ${MASTER - streak} 题就掌握啦！`;
      const np: P = { ...p, streak, best: Math.max(p.best, streak), right: p.right + 1, d: dd, slump: 0, mastered: p.mastered || newly };
      const pr = { ...prog, [lv.id]: np };
      if (newly) { const nx = nextRec(cur, pr); msg = `太棒了！你已经掌握了「${lv.name}」，获得 3 颗星！` + (nx >= 0 ? `下一站推荐：「${LV[nx].name}」，点下面的按钮出发吧！` : "所有关卡都通关啦，你是数学小达人！"); mood = "cheer"; }
      setProg(pr); setDone(true); setOkLast(true); say(msg, mood);
      RW.onLevelAnswer(true, first);
      if (newly) RW.onMastery(lv.id);
      return;
    }
    RW.onLevelAnswer(false, false);
    const nt = tries + 1;
    let dd = p.d, slump = p.slump, extra = "";
    if (nt === 1) {
      slump++;
      if (slump >= 2) { setReview(true); if (dd > 1) { dd--; extra = " 这几题有点难，小派把难度调低一点。也可以再看一遍动画哦。"; } else extra = " 要不要再看一遍动画讲解？"; slump = 0; }
    }
    setProg({ ...prog, [lv.id]: { ...p, streak: 0, wrong: p.wrong + 1, d: dd, slump } });
    setTries(nt); setPad("");
    if (nt === 1) say("没关系，再想一想～ " + q.hints[0] + extra, "think");
    else if (nt === 2) { setShowHint(true); say("看看小派画的提示：" + q.hints[1] + extra, "think"); }
    else { setDone(true); setOkLast(false); setShowHint(true); say("我们一起一步一步来：" + q.hints[2] + " 正确答案是：" + q.answer + "。下一题你一定行！", "encourage"); }
  };

  useEffect(() => {
    if (view !== "level" || tab !== "play" || !q || q.mode !== "pad" || done) return;
    const h = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) setPad((s) => (s.length < 6 ? s + e.key : s));
      else if (e.key === "." && q.dot) setPad((s) => (s.includes(".") ? s : s + "."));
      else if (e.key === "Backspace") setPad((s) => s.slice(0, -1));
      else if (e.key === "Enter") submit(pad);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const btn = (kind: "pri" | "sec" = "sec", extra?: CSSProperties): CSSProperties => ({ border: "none", borderRadius: 999, padding: "9px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: kind === "pri" ? th.fill.primary : th.fill.secondary, color: kind === "pri" ? th.text.onPrimary : th.text.primary, ...extra });
  const card: CSSProperties = { background: th.bg.subtle, border: `1px solid ${th.border.default}`, borderRadius: 16, padding: 14 };
  const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" };
  const bar = (pct: number, col: string) => <div style={{ height: 8, borderRadius: 4, background: th.fill.secondary, overflow: "hidden", flex: "1 1 80px" }}><div style={{ width: `${pct}%`, height: "100%", background: col, transition: "width .4s" }} /></div>;

  const p = pOf(lv.id);
  const mastery = p.mastered ? 100 : (p.streak / MASTER) * 100;
  const nxt = nextRec(cur, prog);

  const chatCtx = view === "level"
    ? `孩子正在学习：${lv.tag}「${lv.name}」。本关要点：${lv.keys.join("；")}。` + (tab === "play" && q ? `孩子正在做的题目：「${q.prompt}」。解题思路提示（不要直接说出最终答案）：${q.hints[0]} ${q.hints[1]}` : "孩子正在看动画讲解。")
    : view === "comp" ? "孩子在「竞赛挑战」区做小学奥数题（找规律、鸡兔同笼、植树、行程等），请引导思路，不要直接给答案。" : view === "map" ? "孩子正在浏览小学1-6年级数学概念地图。" : "孩子在闯关首页，还没选关卡。";
  let body: ReactNode = null;
  if (view === "home") {
    body = (
      <div style={{ display: "grid", gap: 14 }}>
        {svg("0 0 360 70", <g><circle cx={320} cy={22} r={14} fill={K.yellow} /><path d="M60 58Q120 18 200 58Z" fill={K.green} opacity={0.85} /><path d="M120 40 L124 18" stroke="#8B5A2B" strokeWidth={3} /><path d="M124 18q-14 -2 -20 8M124 18q12 -4 20 6M124 18q-4 -10 -14 -12" stroke={K.green} strokeWidth={3} fill="none" /><path d="M0 62q15-8 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0" stroke={K.teal} strokeWidth={3} fill="none" /></g>, 600)}
        {recIdx >= 0 && <div style={row}><span style={{ color: th.text.secondary, fontSize: 14 }}>小派推荐：</span><button style={btn("pri")} onClick={() => enter(recIdx)}>{`出发去「${LV[recIdx].name}」 →`}</button></div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {LV.map((l, i) => {
            const pp = pOf(l.id);
            return (
              <button key={l.id} onClick={() => enter(i)} style={{ ...card, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: th.text.primary, borderTop: `6px solid ${l.color}`, display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: th.text.secondary }}>{`第 ${i + 1} 关 · ${l.tag}`}</span>
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{l.name}</span>
                <span style={{ display: "flex", gap: 2 }}>{[0, 1, 2].map((s) => <Star key={s} on={s < starsOf(pp)} />)}</span>
                <span style={{ fontSize: 12, color: pp.mastered ? th.text.success : th.text.tertiary }}>{pp.mastered ? "已掌握" : pp.right + pp.wrong > 0 ? `答对 ${pp.right} 题` : "未开始"}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (view === "map") {
    const items = mapG < 6 ? MAP[mapG] : [];
    body = (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, color: th.text.secondary, lineHeight: 1.6 }}>依据《义务教育数学课程标准（2022年版）》的四个学习领域整理，单元参考人教版教材；不同版本、不同年份教材的单元顺序略有差异。带「去闯关」的概念在岛上有游戏。</div>
        <div style={row}>
          {["1年级", "2年级", "3年级", "4年级", "5年级", "6年级", "挑战·初中预习"].map((g, i) => <button key={g} onClick={() => setMapG(i)} style={btn(mapG === i ? "pri" : "sec", { padding: "7px 13px", fontSize: 14 })}>{g}</button>)}
        </div>
        {mapG < 6 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, color: th.text.tertiary }}>{STAGE[mapG]}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
              {items.map((list, di) => (
                <div key={di} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 8 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: DOMC[di], display: "inline-block" }} />{DOM[di]}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {list.map((it) => {
                      const [txt, link] = it.split("@");
                      const li = link ? LV.findIndex((l) => l.id === link) : -1;
                      return (
                        <div key={it} style={{ fontSize: 14, lineHeight: 1.55, color: th.text.primary, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <span style={{ flex: "1 1 160px" }}>{"· " + txt}</span>
                          {li >= 0 && <button onClick={() => enter(li)} style={btn("sec", { padding: "4px 10px", fontSize: 12, background: th.fill.accentSubtle, color: th.text.accent })}>去闯关</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...card, display: "grid", gap: 8, lineHeight: 1.6, fontSize: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>勾股定理 —— 不是小学内容</div>
            <div>勾股定理在人教版八年级下册（初中二年级）才正式学习：直角三角形两条直角边的平方和等于斜边的平方，a² + b² = c²。</div>
            <div>它用到的基础是小学学过的「直角」「正方形面积」和「乘方的初步感受」，所以在岛上作为「挑战关·初中预习」，学有余力的小朋友可以先玩一玩。</div>
            <div><button onClick={() => enter(LV.length - 1)} style={btn("pri")}>去挑战关 →</button></div>
          </div>
        )}
      </div>
    );
  } else if (view === "comp") {
    body = <Competition say={say} />;
  } else if (view === "wardrobe") {
    body = <Wardrobe />;
  } else if (view === "shop") {
    body = <Shop />;
  } else if (view === "ach") {
    body = <Achievements />;
  } else {
    const allowDot = !!q?.dot;
    const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", allowDot ? "." : "清空", "0", "⌫"];
    const tapKey = (k: string) => { if (done) return; if (k === "⌫") setPad((s) => s.slice(0, -1)); else if (k === "清空") setPad(""); else if (k === ".") setPad((s) => (s.includes(".") ? s : s + ".")); else setPad((s) => (s.length < 6 ? s + k : s)); };
    body = (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={row}>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: l2(lv.color), color: th.text.primary, fontWeight: 600 }}>{lv.tag}</span>
          <span style={{ fontSize: 19, fontWeight: 700 }}>{lv.name}</span>
          <span style={{ display: "flex", gap: 2 }}>{[0, 1, 2].map((s) => <Star key={s} on={s < starsOf(p)} />)}</span>
        </div>
        <div style={{ ...row, fontSize: 13, color: th.text.secondary }}>
          <span>{`掌握度 ${p.mastered ? MASTER : p.streak}/${MASTER}`}</span>{bar(mastery, K.green)}
          <span>{`难度 ${"●".repeat(p.d)}${"○".repeat(3 - p.d)}`}</span>
        </div>
        <div style={row}>
          <button style={btn(tab === "learn" ? "pri" : "sec")} onClick={() => { setTab("learn"); }}>① 动画讲解</button>
          <button style={btn(tab === "play" ? "pri" : "sec")} onClick={play}>② 闯关游戏</button>
        </div>
        {tab === "learn" ? (
          <div style={{ ...card, display: "grid", gap: 12 }}>
            <Explainer lv={lv} k={exKey} />
            <div style={row}><button style={btn("sec")} onClick={() => setExKey((k) => k + 1)}>重播动画</button><button style={btn("pri")} onClick={play}>我看懂了，开始挑战 →</button></div>
            <div style={{ borderTop: `1px solid ${th.border.subtle}`, paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontWeight: 700 }}>要记住</span><button onClick={() => AU.play(AU.narrUrl(`${lv.id}_keys`), "keys")} style={btn("sec", { padding: "5px 12px", fontSize: 13 })}>🔊 听王老师总结</button></div>
              {lv.keys.map((k) => <div key={k} style={{ fontSize: 14, lineHeight: 1.7, color: th.text.primary }}>{"· " + k}</div>)}
            </div>
          </div>
        ) : q && (
          <div style={{ ...card, display: "grid", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5 }}>{q.prompt}</div>
            {q.draw && q.draw()}
            {q.mode === "choice" && (
              <div style={row}>
                {(q.options ?? []).map((o) => {
                  const isAns = done && o === q.answer, isBad = !isAns && o === chosen && (tries > 0 || done);
                  return <button key={o} onClick={() => submit(o)} style={btn("sec", { fontSize: 18, minWidth: 72, padding: "10px 18px", background: isAns ? K.green : isBad ? th.fill.dangerSubtle : th.fill.secondary, color: isAns ? "#fff" : th.text.primary })}>{o}</button>;
                })}
              </div>
            )}
            {q.mode === "pad" && (
              <div style={{ display: "grid", gap: 8, maxWidth: 300 }}>
                <div style={{ border: `2px solid ${done ? (okLast ? K.green : th.border.strong) : lv.color}`, borderRadius: 12, padding: "8px 14px", fontSize: 26, fontWeight: 700, minHeight: 44, color: th.text.primary }}>{done ? (okLast ? chosen : q.answer) : pad || " "}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {keys.map((k) => <button key={k} onClick={() => tapKey(k)} style={btn("sec", { borderRadius: 12, fontSize: 20, padding: "10px 0" })}>{k}</button>)}
                </div>
                <button onClick={() => submit(pad)} disabled={done || pad === ""} style={btn("pri", { borderRadius: 12, opacity: done || pad === "" ? 0.5 : 1 })}>确定</button>
              </div>
            )}
            {q.mode === "angle" && (
              <div style={{ display: "grid", gap: 8 }}>
                <AngleFig deg={ang} proto showDeg={!!q.showDeg} />
                <input type="range" min={0} max={180} value={ang} disabled={done} onChange={(e: ChangeEvent<HTMLInputElement>) => setAng(Number(e.target.value))} style={{ width: "100%", accentColor: lv.color }} />
                <div style={row}><button style={btn("pri")} disabled={done} onClick={() => submit(String(ang))}>确定</button></div>
              </div>
            )}
            {q.mode === "shade" && (
              <div style={{ display: "grid", gap: 8 }}>
                <Pizza n={q.parts ?? 2} on={shade} tap={(i: number) => { if (!done) setShade((s) => s.map((x, j) => (j === i ? !x : x))); }} />
                <div style={{ ...row, justifyContent: "center" }}><span style={{ fontSize: 14, color: th.text.secondary }}>{`已涂 ${shade.filter(Boolean).length} 块`}</span><button style={btn("pri")} disabled={done} onClick={() => submit(String(shade.filter(Boolean).length))}>确定</button></div>
              </div>
            )}
            {showHint && q.hintDraw && (
              <div style={{ border: `1.5px dashed ${th.border.strong}`, borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, color: th.text.secondary, marginBottom: 6 }}>小派的提示图</div>
                {q.hintDraw()}
              </div>
            )}
            <div style={row}>
              {done && <button style={btn("pri")} onClick={next}>下一题 →</button>}
              {done && p.mastered && nxt >= 0 && <button style={btn("sec")} onClick={() => enter(nxt)}>{`去下一关「${LV[nxt].name}」`}</button>}
              {(review || tries >= 2) && <button style={btn("sec")} onClick={replay}>再看一遍动画</button>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: th.font.family, color: th.text.primary, background: th.bg.base, padding: "14px 12px 96px", maxWidth: 860, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>数学探险岛</div>
          <div style={{ fontSize: 13, color: th.text.secondary }}>小学 1–6 年级数学概念 · 动画讲解 · 闯关游戏</div>
        </div>
        <div style={{ ...row, fontSize: 15, fontWeight: 700 }}><Star on />{`× ${total}`}</div>
      </div>
      <div style={row}>
        <button style={btn(view === "home" ? "pri" : "sec")} onClick={() => { setView("home"); say(recIdx >= 0 ? `欢迎回来！你已经收集了 ${total} 颗星。小派建议下一站去「${LV[recIdx].name}」～` : "你已经掌握了全部关卡，太了不起了！可以去概念地图看看还有哪些知识。", "happy"); }}>闯关地图</button>
        <button style={btn(view === "map" ? "pri" : "sec")} onClick={() => { setView("map"); say("这是小学六年要学的数学概念地图，按年级和四大领域排好啦。点「去闯关」就能直接玩！", "happy"); }}>概念地图</button>
        <button style={btn(view === "comp" ? "pri" : "sec", view === "comp" ? {} : { background: "#ffe8cc" })} onClick={() => { AU.stop(); setView("comp"); say("欢迎来到竞赛挑战！这里是仿小学数学竞赛题型的原创题，一次答对奖励最多哦～", "cheer"); }}>🏆 竞赛挑战</button>
        <button style={btn(view === "wardrobe" ? "pri" : "sec")} onClick={() => { setView("wardrobe"); say("这是你的衣橱，点一点就能换装！", "happy"); }}>👕 我的形象</button>
        <button style={btn(view === "shop" ? "pri" : "sec")} onClick={() => { setView("shop"); say("商店里有好多新形象，用金币兑换吧！", "happy"); }}>🛍️ 商店</button>
        <button style={btn(view === "ach" ? "pri" : "sec")} onClick={() => { setView("ach"); say("看看你的成就徽章，还有宝箱等你打开！", "happy"); }}>🎁 成就宝箱</button>
      </div>
      <style>{GLOBAL_CSS}</style>
      <Toasts />
      <StatusBar onOpen={(v) => setView(v as "wardrobe" | "ach")} />
      <VoiceBar />
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}><Npc text={npc.text} mood={npc.mood} n={npc.n} /></div>
        <button onClick={() => setView("wardrobe")} aria-label="我的形象" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "center" }}><AvatarHead equip={save.equip} size={64} /><div style={{ fontSize: 12, color: th.text.secondary, fontWeight: 600 }}>我</div></button>
      </div>
      {body}
      <PaiChat levelName={view === "level" ? lv.name : "数学探险岛"} context={chatCtx} />
    </div>
  );
}
function l2(hex: string): string { return hex + "40"; }

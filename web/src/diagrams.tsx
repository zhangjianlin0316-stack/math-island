import type { ReactNode } from "react";
const C = { red: "#FF6B6B", orange: "#FF9F43", yellow: "#FFD43B", green: "#2FB344", teal: "#15AABF", blue: "#4C8DFF", purple: "#8C6CF2", ink: "#1f2430", soft: "#c9bfa9" };
const box = (vb: string, kids: ReactNode, max = 420) => <svg viewBox={vb} width="100%" style={{ maxWidth: max, display: "block", margin: "0 auto" }}>{kids}</svg>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Diagram({ dg }: { dg: any }) {
  if (!dg) return null;
  switch (dg.k) {
    case "seq": return box(`0 0 ${dg.items.length * 36 + 10} 46`, <g>{dg.items.map((s: string, i: number) => <text key={i} x={22 + i * 36} y={32} textAnchor="middle" fontSize={26} fill={[C.red, C.blue, C.green][i % 3]}>{s}</text>)}</g>, 360);
    case "fan": {
      const n = dg.n, A = { x: 160, y: 18 }, xs = Array.from({ length: n }, (_, i) => 30 + (i * 260) / (n - 1));
      return box("0 0 320 160", <g>{xs.map((x, i) => <line key={i} x1={A.x} y1={A.y} x2={x} y2={140} stroke={C.ink} strokeWidth={2} />)}<line x1={30} y1={140} x2={290} y2={140} stroke={C.ink} strokeWidth={2.5} />{xs.map((x, i) => <circle key={"p" + i} cx={x} cy={140} r={4.5} fill={C.red} />)}<circle cx={A.x} cy={A.y} r={4.5} fill={C.red} /></g>, 340);
    }
    case "dots": { const n = dg.n; return box("0 0 320 50", <g><line x1={20} y1={25} x2={300} y2={25} stroke={C.ink} strokeWidth={2.5} />{Array.from({ length: n }, (_, i) => <g key={i}><circle cx={20 + (i * 280) / (n - 1)} cy={25} r={5} fill={C.red} /><text x={20 + (i * 280) / (n - 1)} y={46} textAnchor="middle" fontSize={11} fill={C.ink}>{String.fromCharCode(65 + i)}</text></g>)}</g>, 340); }
    case "grid": {
      const { r, c } = dg, s = Math.min(240 / c, 150 / r), ox = (300 - c * s) / 2, oy = 8, L: ReactNode[] = [];
      for (let i = 0; i <= r; i++) L.push(<line key={"h" + i} x1={ox} y1={oy + i * s} x2={ox + c * s} y2={oy + i * s} stroke={C.ink} strokeWidth={2} />);
      for (let j = 0; j <= c; j++) L.push(<line key={"v" + j} x1={ox + j * s} y1={oy} x2={ox + j * s} y2={oy + r * s} stroke={C.ink} strokeWidth={2} />);
      return box(`0 0 300 ${r * s + 16}`, <g><rect x={ox} y={oy} width={c * s} height={r * s} fill={C.blue} fillOpacity={0.12} />{L}</g>, 300);
    }
    case "trees": {
      const { len, gap, ends } = dg, n = len / gap, W = 300, s = (W - 40) / len, T: ReactNode[] = [];
      for (let i = 0; i <= n; i++) { if ((i === 0 || i === n) && ends === 0) continue; const x = 20 + i * gap * s; T.push(<g key={i}><rect x={x - 2} y={30} width={4} height={14} fill="#8B5A2B" /><circle cx={x} cy={24} r={10} fill={C.green} /></g>); }
      return box("0 0 300 80", <g><rect x={20} y={44} width={W - 40} height={8} rx={4} fill="#e9d8b4" />{T}<text x={150} y={72} textAnchor="middle" fontSize={12} fill={C.ink}>{`全长 ${len} 米，每隔 ${gap} 米${ends === 0 ? "（两端不放）" : ""}`}</text></g>, 360);
    }
    case "ring": { const n = dg.n; return box("0 0 200 200", <g><circle cx={100} cy={100} r={70} fill="#ffe8cc" stroke={C.orange} strokeWidth={3} />{Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return <circle key={i} cx={100 + 70 * Math.cos(a)} cy={100 + 70 * Math.sin(a)} r={7} fill={C.red} />; })}<text x={100} y={105} textAnchor="middle" fontSize={13} fill={C.ink}>周长 60 米</text></g>, 220); }
    case "cage": return box("0 0 320 120", <g><rect x={10} y={10} width={300} height={100} rx={14} fill="#fff4d6" stroke="#c9a14a" strokeWidth={3} />{Array.from({ length: 9 }, (_, i) => <line key={i} x1={40 + i * 30} y1={10} x2={40 + i * 30} y2={110} stroke="#c9a14a" strokeWidth={2} />)}<text x={160} y={56} textAnchor="middle" fontSize={34}>🐔🐰</text><text x={160} y={94} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>{`${dg.heads} 个头，${dg.legs} 只脚`}</text></g>, 340);
    case "bars": {
      const u = 50, row = (y: number, k: number, lab: string, col: string) => <g><text x={20} y={y + 18} fontSize={14} fontWeight={700} fill={C.ink}>{lab}</text>{Array.from({ length: k }, (_, i) => <rect key={i} x={50 + i * u} y={y} width={u} height={26} fill={col} fillOpacity={0.6} stroke={C.ink} />)}</g>;
      return box(`0 0 ${70 + Math.max(dg.a, dg.b) * u} 100`, <g>{row(8, dg.a, dg.la, C.orange)}{row(50, dg.b, dg.lb, C.blue)}<text x={50} y={96} fontSize={13} fill={C.ink}>{`线段图：每格是 1 份　${dg.note}`}</text></g>, 360);
    }
    case "meet": case "chase": {
      const meet = dg.k === "meet";
      return box("0 0 320 90", <g><line x1={20} y1={50} x2={300} y2={50} stroke={C.ink} strokeWidth={3} /><circle cx={20} cy={50} r={5} fill={C.ink} /><circle cx={300} cy={50} r={5} fill={C.ink} />
        <text x={30} y={34} fontSize={24}>🚗</text><text x={meet ? 260 : 120} y={34} fontSize={24}>{meet ? "🚙" : "🚶"}</text>
        <path d={meet ? "M70 26 l30 0 m-8 -6 l8 6 l-8 6" : "M64 26 l30 0 m-8 -6 l8 6 l-8 6"} stroke={C.red} strokeWidth={2.5} fill="none" />
        {meet ? <path d="M250 26 l-30 0 m8 -6 l-8 6 l8 6" stroke={C.blue} strokeWidth={2.5} fill="none" /> : <path d="M154 26 l30 0 m-8 -6 l8 6 l-8 6" stroke={C.blue} strokeWidth={2.5} fill="none" />}
        <text x={160} y={76} textAnchor="middle" fontSize={13} fill={C.ink}>{meet ? `相距 ${dg.d}，速度 ${dg.va} 和 ${dg.vb}` : `先走 ${dg.d}，速度 ${dg.va} 追 ${dg.vb}`}</text></g>, 360);
    }
    case "recttri": return box("0 0 300 170", <g><rect x={40} y={20} width={220} height={120} fill="none" stroke={C.ink} strokeWidth={2.5} /><polygon points="40,140 260,140 170,20" fill={C.purple} fillOpacity={0.35} stroke={C.purple} strokeWidth={2} /><line x1={170} y1={20} x2={170} y2={140} stroke={C.ink} strokeDasharray="5 4" /><text x={150} y={160} textAnchor="middle" fontSize={13} fill={C.ink}>长 10 厘米</text><text x={30} y={84} textAnchor="end" fontSize={13} fill={C.ink}>宽 6</text></g>, 320);
    case "sqmid": return box("0 0 220 220", <g><rect x={20} y={20} width={180} height={180} fill="#fff" stroke={C.ink} strokeWidth={2.5} /><polygon points="110,20 200,110 110,200 20,110" fill={C.teal} fillOpacity={0.4} stroke={C.teal} strokeWidth={2.5} />{[[110, 20], [200, 110], [110, 200], [20, 110]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill={C.red} />)}<text x={110} y={215} textAnchor="middle" fontSize={12} fill={C.ink}>边长 10 厘米</text></g>, 240);
    case "sqcircle": return box("0 0 220 220", <g><rect x={20} y={20} width={180} height={180} fill={C.orange} fillOpacity={0.45} stroke={C.ink} strokeWidth={2.5} /><circle cx={110} cy={110} r={90} fill="#fff" stroke={C.ink} strokeWidth={2.5} /><line x1={110} y1={110} x2={200} y2={110} stroke={C.red} strokeWidth={2} /><text x={155} y={104} textAnchor="middle" fontSize={12} fill={C.ink}>r = 5</text><text x={110} y={215} textAnchor="middle" fontSize={12} fill={C.ink}>边长 10 厘米</text></g>, 240);
  }
  return null;
}

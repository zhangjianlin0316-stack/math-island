// 奖励系统：金币、经验/等级/称号、每日签到、成就、宝箱、形象皮肤。全部保存在 localStorage。
export type Rarity = "普通" | "稀有" | "史诗" | "传说";
export type Slot = "char" | "bg" | "pet" | "frame";
export interface Item { id: string; slot: Slot; name: string; rarity: Rarity; price?: number; unlock?: string; desc: string }
export const RARITY_COLOR: Record<Rarity, string> = { 普通: "#8a91a0", 稀有: "#4C8DFF", 史诗: "#8C6CF2", 传说: "#FF9F43" };
export const RARITY_W: Record<Rarity, number> = { 普通: 50, 稀有: 30, 史诗: 15, 传说: 5 };

export const ITEMS: Item[] = [
  { id: "char_base", slot: "char", name: "小探险家", rarity: "普通", desc: "初始形象，白 T 恤上印着小小的 π。" },
  { id: "char_uniform", slot: "char", name: "红领巾校服", rarity: "普通", price: 100, desc: "整整齐齐去上学！" },
  { id: "char_sport", slot: "char", name: "活力运动装", rarity: "普通", price: 150, desc: "带上足球，动起来！" },
  { id: "char_scientist", slot: "char", name: "小小科学家", rarity: "稀有", price: 400, desc: "护目镜 + 发光烧瓶。" },
  { id: "char_astronaut", slot: "char", name: "星际宇航员", rarity: "稀有", price: 600, unlock: "master4", desc: "掌握 4 个关卡自动解锁，或用金币购买。" },
  { id: "char_hanfu", slot: "char", name: "汉服小书生", rarity: "史诗", price: 1200, unlock: "comp20", desc: "竹简 + 算盘。解出 20 道竞赛题解锁，或用金币购买。" },
  { id: "char_wizard", slot: "char", name: "数字魔法师", rarity: "史诗", price: 1500, desc: "挥动铅笔魔杖，数字在身边飞舞。" },
  { id: "char_mech", slot: "char", name: "π 能量机甲", rarity: "传说", unlock: "compHigh10", desc: "解出 10 道高年级竞赛题解锁（宝箱也可能开出）。" },
  { id: "char_king", slot: "char", name: "星辰数学王", rarity: "传说", unlock: "king", desc: "8 关全部掌握并解出 30 道竞赛题解锁（宝箱也可能开出）。" },
  { id: "bg_none", slot: "bg", name: "暖阳纯色", rarity: "普通", desc: "默认背景。" },
  { id: "bg_classroom", slot: "bg", name: "阳光教室", rarity: "普通", price: 80, desc: "黑板上画着三角形、圆和正方形。" },
  { id: "bg_forest", slot: "bg", name: "几何森林", rarity: "稀有", price: 300, desc: "三角形的树叶，漂浮的宝石。" },
  { id: "bg_space", slot: "bg", name: "太空站", rarity: "史诗", price: 800, desc: "窗外是带光环的星球。" },
  { id: "bg_castle", slot: "bg", name: "云上星辰城堡", rarity: "传说", unlock: "streak7", desc: "连续签到 7 天解锁（宝箱也可能开出）。" },
  { id: "pet_none", slot: "pet", name: "不带宠物", rarity: "普通", desc: "" },
  { id: "pet_redpanda", slot: "pet", name: "铅笔小熊猫", rarity: "普通", price: 120, desc: "抱着铅笔的小熊猫。" },
  { id: "pet_robodog", slot: "pet", name: "机器狗豆豆", rarity: "稀有", price: 350, desc: "屏幕脸会眨眼。" },
  { id: "pet_dragon", slot: "pet", name: "翡翠小龙", rarity: "史诗", unlock: "combo10", desc: "连续答对 10 题解锁（宝箱也可能开出）。" },
  { id: "pet_phoenix", slot: "pet", name: "彩虹凤凰", rarity: "传说", price: 3000, desc: "传说中的星光凤凰。" },
  { id: "frame_none", slot: "frame", name: "无头像框", rarity: "普通", desc: "" },
  { id: "frame_bronze", slot: "frame", name: "铜色头像框", rarity: "普通", price: 50, desc: "" },
  { id: "frame_silver", slot: "frame", name: "银色头像框", rarity: "稀有", price: 200, desc: "" },
  { id: "frame_purple", slot: "frame", name: "紫晶头像框", rarity: "史诗", unlock: "lv5", desc: "达到 5 级解锁。" },
  { id: "frame_rainbow", slot: "frame", name: "彩虹流光框", rarity: "传说", unlock: "lv8", desc: "达到 8 级解锁。" },
];
export const DEFAULT_OWNED = ["char_base", "bg_none", "pet_none", "frame_none"];
export const itemById = (id: string) => ITEMS.find((i) => i.id === id)!;
export const TITLES = ["数学萌新", "计算小能手", "图形小侦探", "思维小达人", "奥数小勇士", "竞赛小明星", "数学小博士", "数学大师", "传说数学王"];
export const xpForLevel = (lv: number) => 50 * lv * (lv - 1); // 累计经验：1级0，2级100，3级300，4级600……
export const levelOf = (xp: number) => { let lv = 1; while (lv < 99 && xp >= xpForLevel(lv + 1)) lv++; return lv; };
export const titleOf = (lv: number) => TITLES[Math.min(TITLES.length - 1, lv - 1)];

export interface Ach { id: string; name: string; desc: string; coins: number; chest?: boolean; test: (s: Save) => boolean }
export interface Save {
  v: 1; coins: number; coinsEarned: number; xp: number; owned: string[]; equip: Record<Slot, string>;
  prog: Record<string, unknown>; comp: Record<string, { solved: boolean; first: boolean }>;
  ach: string[]; correct: number; combo: number; maxCombo: number; chests: number; opened: number;
  daily: { last: string; streak: number; best: number }; mastered: string[];
}
const compCount = (s: Save, band?: string, bandOf?: (id: string) => string) => Object.entries(s.comp).filter(([id, c]) => c.solved && (!band || (bandOf && bandOf(id) === band))).length;
let bandOf: (id: string) => string = () => "";
export const setBandResolver = (f: (id: string) => string) => { bandOf = f; };
export const ACHS: Ach[] = [
  { id: "first", name: "第一步", desc: "第一次答对题目", coins: 20, test: (s) => s.correct >= 1 },
  { id: "c10", name: "小试牛刀", desc: "累计答对 10 题", coins: 50, test: (s) => s.correct >= 10 },
  { id: "c50", name: "勤学苦练", desc: "累计答对 50 题", coins: 150, chest: true, test: (s) => s.correct >= 50 },
  { id: "c200", name: "题海遨游", desc: "累计答对 200 题", coins: 400, chest: true, test: (s) => s.correct >= 200 },
  { id: "combo5", name: "五连对", desc: "连续答对 5 题", coins: 40, test: (s) => s.maxCombo >= 5 },
  { id: "combo10", name: "十连对", desc: "连续答对 10 题（解锁翡翠小龙）", coins: 100, chest: true, test: (s) => s.maxCombo >= 10 },
  { id: "master1", name: "初次掌握", desc: "掌握第 1 个关卡", coins: 50, test: (s) => s.mastered.length >= 1 },
  { id: "master4", name: "半岛探险家", desc: "掌握 4 个关卡（解锁星际宇航员）", coins: 150, chest: true, test: (s) => s.mastered.length >= 4 },
  { id: "master8", name: "全岛通关", desc: "掌握全部 8 个关卡", coins: 500, chest: true, test: (s) => s.mastered.length >= 8 },
  { id: "comp1", name: "竞赛初体验", desc: "解出第 1 道竞赛题", coins: 30, test: (s) => compCount(s) >= 1 },
  { id: "comp10", name: "竞赛新星", desc: "解出 10 道竞赛题", coins: 120, chest: true, test: (s) => compCount(s) >= 10 },
  { id: "comp20", name: "奥数小达人", desc: "解出 20 道竞赛题（解锁汉服小书生）", coins: 200, chest: true, test: (s) => compCount(s) >= 20 },
  { id: "low", name: "低年级全通", desc: "解出全部低年级竞赛题", coins: 200, chest: true, test: (s) => compCount(s, "低", bandOf) >= 24 },
  { id: "compHigh10", name: "高年级勇士", desc: "解出 10 道高年级竞赛题（解锁 π 能量机甲）", coins: 300, chest: true, test: (s) => compCount(s, "高", bandOf) >= 10 },
  { id: "streak3", name: "三天打卡", desc: "连续签到 3 天", coins: 60, test: (s) => s.daily.best >= 3 },
  { id: "streak7", name: "一周坚持", desc: "连续签到 7 天（解锁云上星辰城堡）", coins: 200, chest: true, test: (s) => s.daily.best >= 7 },
  { id: "shop1", name: "第一件新衣", desc: "在商店买下第一件物品", coins: 30, test: (s) => s.owned.length > DEFAULT_OWNED.length },
  { id: "collect10", name: "小小收藏家", desc: "拥有 10 件形象物品", coins: 150, chest: true, test: (s) => s.owned.length >= 10 + DEFAULT_OWNED.length - 4 },
  { id: "lv5", name: "5 级达成", desc: "等级达到 5 级（解锁紫晶头像框）", coins: 100, test: (s) => levelOf(s.xp) >= 5 },
  { id: "lv8", name: "8 级达成", desc: "等级达到 8 级（解锁彩虹流光框）", coins: 300, chest: true, test: (s) => levelOf(s.xp) >= 8 },
];
const UNLOCK_TEST: Record<string, (s: Save) => boolean> = {
  master4: (s) => s.mastered.length >= 4, comp20: (s) => compCount(s) >= 20, compHigh10: (s) => compCount(s, "高", bandOf) >= 10,
  king: (s) => s.mastered.length >= 8 && compCount(s) >= 30, streak7: (s) => s.daily.best >= 7, combo10: (s) => s.maxCombo >= 10,
  lv5: (s) => levelOf(s.xp) >= 5, lv8: (s) => levelOf(s.xp) >= 8,
};
export const UNLOCK_TEXT: Record<string, string> = {
  master4: "掌握 4 个关卡", comp20: "解出 20 道竞赛题", compHigh10: "解出 10 道高年级竞赛题", king: "8 关全掌握 + 30 道竞赛题",
  streak7: "连续签到 7 天", combo10: "连续答对 10 题", lv5: "达到 5 级", lv8: "达到 8 级",
};

const KEY = "mi_save_v1";
const fresh = (): Save => ({ v: 1, coins: 0, coinsEarned: 0, xp: 0, owned: [...DEFAULT_OWNED], equip: { char: "char_base", bg: "bg_none", pet: "pet_none", frame: "frame_none" },
  prog: {}, comp: {}, ach: [], correct: 0, combo: 0, maxCombo: 0, chests: 0, opened: 0, daily: { last: "", streak: 0, best: 0 }, mastered: [] });
function load(): Save {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return { ...fresh(), ...s, equip: { ...fresh().equip, ...s.equip }, daily: { ...fresh().daily, ...s.daily } }; } catch { /* ignore */ }
  return fresh();
}
let S: Save = typeof localStorage !== "undefined" ? load() : fresh();
export interface Toast { id: number; text: string; kind: "coin" | "ach" | "level" | "item" | "chest" }
let toasts: Toast[] = []; let tid = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const get = () => S;
export const getToasts = () => toasts;
function toast(text: string, kind: Toast["kind"]) { const id = ++tid; toasts = [...toasts, { id, text, kind }]; setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, 3200); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } emit(); }

function grant(coins: number, xp: number, why: string) {
  const lv0 = levelOf(S.xp);
  S = { ...S, coins: S.coins + coins, coinsEarned: S.coinsEarned + coins, xp: S.xp + xp };
  if ((coins || xp) && why) toast(`${why} +${coins} 金币${xp ? `　+${xp} 经验` : ""}`, "coin");
  const lv1 = levelOf(S.xp);
  if (lv1 > lv0) { S = { ...S, chests: S.chests + 1 }; toast(`升级啦！Lv.${lv1}「${titleOf(lv1)}」，获得 1 个宝箱`, "level"); }
}
function check() {
  for (let round = 0; round < 3; round++) {
    let changed = false;
    for (const a of ACHS) if (!S.ach.includes(a.id) && a.test(S)) {
      S = { ...S, ach: [...S.ach, a.id], chests: S.chests + (a.chest ? 1 : 0) }; changed = true;
      toast(`🏅 成就「${a.name}」+${a.coins} 金币${a.chest ? " + 宝箱" : ""}`, "ach");
      grant(a.coins, 0, "");
    }
    for (const it of ITEMS) if (it.unlock && !S.owned.includes(it.id) && UNLOCK_TEST[it.unlock]?.(S)) {
      S = { ...S, owned: [...S.owned, it.id] }; changed = true; toast(`✨ 解锁「${it.name}」（${it.rarity}）！去衣橱换上吧`, "item");
    }
    if (!changed) break;
  }
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function dailyCheck(): number {
  const t = today(); if (S.daily.last === t) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const ys = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  const streak = S.daily.last === ys ? S.daily.streak + 1 : 1;
  const bonus = 10 * Math.min(streak, 7);
  S = { ...S, daily: { last: t, streak, best: Math.max(S.daily.best, streak) } };
  grant(bonus, 5, `📅 第 ${streak} 天签到`);
  check(); save(); return bonus;
}
export function onLevelAnswer(correct: boolean, first: boolean) {
  if (!correct) { S = { ...S, combo: 0 }; save(); return; }
  const combo = first ? S.combo + 1 : 0;
  S = { ...S, correct: S.correct + 1, combo, maxCombo: Math.max(S.maxCombo, combo) };
  grant(first ? 5 : 2, first ? 10 : 4, first ? "答对" : "改正答对");
  check(); save();
}
export function onMastery(id: string) {
  if (S.mastered.includes(id)) return;
  S = { ...S, mastered: [...S.mastered, id], chests: S.chests + 1 };
  grant(50, 100, "🎉 掌握新关卡"); toast("获得 1 个宝箱！", "chest"); check(); save();
}
export const COMP_REWARD: Record<string, [number, number]> = { 低: [20, 30], 中: [30, 45], 高: [40, 60] };
export function onCompAnswer(id: string, band: string, correct: boolean, tries: number) {
  if (!correct) { S = { ...S, combo: 0 }; save(); return; }
  const prev = S.comp[id];
  const first = tries === 0;
  const combo = first ? S.combo + 1 : 0;
  S = { ...S, correct: S.correct + 1, combo, maxCombo: Math.max(S.maxCombo, combo), comp: { ...S.comp, [id]: { solved: true, first: (prev?.first ?? false) || first } } };
  const [c, x] = COMP_REWARD[band] ?? [20, 30];
  if (!prev?.solved) {
    const k = tries === 0 ? 1 : tries === 1 ? 0.5 : 0.25;
    grant(Math.round(c * k), Math.round(x * k), first ? "🏆 竞赛题一次答对" : "🏆 竞赛题答对");
    const n = Object.values(S.comp).filter((v) => v.solved).length;
    if (n % 5 === 0) { S = { ...S, chests: S.chests + 1 }; toast(`已解出 ${n} 道竞赛题，获得 1 个宝箱！`, "chest"); }
  } else grant(2, 5, "复习竞赛题");
  check(); save();
}
export function buy(id: string): string | null {
  const it = itemById(id);
  if (S.owned.includes(id)) return "已经拥有啦";
  if (it.price === undefined) return "这件只能通过成就或宝箱获得";
  if (S.coins < it.price) return `金币不够，还差 ${it.price - S.coins}`;
  S = { ...S, coins: S.coins - it.price, owned: [...S.owned, id] };
  toast(`🛍️ 买下「${it.name}」！`, "item"); check(); save(); return null;
}
export function equip(id: string) { const it = itemById(id); if (!S.owned.includes(id)) return; S = { ...S, equip: { ...S.equip, [it.slot]: id } }; save(); }
export function openChest(): { coins: number; item?: Item } | null {
  if (S.chests <= 0) return null;
  const coins = 20 + Math.floor(Math.random() * 61);
  S = { ...S, chests: S.chests - 1, opened: S.opened + 1 };
  let item: Item | undefined;
  const pool = ITEMS.filter((i) => !S.owned.includes(i.id) && !i.id.endsWith("_none"));
  if (pool.length && Math.random() < 0.35) {
    const tot = pool.reduce((a, i) => a + RARITY_W[i.rarity], 0); let r = Math.random() * tot;
    for (const i of pool) { r -= RARITY_W[i.rarity]; if (r <= 0) { item = i; break; } }
    item = item ?? pool[0];
    S = { ...S, owned: [...S.owned, item.id] };
  }
  grant(coins, 0, "🎁 宝箱");
  if (item) toast(`🎁 开出${item.rarity}「${item.name}」！`, "item");
  check(); save(); return { coins, item };
}
export function setProg(prog: Record<string, unknown>) { S = { ...S, prog }; save(); }
export function resetAll() { S = fresh(); save(); }

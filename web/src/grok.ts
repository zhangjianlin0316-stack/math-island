import { useState, useEffect, useRef } from "react";
export { useState, useEffect, useRef };
export type { ReactNode, CSSProperties, ChangeEvent } from "react";
const theme = {
  font: { family: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif' },
  text: { primary: "#1f2430", secondary: "#5b6372", tertiary: "#8a91a0", onPrimary: "#ffffff", success: "#2f9e44", accent: "#3b5bdb" },
  bg: { base: "#fffaf0", subtle: "#ffffff", elevated: "#ffffff" },
  border: { default: "#ece3d0", strong: "#c9bfa9", subtle: "#f1ead9" },
  fill: { primary: "#4C8DFF", secondary: "#f3ecdc", accentSubtle: "#e5edff", dangerSubtle: "#ffd8d8" },
};
export function useGrokTheme() { return theme; }

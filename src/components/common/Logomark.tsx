// src/components/common/Logomark.tsx
//
// The Hatiwal logo mark (v4) — a gold shopping bag with the lapis "H" (same
// Lato Black letterform as the app icon). Says "shopping" at a glance. Colors
// come from the brand tokens in useColors().
import Svg, { Rect, Polygon, Path } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

// "H" pre-positioned on the bag body (Lato Black glyph, scaled + offset).
const H_PATH = "M62.22 51V79H55.69V67.16H44.31V79H37.78V51H44.31V62.71H55.69V51Z";

export function Logomark({ size = 56 }: { size?: number }) {
  const c = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image">
      <Rect width={100} height={100} rx={18} fill={c.brandLapis} />
      <Rect x={35} y={30} width={14} height={24} rx={7} fill="none" stroke={c.brandGold} strokeWidth={4.2} />
      <Rect x={51} y={30} width={14} height={24} rx={7} fill="none" stroke={c.brandGold} strokeWidth={4.2} />
      <Polygon points="29,44 71,44 75,82 25,82" fill={c.brandGold} />
      <Path d={H_PATH} fill={c.brandLapis} />
    </Svg>
  );
}

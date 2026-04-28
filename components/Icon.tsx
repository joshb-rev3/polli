import React from "react";
import Svg, { Circle, Path, Rect, G } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const stroke = (color = "#19191B", strokeWidth = 2) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
});

export const IconBack = ({ size = 20, color, strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M15 18l-6-6 6-6" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const IconArrow = ({ size = 20, color, strokeWidth = 2.2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h14M13 6l6 6-6 6" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const IconClose = ({ size = 22, color, strokeWidth = 2 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 6l12 12M18 6L6 18" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const IconCheck = ({ size = 20, color, strokeWidth = 2.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12l5 5 9-11" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const IconHome = ({ size = 24, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"
      {...stroke(color, 1.8)}
    />
  </Svg>
);

export const IconUsers = ({ size = 24, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={9} cy={8} r={4} {...stroke(color, 1.8)} />
    <Path d="M1 21a8 8 0 0 1 16 0M17 11a4 4 0 0 0 0-8M23 21a8 8 0 0 0-6-7.7" {...stroke(color, 1.8)} />
  </Svg>
);

export const IconProfile = ({ size = 24, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={8} r={4} {...stroke(color, 1.8)} />
    <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...stroke(color, 1.8)} />
  </Svg>
);

export const IconPlus = ({ size = 24, color = "#19191B", strokeWidth = 2.5 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M5 12h14" {...stroke(color, strokeWidth)} />
  </Svg>
);

export const IconHeart = ({ size = 20, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"
      {...stroke(color, 1.8)}
    />
  </Svg>
);

export const IconShare = ({ size = 20, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 3v13M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
      {...stroke(color, 1.8)}
    />
  </Svg>
);

export const IconMsg = ({ size = 22, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-6.3A8 8 0 1 1 21 12z" {...stroke(color, 1.8)} />
  </Svg>
);

export const IconCopy = ({ size = 22, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={9} y={9} width={12} height={12} rx={2} {...stroke(color, 1.8)} />
    <Path
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      {...stroke(color, 1.8)}
    />
  </Svg>
);

export const IconLink = ({ size = 16, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1 1"
      {...stroke(color, 1.8)}
    />
    <Path
      d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"
      {...stroke(color, 1.8)}
    />
  </Svg>
);

export const IconClock = ({ size = 18, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={9} {...stroke(color, 1.8)} />
    <Path d="M12 7v5l3 2" {...stroke(color, 1.8)} />
  </Svg>
);

export const IconWifi = ({ size = 17, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={(size * 12) / 18} viewBox="0 0 18 12">
    <Path
      fill={color}
      d="M9 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.2 8.2A5 5 0 0 1 9 6.5c1.4 0 2.8.6 3.8 1.7l1-1.4A6.8 6.8 0 0 0 9 5 6.8 6.8 0 0 0 4.2 6.8l1 1.4zM2 5a9 9 0 0 1 14 0l-1 1.4A7 7 0 0 0 3 6.4L2 5z"
    />
  </Svg>
);

export const IconBattery = ({ size = 26, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={(size * 12) / 26} viewBox="0 0 26 12">
    <Rect x={0.5} y={0.5} width={22} height={11} rx={3} fill="none" stroke={color} opacity={0.5} />
    <Rect x={2} y={2} width={19} height={8} rx={1.6} fill={color} />
    <Rect x={23} y={3.5} width={2} height={5} rx={1} fill={color} opacity={0.5} />
  </Svg>
);

export const IconSignal = ({ size = 17, color = "#19191B" }: IconProps) => (
  <Svg width={size} height={(size * 12) / 17} viewBox="0 0 17 12">
    <Rect x={0} y={8} width={3} height={4} rx={0.5} fill={color} />
    <Rect x={4.7} y={6} width={3} height={6} rx={0.5} fill={color} />
    <Rect x={9.4} y={3} width={3} height={9} rx={0.5} fill={color} />
    <Rect x={14.1} y={0} width={3} height={12} rx={0.5} fill={color} />
  </Svg>
);

// AnimatedWhotCard.tsx
import React, { useMemo } from "react";
import { Group, Skia, type SkFont } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import type { AnimatedCard } from "./WhotCardTypes";
import { WhotCardFace } from "./WhotCardFace";
import { WhotCardBack } from "./WhotCardBack";

interface AnimatedWhotCardProps {
 card: AnimatedCard;
 // ✅ Accept fonts as props
 font: SkFont;
 whotFont: SkFont;
}

export const AnimatedWhotCard = ({ card, font, whotFont }: AnimatedWhotCardProps) => {
 // ❌ We no longer load fonts here
 const { rotate, suit, number, width, height } = card;

 const backOpacity = useDerivedValue(() =>
  rotate.value <= Math.PI / 2 ? 1 : 0
 );
 const frontOpacity = useDerivedValue(() =>
  rotate.value > Math.PI / 2 ? 1 : 0
 );

 const transformMatrix = useDerivedValue(() => {
  "worklet";
  const m = Skia.Matrix();
  m.translate(width / 2, height / 2);
  m.scale(Math.cos(rotate.value), 1);
  m.translate(-width / 2, -height / 2);
  return m;
 }, [rotate, width, height]);

 const faceCorrectionMatrix = useMemo(() => {
  const m = Skia.Matrix();
  m.translate(width / 2, height / 2);
  m.scale(-1, 1);
  m.translate(-width / 2, -height / 2);
  return m;
 }, [width, height]);

 return (
  <Group>
   <Group matrix={transformMatrix} opacity={backOpacity}>
    {/* ✅ Pass the loaded fonts down to the card back */}
    <WhotCardBack width={width} height={height} font={whotFont} smallFont={font} />
   </Group>

   <Group matrix={transformMatrix} opacity={frontOpacity}>
    <Group matrix={faceCorrectionMatrix}>
     <WhotCardFace
      suit={suit}
      number={number}
      width={width}
      height={height}
      font={font}
      whotFont={whotFont}
     />
    </Group>
   </Group>
  </Group>
 );
};

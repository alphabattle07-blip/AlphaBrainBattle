// AnimatedWhotCard.tsx (CORRECTED)
import React, { useMemo } from 'react';
import { Group, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { WhotCardFace } from './WhotCardFace';
import { WhotCardBack } from './WhotCardBack';
import { useWhotFonts } from './useWhotFonts';
import type { AnimatedCard } from './WhotCardTypes';

interface AnimatedWhotCardProps {
  card: AnimatedCard;
}

export const AnimatedWhotCard = ({ card }: AnimatedWhotCardProps) => {
  const { x, y, rotate, suit, number, width, height } = card;
  const { font, whotFont, areLoaded } = useWhotFonts();
  if (!areLoaded) return null;

  const faceCorrectionMatrix = useMemo(() => {
    const m = Skia.Matrix();
    m.translate(width / 2, height / 2);
    m.scale(-1, 1);
    m.translate(-width / 2, -height / 2);
    return m;
  }, [width, height]);

  const transform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value },
  ]);

  const matrix = useDerivedValue(() => {
    const m = Skia.Matrix();
    m.translate(width / 2, height / 2);
    m.scale(Math.cos(rotate.value), 1); // This squashes the card during flip
    m.translate(-width / 2, -height / 2);
    return m;
  });

  // ✅ NEW: Create derived values for opacity
  const backOpacity = useDerivedValue(() => (rotate.value <= Math.PI / 2 ? 1 : 0));
  const frontOpacity = useDerivedValue(() => (rotate.value > Math.PI / 2 ? 1 : 0));


  return (
    <Group transform={transform}>
      {/* Back of the Card */}
      <Group matrix={matrix} opacity={backOpacity}>
        <WhotCardBack width={width} height={height} />
      </Group>

      {/* Front of the Card (rendered on top, but only visible when flipped) */}
      <Group matrix={matrix} opacity={frontOpacity}>
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
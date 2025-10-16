import React from 'react';
import { RoundedRect, Text, useFont, Group } from '@shopify/react-native-skia';

export interface WhotCardBackProps {
  width?: number;
  height?: number;
}
export const WhotCardBack = ({ width = 100, height = 150 }: WhotCardBackProps) => {
  const font = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 20);
  const smallFont = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 12);

  if (!font || !smallFont) {
    return null;
  }

  const cornerRadius = 10;
  const textColor = '#FDFBF6';
  const backgroundColor = '#A22323';

  const mainWhotText = 'WHOT';
  const mainWhotTextWidth = font.getTextWidth(mainWhotText);
  const mainWhotX = (width - mainWhotTextWidth) / 2;
  const mainWhotY = (height / 2) + (font.getSize() / 2);

  const smallWhotText = 'Whot';
  const smallWhotTextWidth = smallFont.getTextWidth(smallWhotText);

  return (
    // Use a Group, not a Canvas
    <Group>
      {/* Card Background */}
      <RoundedRect x={0} y={0} width={width} height={height} r={cornerRadius} color={backgroundColor} />
      
      {/* Card Border */}
      <RoundedRect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        r={cornerRadius}
        color="#FDFBF6"
        style="stroke"
        strokeWidth={2}
      />

      {/* Main "WHOT" text */}
      <Text x={mainWhotX} y={mainWhotY} text={mainWhotText} font={font} color={textColor} />

      {/* Top-left rotated text */}
      <Group
        origin={{ x: width * 0.25, y: height * 0.25 }}
        transform={[{ rotate: -Math.PI / 4 }]}
      >
        <Text
          x={width * 0.25 - smallWhotTextWidth / 2}
          y={height * 0.25 + smallFont.getSize() / 2}
          text={smallWhotText}
          font={smallFont}
          color={textColor}
        />
      </Group>
      <Group
        origin={{ x: width * 0.75, y: height * 0.75 }}
        transform={[{ rotate: (3 * Math.PI) / 4 }]}
      >
        <Text
          x={width * 0.75 - smallWhotTextWidth / 2}
          y={height * 0.75 + smallFont.getSize() / 2}
          text={smallWhotText}
          font={smallFont}
          color={textColor}
        />
      </Group>
    </Group>
  );
};
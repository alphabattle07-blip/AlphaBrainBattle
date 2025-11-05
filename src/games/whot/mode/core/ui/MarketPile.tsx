// core/ui/MarketPile.tsx
import React, { useMemo, memo } from "react"; 
import { StyleSheet, View, Text } from "react-native";
import { Canvas, Group } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import { WhotCardBack } from "./WhotCardBack";
import { CARD_WIDTH, CARD_HEIGHT } from "./whotConfig";
import { getCoords } from "../coordinateHelper";

interface MarketPileProps {
  count: number;
  font: any;
  smallFont: any;
  onPress?: () => void;
  width: number; // Screen width
  height: number; // Screen height
}

const MAX_STACK_CARDS = 15;
const STACK_OFFSET = 0.4;

// ✅ 1. CREATE THE NEW INNER, MEMOIZED CANVAS
interface MemoizedMarketCanvasProps {
  visualStackCount: number;
  font: any;
  smallFont: any;
}

const MemoizedMarketCanvas = memo(
  ({ visualStackCount, font, smallFont }: MemoizedMarketCanvasProps) => {
    // This component will *only* re-render when visualStackCount
    // actually changes (e.g., from 15 to 14).
    return (
      <Canvas style={StyleSheet.absoluteFill}>
        {Array.from({ length: visualStackCount }).map((_, index) => (
          <Group
            key={index}
            transform={[{ translateY: index * STACK_OFFSET }]}
          >
            <WhotCardBack
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              font={font}
              smallFont={smallFont}
            />
          </Group>
        ))}
      </Canvas>
    );
  }
);

// 2. Wrap the component in memo()
export const MarketPile = memo(
  ({
    count,
    font,
    smallFont,
    onPress,
    width,
    height,
  }: MarketPileProps) => {
    console.log("LOG: 🟡 MarketPile re-rendered.");
    const marketPos = useMemo(
      () => getCoords("market", {}, width, height),
      [width, height]
    );

    const style = useMemo(
      () => ({
        position: "absolute" as const,
        width: CARD_WIDTH,
        height: CARD_HEIGHT + MAX_STACK_CARDS * STACK_OFFSET + 20,
        top: marketPos.y - CARD_HEIGHT / 2 - 10,
        left: marketPos.x - CARD_WIDTH / 2,
        zIndex: 5,
        overflow: "visible",
      }),
      [marketPos]
    );

    const visualStackCount = useMemo(
   () => Math.min(count, MAX_STACK_CARDS),
   [count]
  );

    const tapGesture = useMemo(
      () =>
        Gesture.Tap().onEnd(() => {
          if (onPress) {
            runOnJS(onPress)();
          }
        }),
      [onPress]
    );

    if ( !font || !smallFont) {
      return null;
    }

return (
   <GestureDetector gesture={tapGesture}>
    <Animated.View style={style}>

          <MemoizedMarketCanvas 
            visualStackCount={visualStackCount}
            font={font}
            smallFont={smallFont}
          />

    {count > 0 && (
   <View style={styles.badgeContainer}>
   <Text style={styles.badgeText}>{count}</Text>
   </View>
  )}
  </Animated.View>
   </GestureDetector>
  );
 }
);

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    left: -12,
    top: 8,
    backgroundColor: "#00008B", // Dark Blue
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});
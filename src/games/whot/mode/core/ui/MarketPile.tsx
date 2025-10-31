// core/ui/MarketPile.tsx
import React, { useMemo, memo } from "react"; // 1. Import memo
import { StyleSheet, View, Text } from "react-native";
import { Canvas, Group } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import { WhotCardBack } from "./WhotCardBack";
import { Card } from "../types";
import { CARD_WIDTH, CARD_HEIGHT } from "./whotConfig";
import { getCoords } from "../coordinateHelper";

interface MarketPileProps {
  cards: Card[];
  font: any;
  smallFont: any;
  onPress?: () => void;
  width: number; // Screen width
  height: number; // Screen height
}

const MAX_STACK_CARDS = 15;
const STACK_OFFSET = 0.4;

// 2. Wrap the component in memo()
export const MarketPile = memo(
  ({
    cards,
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

    const visualStack = useMemo(
      () => cards.slice(0, Math.min(cards.length, MAX_STACK_CARDS)),
      [cards]
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

    if (cards.length === 0 || !font || !smallFont) {
      return null;
    }

    return (
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={style}>
          {/* Canvas showing the stacked cards */}
          <Canvas style={StyleSheet.absoluteFill}>
            {visualStack.map((card, index) => (
              <Group
                key={card.id}
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

          {/* Card count badge */}
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{cards.length}</Text>
          </View>
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
// ui/WhotSuitSelector.tsx
import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  Skia,
  SkFont,
  BlurMask,
} from "@shopify/react-native-skia";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  withDelay,
} from "react-native-reanimated";
import { CardSuit } from "../core/types";

interface WhotSuitSelectorProps {
  isVisible: boolean;
  onSelectSuit: (suit: CardSuit) => void;
  width: number;
  height: number;
  font: SkFont | null;
}

const SHAPE_SIZE = 60;
const COLOR_RED = "#A22323";

// Reusing Shape Logic from WhotCardFace for consistency
const ShapeIcon = ({ suit, x, y }: { suit: CardSuit; x: number; y: number }) => {
  const size = SHAPE_SIZE;
  const cx = x + size / 2;
  const cy = y + size / 2;

  switch (suit) {
    case "circle":
      return <Circle cx={cx} cy={cy} r={size / 2} color={COLOR_RED} />;
    case "triangle": {
      const path = Skia.Path.Make();
      const h = (size * Math.sqrt(3)) / 2;
      path.moveTo(cx, cy - h / 2);
      path.lineTo(cx - size / 2, cy + h / 2);
      path.lineTo(cx + size / 2, cy + h / 2);
      path.close();
      return <Path path={path} color={COLOR_RED} />;
    }
    case "cross": {
      const barWidth = size / 2.03;
      return (
        <Group color={COLOR_RED}>
          <Rect x={cx - size / 2} y={cy - barWidth / 2} width={size} height={barWidth} />
          <Rect x={cx - barWidth / 2} y={cy - size / 2} width={barWidth} height={size} />
        </Group>
      );
    }
    case "square":
      return (
        <Rect
          x={cx - size / 2}
          y={cy - size / 2}
          width={size}
          height={size}
          color={COLOR_RED}
        />
      );
    case "star": {
      const path = Skia.Path.Make();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? size / 2 : size / 4;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
      path.close();
      return <Path path={path} color={COLOR_RED} />;
    }
    default:
      return null;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SelectionItem = ({
  suit,
  label,
  index,
  onPress,
}: {
  suit: CardSuit;
  label: string;
  index: number;
  onPress: (s: CardSuit) => void;
}) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 100, withSpring(1));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.itemContainer, style]}
      onPress={() => onPress(suit)}
    >
      <View style={styles.canvasWrapper}>
        <Canvas style={{ width: SHAPE_SIZE + 20, height: SHAPE_SIZE + 20 }}>
          <Group>
            {/* White Background Circle */}
            <Circle cx={40} cy={40} r={38} color="white">
                <BlurMask blur={2} style="solid" />
            </Circle>
            <ShapeIcon suit={suit} x={10} y={10} />
          </Group>
        </Canvas>
      </View>
      <Text style={styles.label}>{label}</Text>
    </AnimatedPressable>
  );
};

export const WhotSuitSelector = ({
  isVisible,
  onSelectSuit,
  width,
  height,
}: WhotSuitSelectorProps) => {
  if (!isVisible) return null;

  const suits: { type: CardSuit; label: string }[] = [
    { type: "circle", label: "CIRCLE" },
    { type: "triangle", label: "TRIANGLE" },
    { type: "cross", label: "CROSS" },
    { type: "square", label: "SQUARE" },
    { type: "star", label: "STAR" },
  ];

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[styles.overlay, { width, height }]}
    >
      <View style={styles.backdrop} />
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>SELECT A SHAPE</Text>
        <Text style={styles.subTitle}>Whot played! Choose next suit.</Text>

        <View style={styles.grid}>
          {suits.map((item, index) => (
            <SelectionItem
              key={item.type}
              suit={item.type}
              label={item.label}
              index={index}
              onPress={onSelectSuit}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 999, // Ensure it sits on top of everything
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  contentContainer: {
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subTitle: {
    fontSize: 16,
    color: "#DDDDDD",
    marginBottom: 30,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
  },
  itemContainer: {
    alignItems: "center",
    margin: 5,
  },
  canvasWrapper: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    marginTop: 8,
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
});

export default WhotSuitSelector;
// core/ui/GameOverModal.tsx
import React from "react";
import { View, StyleSheet, Text, Pressable, useWindowDimensions } from "react-native";
import Animated, { FadeIn, BounceIn, FadeOut } from "react-native-reanimated";
import { Canvas, BlurMask, RoundedRect, Group, Circle, Star } from "@shopify/react-native-skia";
import { Player } from "../types";

interface GameOverModalProps {
  winner: Player | null;
  onRestart: () => void;
  visible: boolean;
}

const GameOverModal = ({ winner, onRestart, visible }: GameOverModalProps) => {
  const { width, height } = useWindowDimensions();

  if (!visible || !winner) return null;

  const isHuman = winner.id.includes("player-0") || winner.name === "Player";

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(300)}
      style={[styles.overlay, { width, height }]}
    >
      {/* Semi-transparent Background */}
      <View style={styles.backdrop} />

      {/* Bouncing Content Card */}
      <Animated.View entering={BounceIn.delay(100).duration(600)} style={styles.modalContainer}>
        
        {/* Decorative Skia Background behind the text */}
        <View style={styles.skiaBackground}>
             <Canvas style={{ width: 300, height: 300 }}>
                <Group color={isHuman ? "#FFD700" : "#A22323"} opacity={0.15}>
                   <Circle cx={150} cy={150} r={120}>
                      <BlurMask blur={20} style="normal" />
                   </Circle>
                </Group>
             </Canvas>
        </View>

        {/* Title */}
        <Text style={styles.gameOverText}>GAME OVER</Text>

        {/* Winner Announcement */}
        <View style={styles.winnerContainer}>
            <Text style={styles.winnerText}>
                {isHuman ? "🎉 YOU WON! 🎉" : "🤖 COMPUTER WINS"}
            </Text>
            <Text style={styles.subText}>
                {isHuman ? "Great job clearing your hand!" : "Better luck next time!"}
            </Text>
        </View>

        {/* Restart Button */}
        <Pressable 
            onPress={onRestart} 
            style={({pressed}) => [
                styles.button, 
                { backgroundColor: isHuman ? "#1E5E4E" : "#A22323", opacity: pressed ? 0.8 : 1 }
            ]}
        >
            <Text style={styles.buttonText}>PLAY AGAIN</Text>
        </Pressable>

      </Animated.View>
    </Animated.View>
  );
};

export default GameOverModal;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContainer: {
    width: 320,
    padding: 30,
    borderRadius: 25,
    backgroundColor: "white",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    overflow: 'hidden'
  },
  skiaBackground: {
      position: 'absolute',
      top: -50,
      left: 0,
      right: 0,
      alignItems: 'center',
  },
  gameOverText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#333",
    marginBottom: 20,
    letterSpacing: 2,
  },
  winnerContainer: {
      alignItems: 'center',
      marginBottom: 30,
  },
  winnerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
      fontSize: 14,
      color: "#666",
      textAlign: "center"
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});


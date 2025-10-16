// IndividualAnimatedCard.tsx (CORRECTED)
import React, { forwardRef, useImperativeHandle } from 'react';
import Animated, {
 useSharedValue,
 withTiming,
 Easing,
 runOnJS,
 useAnimatedStyle,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Card, CARD_WIDTH, CARD_HEIGHT } from './WhotCardTypes';

export interface IndividualCardHandle {
 moveCard: (targetX: number, targetY: number) => Promise<void>;
 flipCard: (isFaceUp: boolean) => Promise<void>;
 animatedValues: {
  x: Animated.SharedValue<number>;
  y: Animated.SharedValue<number>;
  rotate: Animated.SharedValue<number>;
 };
}

interface IndividualAnimatedCardProps {
 card: Card;
 initialPosition: { x: number; y: number };
 onPress: (card: Card) => void;
}

const IndividualAnimatedCard = forwardRef<IndividualCardHandle, IndividualAnimatedCardProps>(
 ({ card, initialPosition, onPress }, ref) => {
  // ✅ FIX: Add a guard clause to prevent rendering if the prop isn't ready.
  if (!initialPosition) {
   return null;
  }

  const x = useSharedValue(initialPosition.x - CARD_WIDTH / 2);
  const y = useSharedValue(initialPosition.y - CARD_HEIGHT / 2);
  const rotate = useSharedValue(0);

  useImperativeHandle(ref, () => ({
   // ✅ Smooth card movement
   moveCard: (targetX, targetY) => {
    return new Promise((resolve) => {
     const adjustedX = targetX - CARD_WIDTH / 2;
     const adjustedY = targetY - CARD_HEIGHT / 2;
     const onComplete = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(resolve)();
     };

     // 💨 smooth easing motion
     x.value = withTiming(adjustedX, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
     }, onComplete);

     y.value = withTiming(adjustedY, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
     });
    });
   },

   // ✅ Smooth flip animation
   flipCard: (isFaceUp) => {
    return new Promise((resolve) => {
     const onComplete = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(resolve)();
     };

     rotate.value = withTiming(
      isFaceUp ? Math.PI : 0,
      {
       duration: 500,
       easing: Easing.inOut(Easing.ease),
      },
      onComplete
     );
    });
   },

   // ✅ expose animated values for the drawing layer
   animatedValues: { x, y, rotate },
  }));

  const tapGesture = Gesture.Tap().onEnd(() => {
   'worklet';
   runOnJS(onPress)(card);
  });

  const animatedStyle = useAnimatedStyle(() => ({
   position: 'absolute',
   width: CARD_WIDTH,
   height: CARD_HEIGHT,
   transform: [
    { translateX: x.value },
    { translateY: y.value },
    { rotateY: `${rotate.value}rad` },
   ],
  }));

  return (
   <GestureDetector gesture={tapGesture}>
    <Animated.View style={animatedStyle} />
   </GestureDetector>
  );
 }
);

IndividualAnimatedCard.displayName = 'IndividualAnimatedCard';
export default IndividualAnimatedCard;
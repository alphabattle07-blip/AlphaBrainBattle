// LudoSkiaBoard.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import {
    Canvas,
    Image as SkiaImage,
    useImage,
    Circle,
    Group,
    Paint,
    Shadow
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { LudoBoardData, NormalizedPoint } from './LudoCoordinates';

// VERIFY YOUR IMAGE PATH IS CORRECT
const boardImageSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');

const BOARD_IMAGE_WIDTH = 1024;
const BOARD_IMAGE_HEIGHT = 1024;
const TILE_ANIMATION_DURATION = 150;

interface LudoSkiaBoardProps {
    onBoardPress?: (x: number, y: number) => void;
    positions: { [key: string]: number[] };
}

interface AnimatedSeedProps {
    id: string; playerId: string; seedSubIndex: number; currentPos: number;
    canvasWidth: number; canvasHeight: number; color: string; radius: number;
}

const AnimatedSeed: React.FC<AnimatedSeedProps> = ({
    id, playerId, seedSubIndex, currentPos, canvasWidth, canvasHeight, color, radius
}) => {

    // --- 1. RESTORED LOOKUP ---
    const getTargetPixels = (index: number): { x: number, y: number } => {
        let norm: NormalizedPoint = { x: 0.5, y: 0.5 };

        // Determine Color Key ('red', 'yellow', etc.) based on ID
        const colorKey = playerId === 'p1' ? 'red' : 'yellow';

        if (index === -1) {
            // HOUSE / YARD
            const yardArr = LudoBoardData.yards[colorKey] || LudoBoardData.yards.red;
            norm = yardArr[seedSubIndex % yardArr.length];
        }
        else if (index === 999) {
            // FINISHED / HOME
            norm = LudoBoardData.homeBase;
        }
        else if (index >= 52) {
            // VICTORY LANE
            const victoryStep = index - 52;
            const path = LudoBoardData.victoryPaths[colorKey] || LudoBoardData.victoryPaths.red;
            const safeStep = Math.min(victoryStep, path.length - 1);
            if (path[safeStep]) norm = path[safeStep];
        }
        else {
            // MAIN PATH (0-51)
            const pathIndex = index % 52;
            if (LudoBoardData.mainPath[pathIndex]) norm = LudoBoardData.mainPath[pathIndex];
        }
        return { x: norm.x * canvasWidth, y: norm.y * canvasHeight };
    };

    const target = getTargetPixels(currentPos);
    const cx = useSharedValue(target.x);
    const cy = useSharedValue(target.y);
    const prevPosRef = useRef(currentPos);

    useEffect(() => {
        const oldPos = prevPosRef.current;
        const newPos = currentPos;
        prevPosRef.current = newPos;

        // Skip if no change
        if (oldPos === newPos) {
            cx.value = target.x; cy.value = target.y; return;
        }

        // --- 2. NEW LINEAR ANIMATION ---
        // Handle Direct Jumps (Respawn or Finish)
        if (oldPos === -1 || newPos === 999 || newPos === -1) {
            cx.value = withTiming(target.x, { duration: 400 });
            cy.value = withTiming(target.y, { duration: 400 });
            return;
        }

        // Handle Step-by-Step Movement
        // Since movement is now linear (10 -> 11 -> 12), we just loop numbers.
        const steps: number[] = [];

        // Safety check: only animate if moving forward reasonably
        if (newPos > oldPos && (newPos - oldPos) < 20) {
            for (let i = oldPos + 1; i <= newPos; i++) {
                steps.push(i);
            }
        } else {
            // If weird jump (backward or huge), just snap
            steps.push(newPos);
        }

        if (steps.length > 0) {
            const xSequence = steps.map(stepIndex => {
                const px = getTargetPixels(stepIndex);
                return withTiming(px.x, { duration: TILE_ANIMATION_DURATION, easing: Easing.linear });
            });
            const ySequence = steps.map(stepIndex => {
                const px = getTargetPixels(stepIndex);
                return withTiming(px.y, { duration: TILE_ANIMATION_DURATION, easing: Easing.linear });
            });
            cx.value = withSequence(...xSequence);
            cy.value = withSequence(...ySequence);
        } else {
            cx.value = withTiming(target.x);
            cy.value = withTiming(target.y);
        }

    }, [currentPos, canvasWidth, canvasHeight]);

    return (
        <Group>
            <Circle cx={cx} cy={cy} r={radius + 1} color="black" opacity={0.3}>
                <Shadow dx={1} dy={2} blur={3} color="rgba(0,0,0,0.5)" />
            </Circle>
            <Circle cx={cx} cy={cy} r={radius} color={color}>
                <Paint style="stroke" strokeWidth={1.5} color="white" />
            </Circle>
        </Group>
    );
};

export const LudoSkiaBoard: React.FC<LudoSkiaBoardProps> = ({ onBoardPress, positions }) => {
    const boardImage = useImage(boardImageSource);
    const { width: screenWidth } = useWindowDimensions();
    const BOARD_ASPECT_RATIO = BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT;
    const canvasWidth = screenWidth * 0.95;
    const canvasHeight = canvasWidth / BOARD_ASPECT_RATIO;
    const seedRadius = (canvasWidth / 15) * 0.35;

    const seedsData = useMemo(() => {
        const list: any[] = [];
        Object.entries(positions).forEach(([playerId, seedPositions]) => {
            const isP1 = playerId === 'p1';
            const color = isP1 ? '#FF3B30' : '#FFCC00';
            seedPositions.forEach((pos, index) => {
                list.push({ id: `${playerId}-${index}`, playerId, seedSubIndex: index, currentPos: pos, color });
            });
        });
        return list;
    }, [positions]);

    const tapGesture = Gesture.Tap().onEnd(({ x, y }) => {
        if (onBoardPress) runOnJS(onBoardPress)(x, y);
    });

    if (!boardImage) return null;

    return (
        <GestureDetector gesture={tapGesture}>
            <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
                <SkiaImage image={boardImage} x={0} y={0} width={canvasWidth} height={canvasHeight} fit="fill" />
                {seedsData.map((seed) => (
                    <AnimatedSeed key={seed.id} id={seed.id} playerId={seed.playerId} seedSubIndex={seed.seedSubIndex} currentPos={seed.currentPos} canvasWidth={canvasWidth} canvasHeight={canvasHeight} color={seed.color} radius={seedRadius} />
                ))}
            </Canvas>
        </GestureDetector>
    );
};
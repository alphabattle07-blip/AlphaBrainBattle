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
import { 
    useSharedValue, 
    withTiming, 
    withSequence, // <-- NEW: Allows chaining animations
    Easing, 
    runOnJS 
} from 'react-native-reanimated';
import { LudoBoardData, NormalizedPoint } from './LudoCoordinates';

const boardImageSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');

const BOARD_IMAGE_WIDTH = 1024;
const BOARD_IMAGE_HEIGHT = 1024;

// Speed per tile (Lower = Faster)
const TILE_ANIMATION_DURATION = 150; 

interface LudoSkiaBoardProps {
    onBoardPress?: (x: number, y: number) => void;
    positions: { [key: string]: number[] };
}

interface AnimatedSeedProps {
    id: string;
    playerId: string;
    seedSubIndex: number;
    currentPos: number; 
    canvasWidth: number;
    canvasHeight: number;
    color: string;
    radius: number;
}

const AnimatedSeed: React.FC<AnimatedSeedProps> = ({ 
    id, playerId, seedSubIndex, currentPos, canvasWidth, canvasHeight, color, radius 
}) => {
    
    // 1. LOOKUP FUNCTION (Same as before)
    const getTargetPixels = (index: number): {x: number, y: number} => {
        let norm: NormalizedPoint = { x: 0.5, y: 0.5 }; 

        if (index === -1) {
            // YARD
            const colorKey = playerId === 'p1' ? 'red' : 'yellow'; 
            const yardArr = LudoBoardData.yards[colorKey] || LudoBoardData.yards.red;
            norm = yardArr[seedSubIndex % yardArr.length];
        } else if (index === 999) {
            // HOME BASE
            norm = LudoBoardData.homeBase;
        } else if (index >= 52) {
            // VICTORY PATH
            const victoryStep = index - 52;
            const colorKey = playerId === 'p1' ? 'red' : 'yellow'; 
            const path = LudoBoardData.victoryPaths[colorKey] || LudoBoardData.victoryPaths.red;
            const safeStep = Math.min(victoryStep, path.length - 1);
            norm = path[safeStep];
        } else {
            // MAIN PATH
            const pathIndex = index % 52; 
            if (LudoBoardData.mainPath[pathIndex]) {
                norm = LudoBoardData.mainPath[pathIndex];
            }
        }

        return {
            x: norm.x * canvasWidth,
            y: norm.y * canvasHeight
        };
    };

    const target = getTargetPixels(currentPos);
    
    const cx = useSharedValue(target.x);
    const cy = useSharedValue(target.y);
    const prevPosRef = useRef(currentPos);

    // 2. STEP-BY-STEP ANIMATION LOGIC
    useEffect(() => {
        const oldPos = prevPosRef.current;
        const newPos = currentPos;
        prevPosRef.current = newPos;

        // Skip animation on first render or screen resize
        if (oldPos === newPos) {
            cx.value = target.x;
            cy.value = target.y;
            return;
        }

        // Case A: Moving Out of House (Direct Jump)
        if (oldPos === -1) {
             cx.value = withTiming(target.x, { duration: 300 });
             cy.value = withTiming(target.y, { duration: 300 });
             return;
        }

        // Case B: Moving to Finish (Direct Jump)
        if (newPos === 999) {
             cx.value = withTiming(target.x, { duration: 500 });
             cy.value = withTiming(target.y, { duration: 500 });
             return;
        }

        // Case C: Moving Step-by-Step on Board
        // We calculate every index between Old and New
        const steps: number[] = [];
        let scanner = oldPos;
        const safetyLimit = 20; // Prevent infinite loops
        let count = 0;

        while (scanner !== newPos && count < safetyLimit) {
            // Logic to find "next tile"
            if (scanner >= 52) {
                // Moving inside victory lane
                scanner++;
            } else {
                // Moving on outer board (Wrap 51 -> 0)
                scanner = (scanner + 1) % 52;
            }
            steps.push(scanner);
            count++;
        }

        if (steps.length > 0) {
            // Create a chain of animations
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
            // Fallback if logic fails
            cx.value = withTiming(target.x, { duration: 300 });
            cy.value = withTiming(target.y, { duration: 300 });
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
                list.push({
                    id: `${playerId}-${index}`,
                    playerId,
                    seedSubIndex: index,
                    currentPos: pos,
                    color
                });
            });
        });
        return list;
    }, [positions]);

    const tapGesture = Gesture.Tap().onEnd(({ x, y }) => {
        if (onBoardPress) {
            runOnJS(onBoardPress)(x, y);
        }
    });

    if (!boardImage) return null;

    return (
        <GestureDetector gesture={tapGesture}>
            <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
                <SkiaImage
                    image={boardImage}
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    fit="fill"
                />
                {seedsData.map((seed) => (
                    <AnimatedSeed
                        key={seed.id}
                        id={seed.id}
                        playerId={seed.playerId}
                        seedSubIndex={seed.seedSubIndex}
                        currentPos={seed.currentPos}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                        color={seed.color}
                        radius={seedRadius}
                    />
                ))}
            </Canvas>
        </GestureDetector>
    );
};
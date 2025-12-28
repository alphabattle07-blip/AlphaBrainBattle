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
    withSequence, 
    Easing, 
    runOnJS 
} from 'react-native-reanimated';
import { LudoBoardData, NormalizedPoint } from './LudoCoordinates';

const boardImageSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');

const BOARD_IMAGE_WIDTH = 1024;
const BOARD_IMAGE_HEIGHT = 1024;
const TILE_ANIMATION_DURATION = 200; 

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
    
    // --- 1. Lookup Coordinates ---
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

    // --- 2. Animation Logic ---
    useEffect(() => {
        const oldPos = prevPosRef.current;
        const newPos = currentPos;
        prevPosRef.current = newPos;

        if (oldPos === newPos) {
            cx.value = target.x;
            cy.value = target.y;
            return;
        }

        // FIX: Updated Turn-Off points to match standard Ludo (Tile BEFORE Start)
        // Red (Start 0) turns at 51. Yellow (Start 26) turns at 25.
        const turnOffPoint = playerId === 'p1' ? 51 : 25; 

        // Direct Jumps
        if (oldPos === -1 || newPos === 999) {
             cx.value = withTiming(target.x, { duration: 400 });
             cy.value = withTiming(target.y, { duration: 400 });
             return;
        }

        // Step-by-Step Pathfinding for Animation
        const steps: number[] = [];
        let scanner = oldPos;
        const safetyLimit = 30;
        let count = 0;

        while (scanner !== newPos && count < safetyLimit) {
            
            // Check if we are at the turn-off point heading into Victory Lane
            if (scanner === turnOffPoint && newPos >= 52) {
                scanner = 52; // Jump into Victory Lane start
            } else if (scanner >= 52) {
                scanner++; // Move forward in Victory Lane
            } else {
                scanner = (scanner + 1) % 52; // Move forward on Main Board
            }
            
            steps.push(scanner);
            count++;
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
            // Fallback
            cx.value = withTiming(target.x, { duration: 300 });
            cy.value = withTiming(target.y, { duration: 300 });
        }

    }, [currentPos, canvasWidth, canvasHeight, playerId]); 

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
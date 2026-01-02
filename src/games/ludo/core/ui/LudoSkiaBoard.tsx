import React, { useMemo, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, Circle, Group, Paint, Shadow } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { LudoBoardData } from './LudoCoordinates';

const boardImageSource = require('../../../../assets/images/ludoBoard.png');
const blueImageSource = require('../../../../assets/images/blue.png');
const greenImageSource = require('../../../../assets/images/green.png');
const redImageSource = require('../../../../assets/images/red.png');
const yellowImageSource = require('../../../../assets/images/yellow.png');

// Normalized positions for color images (center of each yard)
// Adjusted to be outside the board but flush against the edges
const COLOR_IMAGE_POSITIONS = {
    red: { x: 0.1090, y: 0.009 },    // Left side
    green: { x: 0.740, y: 0.00000001 },  // Top side
    yellow: { x: 0.670, y: 0.850 }, // Right side
    blue: { x: 0.0390, y: 0.8650 },   // Bottom side
};

// Configuration for sizes (relative to canvas width)
const BOARD_SCALE = 0.90;      // REDUCED from 0.76 to make room for big images
const SIDE_IMAGE_SCALE = 0.11; // Size of the side images relative to canvas (approx 11%)

const BOARD_IMAGE_WIDTH = 1024;
const BOARD_IMAGE_HEIGHT = 1024;
const TILE_ANIMATION_DURATION = 200;

// Cache paths
const RED_PATH = LudoBoardData.getPathForColor('red');
const YELLOW_PATH = LudoBoardData.getPathForColor('yellow');
const BLUE_PATH = LudoBoardData.getPathForColor('blue');
const GREEN_PATH = LudoBoardData.getPathForColor('green');

const AnimatedSeed = ({ id, playerId, seedSubIndex, currentPos, boardX, boardY, boardSize, color, radius, colorName, canvasWidth, canvasHeight }: { id: string, playerId: string, seedSubIndex: number, currentPos: number, boardX: number, boardY: number, boardSize: number, color: string, radius: number, colorName: 'red' | 'yellow' | 'blue' | 'green', canvasWidth: number, canvasHeight: number }) => {
    const getTargetPixels = (stepIndex: number) => {
        let norm = { x: 0.5, y: 0.5 };

        // Select path based on colorName
        let path = RED_PATH;
        if (colorName === 'yellow') path = YELLOW_PATH;
        else if (colorName === 'blue') path = BLUE_PATH;
        else if (colorName === 'green') path = GREEN_PATH;

        if (stepIndex === -1) {
            const yardArr = LudoBoardData.yards[colorName];
            norm = yardArr[seedSubIndex % 4];
        } else if (stepIndex >= 58) {
            // Use COLOR_IMAGE_POSITIONS for home
            const pos = COLOR_IMAGE_POSITIONS[colorName];
            return {
                x: pos.x * canvasWidth,
                y: pos.y * canvasHeight
            };
        } else {
            if (path[stepIndex]) norm = path[stepIndex];
        }
        return {
            x: boardX + norm.x * boardSize,
            y: boardY + norm.y * boardSize
        };
    };

    const target = getTargetPixels(currentPos);
    const cx = useSharedValue(target.x);
    const cy = useSharedValue(target.y);
    const prevPosRef = useRef(currentPos);

    useEffect(() => {
        const oldPos = prevPosRef.current;
        const newPos = currentPos;
        prevPosRef.current = newPos;

        if (oldPos === newPos) {
            cx.value = target.x;
            cy.value = target.y;
            return;
        }

        if (oldPos === -1 || newPos >= 58) {
            cx.value = withTiming(target.x, { duration: 400 });
            cy.value = withTiming(target.y, { duration: 400 });
            return;
        }

        const steps = [];
        const diff = newPos - oldPos;
        if (diff > 0 && diff <= 6) {
            for (let i = oldPos + 1; i <= newPos; i++) steps.push(i);
        } else {
            steps.push(newPos);
        }

        const xSequence = steps.map(i => withTiming(getTargetPixels(i).x, { duration: TILE_ANIMATION_DURATION, easing: Easing.linear }));
        const ySequence = steps.map(i => withTiming(getTargetPixels(i).y, { duration: TILE_ANIMATION_DURATION, easing: Easing.linear }));
        cx.value = withSequence(...xSequence);
        cy.value = withSequence(...ySequence);

    }, [currentPos, boardX, boardY, boardSize]);

    return (
        <Group>
            <Circle cx={cx} cy={cy} r={radius} color={color}>
                <Paint style="stroke" strokeWidth={1.5} color="white" />
                <Shadow dx={1} dy={2} blur={3} color="rgba(0,0,0,0.5)" />
            </Circle>
        </Group>
    );
};

// Helper to get pixel position for a seed
const getSeedPixelPosition = (seedPos: number, playerId: string, seedSubIndex: number, boardX: number, boardY: number, boardSize: number, colorName: 'red' | 'yellow' | 'blue' | 'green', canvasWidth: number, canvasHeight: number) => {
    let path = RED_PATH;
    if (colorName === 'yellow') path = YELLOW_PATH;
    else if (colorName === 'blue') path = BLUE_PATH;
    else if (colorName === 'green') path = GREEN_PATH;

    let norm = { x: 0.5, y: 0.5 };

    if (seedPos === -1) {
        const yardArr = LudoBoardData.yards[colorName];
        norm = yardArr[seedSubIndex % 4];
    } else if (seedPos >= 58) {
        // Use COLOR_IMAGE_POSITIONS for home
        const pos = COLOR_IMAGE_POSITIONS[colorName];
        return {
            x: pos.x * canvasWidth,
            y: pos.y * canvasHeight
        };
    } else {
        if (path[seedPos]) norm = path[seedPos];
    }
    return {
        x: boardX + norm.x * boardSize,
        y: boardY + norm.y * boardSize
    };
};

export const LudoSkiaBoard = ({ onBoardPress, positions }) => {
    const boardImage = useImage(boardImageSource);
    const blueImage = useImage(blueImageSource);
    const greenImage = useImage(greenImageSource);
    const redImage = useImage(redImageSource);
    const yellowImage = useImage(yellowImageSource);

    const { width } = useWindowDimensions();
    const canvasWidth = width * 0.95;
    const canvasHeight = canvasWidth * 1.2; // Increase height to give more room top/bottom

    // Scale board to make room for outer images
    // Using BOARD_SCALE constant
    const boardSize = canvasWidth * BOARD_SCALE;
    const marginX = (canvasWidth - boardSize) / 2;
    const marginY = (canvasHeight - boardSize) / 2;
    const boardX = marginX;
    const boardY = marginY;

    const seedRadius = (boardSize / 15) * 0.35;

    // Size for colored images attached to the ends
    // Using SIDE_IMAGE_SCALE constant
    const sideImageSize = canvasWidth * SIDE_IMAGE_SCALE;

    const seedsData = useMemo(() => {
        const list: any[] = [];
        Object.entries(positions).forEach(([playerId, seedPositions]) => {
            const isP1 = playerId === 'p1';
            // P1 = Blue (User), P2 = Green (Computer)
            const colorName = isP1 ? 'blue' : 'green';
            const color = isP1 ? '#007AFF' : '#34C759';

            // Cast seedPositions to array
            (seedPositions as number[]).forEach((pos, index) => {
                list.push({
                    id: `${playerId}-${index}`,
                    playerId,
                    seedSubIndex: index,
                    currentPos: pos,
                    color,
                    colorName
                });
            });
        });
        return list;
    }, [positions]);

    // Hit-test function to find which seed was tapped
    const findTappedSeed = (tapX: number, tapY: number) => {
        const hitRadius = seedRadius * 1.5; // Slightly larger for easier tapping

        for (const seed of seedsData) {
            const { x: seedX, y: seedY } = getSeedPixelPosition(
                seed.currentPos,
                seed.playerId,
                seed.seedSubIndex,
                boardX, boardY, boardSize,
                seed.colorName,
                canvasWidth, canvasHeight
            );

            const distance = Math.sqrt(Math.pow(tapX - seedX, 2) + Math.pow(tapY - seedY, 2));
            if (distance <= hitRadius) {
                return {
                    playerId: seed.playerId,
                    seedIndex: seed.seedSubIndex,
                    position: seed.currentPos
                };
            }
        }
        return null;
    };

    const handleTap = (x: number, y: number) => {
        const tappedSeed = findTappedSeed(x, y);
        onBoardPress(x, y, tappedSeed);
    };

    if (!boardImage) return null;

    return (
        <GestureDetector gesture={Gesture.Tap().onEnd(({ x, y }) => runOnJS(handleTap)(x, y))}>
            <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
                <SkiaImage
                    image={boardImage}
                    x={boardX}
                    y={boardY}
                    width={boardSize}
                    height={boardSize}
                    fit="fill"
                />

                {/* 
                  Color images positioned using COLOR_IMAGE_POSITIONS constant.
                  This allows manual tweaking of positions.
                */}

                {/* RED - HIDDEN */}
                {/* {redImage && (
                    <SkiaImage
                        image={redImage}
                        x={COLOR_IMAGE_POSITIONS.red.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.red.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize * 3}
                        height={sideImageSize * 2.5}
                        fit="contain"
                    />
                )} */}

                {/* GREEN */}
                {greenImage && (
                    <SkiaImage
                        image={greenImage}
                        x={COLOR_IMAGE_POSITIONS.green.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.green.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize * 3}
                        height={sideImageSize * 2.5}
                        fit="contain"
                    />
                )}

                {/* YELLOW - HIDDEN */}
                {/* {yellowImage && (
                    <SkiaImage
                        image={yellowImage}
                        x={COLOR_IMAGE_POSITIONS.yellow.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.yellow.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize * 3}
                        height={sideImageSize * 2.5}
                        fit="contain"
                    />
                )} */}

                {/* BLUE */}
                {blueImage && (
                    <SkiaImage
                        image={blueImage}
                        x={COLOR_IMAGE_POSITIONS.blue.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.blue.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize * 3}
                        height={sideImageSize * 2.5}
                        fit="contain"
                    />
                )}

                {seedsData.map(s => (
                    <AnimatedSeed
                        key={s.id}
                        {...s}
                        boardX={boardX}
                        boardY={boardY}
                        boardSize={boardSize}
                        radius={seedRadius}
                        colorName={s.colorName}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                    />
                ))}
            </Canvas>
        </GestureDetector>
    );
};
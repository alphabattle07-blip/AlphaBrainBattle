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
    red: { x: 0.160, y: 0.1 },    // Left side
    green: { x: 0.85, y: 0.1 },  // Top side
    yellow: { x: 0.850, y: 0.9 }, // Right side
    blue: { x: 0.160, y: 0.900 },   // Bottom side
};

// Configuration for sizes (relative to canvas width)
const BOARD_SCALE = 0.76;      // Size of the board relative to canvas (0.76 = 76%)
const SIDE_IMAGE_SCALE = 0.11; // Size of the side images relative to canvas (approx 11%)

const BOARD_IMAGE_WIDTH = 1024;
const BOARD_IMAGE_HEIGHT = 1024;
const TILE_ANIMATION_DURATION = 200;

// Cache paths
const RED_PATH = LudoBoardData.getPathForColor('red');
const YELLOW_PATH = LudoBoardData.getPathForColor('yellow');

const AnimatedSeed = ({ id, playerId, seedSubIndex, currentPos, boardX, boardY, boardSize, color, radius }: { id: string, playerId: string, seedSubIndex: number, currentPos: number, boardX: number, boardY: number, boardSize: number, color: string, radius: number }) => {
    const getTargetPixels = (stepIndex: number) => {
        let norm = { x: 0.5, y: 0.5 };

        // Select path based on color/player
        const isYellow = color === '#FFCC00' || color === 'yellow' || playerId === 'p2';
        const path = isYellow ? YELLOW_PATH : RED_PATH;

        if (stepIndex === -1) {
            const yardKey = isYellow ? 'yellow' : 'red';
            const yardArr = LudoBoardData.yards[yardKey];
            norm = yardArr[seedSubIndex % 4];
        } else if (stepIndex >= 58) {
            norm = LudoBoardData.homeBase;
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
const getSeedPixelPosition = (seedPos: number, playerId: string, seedSubIndex: number, boardX: number, boardY: number, boardSize: number) => {
    const isYellow = playerId === 'p2';
    const path = isYellow ? YELLOW_PATH : RED_PATH;
    let norm = { x: 0.5, y: 0.5 };

    if (seedPos === -1) {
        const yardKey = isYellow ? 'yellow' : 'red';
        const yardArr = LudoBoardData.yards[yardKey];
        norm = yardArr[seedSubIndex % 4];
    } else if (seedPos >= 58) {
        norm = LudoBoardData.homeBase;
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
    const canvasHeight = canvasWidth;

    // Scale board to make room for outer images
    // Using BOARD_SCALE constant
    const boardSize = canvasWidth * BOARD_SCALE;
    const margin = (canvasWidth - boardSize) / 2;
    const boardX = margin;
    const boardY = margin;

    const seedRadius = (boardSize / 15) * 0.35;

    // Size for colored images attached to the ends
    // Using SIDE_IMAGE_SCALE constant
    const sideImageSize = canvasWidth * SIDE_IMAGE_SCALE;

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

    // Hit-test function to find which seed was tapped
    const findTappedSeed = (tapX: number, tapY: number) => {
        const hitRadius = seedRadius * 1.5; // Slightly larger for easier tapping

        for (const seed of seedsData) {
            const { x: seedX, y: seedY } = getSeedPixelPosition(
                seed.currentPos,
                seed.playerId,
                seed.seedSubIndex,
                boardX, boardY, boardSize
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

                {/* RED */}
                {redImage && (
                    <SkiaImage
                        image={redImage}
                        x={COLOR_IMAGE_POSITIONS.red.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.red.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize}
                        height={sideImageSize}
                        fit="contain"
                    />
                )}

                {/* GREEN */}
                {greenImage && (
                    <SkiaImage
                        image={greenImage}
                        x={COLOR_IMAGE_POSITIONS.green.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.green.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize}
                        height={sideImageSize}
                        fit="contain"
                    />
                )}

                {/* YELLOW */}
                {yellowImage && (
                    <SkiaImage
                        image={yellowImage}
                        x={COLOR_IMAGE_POSITIONS.yellow.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.yellow.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize}
                        height={sideImageSize}
                        fit="contain"
                    />
                )}

                {/* BLUE */}
                {blueImage && (
                    <SkiaImage
                        image={blueImage}
                        x={COLOR_IMAGE_POSITIONS.blue.x * canvasWidth - sideImageSize / 2}
                        y={COLOR_IMAGE_POSITIONS.blue.y * canvasHeight - sideImageSize / 2}
                        width={sideImageSize}
                        height={sideImageSize}
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
                    />
                ))}
            </Canvas>
        </GestureDetector>
    );
};
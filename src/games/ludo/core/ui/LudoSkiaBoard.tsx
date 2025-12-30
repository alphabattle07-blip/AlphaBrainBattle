import React, { useMemo, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, Circle, Group, Paint, Shadow } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { LudoBoardData } from './LudoCoordinates';

const boardImageSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');
const BOARD_IMAGE_WIDTH = 1024;
const BOARD_IMAGE_HEIGHT = 1024;
const TILE_ANIMATION_DURATION = 200; 

// Cache paths
const RED_PATH = LudoBoardData.getPathForColor('red');
const YELLOW_PATH = LudoBoardData.getPathForColor('yellow');

const AnimatedSeed = ({ id, playerId, seedSubIndex, currentPos, canvasWidth, canvasHeight, color, radius }) => {
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

    }, [currentPos, canvasWidth, canvasHeight]);

    return (
        <Group>
            <Circle cx={cx} cy={cy} r={radius} color={color}>
                 <Paint style="stroke" strokeWidth={1.5} color="white" />
                 <Shadow dx={1} dy={2} blur={3} color="rgba(0,0,0,0.5)" />
            </Circle>
        </Group>
    );
};

export const LudoSkiaBoard = ({ onBoardPress, positions }) => {
    const boardImage = useImage(boardImageSource);
    const { width } = useWindowDimensions();
    const canvasWidth = width * 0.95; 
    const canvasHeight = canvasWidth; 
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

    if (!boardImage) return null;

    return (
        <GestureDetector gesture={Gesture.Tap().onEnd(({x, y}) => runOnJS(onBoardPress)(x, y))}>
            <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
                <SkiaImage image={boardImage} x={0} y={0} width={canvasWidth} height={canvasHeight} fit="fill" />
                {seedsData.map(s => <AnimatedSeed key={s.id} {...s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} radius={seedRadius} />)}
            </Canvas>
        </GestureDetector>
    );
};
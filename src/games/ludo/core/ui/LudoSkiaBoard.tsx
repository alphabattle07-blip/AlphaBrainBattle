// LudoSkiaBoard.tsx
import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
    Canvas,
    Image as SkiaImage,
    useImage,
    Circle,
    Group,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MAIN_PATH_COORDS, YARD_COORDS } from "./LudoBoardLayout"; // Import the layout

// Placeholder image path - make sure this is correct in your project
const boardImageSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');

interface LudoSkiaBoardProps {
    onBoardPress?: (x: number, y: number) => void;
    // Map of playerId -> Array of positions [posSeed1, posSeed2...]
    positions: { [key: string]: number[] }; 
}

const GRID_SIZE = 15;

export const LudoSkiaBoard: React.FC<LudoSkiaBoardProps> = ({ onBoardPress, positions }) => {
    const boardImage = useImage(boardImageSource);
    const { width: screenWidth } = useWindowDimensions();

    const BOARD_IMAGE_WIDTH = 1024;
    const BOARD_IMAGE_HEIGHT = 1024;
    const BOARD_ASPECT_RATIO = BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT;

    const canvasWidth = screenWidth * 0.95;
    const canvasHeight = canvasWidth / BOARD_ASPECT_RATIO;
    const cellSize = canvasWidth / GRID_SIZE;
    const seedRadius = cellSize * 0.35;

    // Helper to get X,Y from logic position
    const getCoordinates = (playerId: string, seedIndex: number, logicPos: number) => {
        let gx = 0, gy = 0;

        // 1. House/Yard (-1)
        if (logicPos === -1) {
            // Determine color from ID (assuming id is 'p1', 'p2' or logic handles mapping)
            // Ideally, pass color explicitly, but let's guess based on standard setup
            // p1 = Red (Top Left), p2 = Yellow (Bottom Right) usually in 2 player
            const isP1 = playerId === 'p1'; 
            const yardKey = isP1 ? 'red' : 'yellow'; 
            
            // Fallback for yard coords if 4+ players implemented later
            const coords = YARD_COORDS[yardKey] || YARD_COORDS['red'];
            gx = coords[seedIndex].x;
            gy = coords[seedIndex].y;
        } 
        // 2. Finished (999)
        else if (logicPos === 999) {
            gx = 7; gy = 7; // Center
        } 
        // 3. On Board (0-51)
        else {
            const index = logicPos % 52; // Ensure wrapping
            if (MAIN_PATH_COORDS[index]) {
                gx = MAIN_PATH_COORDS[index].x;
                gy = MAIN_PATH_COORDS[index].y;
            }
        }

        return {
            x: (gx + 0.5) * cellSize, // Center in cell
            y: (gy + 0.5) * cellSize
        };
    };

    // Calculate visual seeds based on props
    const renderableSeeds = useMemo(() => {
        const seeds: any[] = [];
        
        Object.entries(positions).forEach(([playerId, seedPositions]) => {
            const isP1 = playerId === 'p1';
            const color = isP1 ? '#FF3B30' : '#FFCC00'; // Red vs Yellow

            seedPositions.forEach((pos, index) => {
                const { x, y } = getCoordinates(playerId, index, pos);
                seeds.push({
                    id: `${playerId}-${index}`,
                    x,
                    y,
                    color,
                    pos // store logic pos for debugging
                });
            });
        });
        return seeds;
    }, [positions, cellSize]);

    const tapGesture = Gesture.Tap().onEnd(({ x, y }) => {
        if (onBoardPress) onBoardPress(x, y);
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
                    fit="contain"
                />

                {renderableSeeds.map((seed) => (
                    <Group key={seed.id}>
                        <Circle cx={seed.x} cy={seed.y} r={seedRadius} color="white" style="stroke" strokeWidth={2} />
                        <Circle cx={seed.x} cy={seed.y} r={seedRadius} color={seed.color} />
                        {/* Add number or indicator if stacked? For now just simple circle */}
                    </Group>
                ))}
            </Canvas>
        </GestureDetector>
    );
};
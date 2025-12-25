// LudoBoardLayout.ts

// Represents Grid X,Y (0 to 14)
type Point = { x: number; y: number };

// The main loop (0-51) coordinates. 
// This assumes a standard Ludo path starting from the cell just out of the Red house, 
// moving clockwise.
// NOTE: You may need to tweak these specific X,Y values to match your specific background image.
export const MAIN_PATH_COORDS: Point[] = [
    // Red Start Strip (moving right)
    { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
    // Up the strip
    { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
    // Middle Top (Turn)
    { x: 7, y: 0 }, { x: 8, y: 0 },
    // Down the strip (Green side)
    { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
    // Right strip
    { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
    // Middle Right (Turn)
    { x: 14, y: 7 }, { x: 14, y: 8 },
    // Left strip (Yellow side)
    { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
    // Down the strip
    { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
    // Middle Bottom (Turn)
    { x: 7, y: 14 }, { x: 6, y: 14 },
    // Up the strip (Blue side)
    { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
    // Left strip
    { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
    // Middle Left (Turn back to start)
    { x: 0, y: 7 }, { x: 0, y: 6 } // This wraps back to index 0 logically
];

// If a player enters their victory run (not fully implemented in your logic yet, but good to have)
export const HOME_RUN_COORDS = {
    red: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
    yellow: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
    // Add Green/Blue if needed
};

// House/Yard Base Coordinates
export const YARD_COORDS: Record<string, Point[]> = {
    red: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }],
    yellow: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 }],
    // Green/Blue...
};
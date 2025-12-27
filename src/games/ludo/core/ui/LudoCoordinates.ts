// LudoCoordinates.ts

export type NormalizedPoint = { x: number; y: number };

// Helper to rotate points for other colors based on your Red mapping
const rotate = (p: NormalizedPoint, angle: number): NormalizedPoint => {
    // Rotating around the visual center (approx 0.5, 0.5)
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = p.x - 0.5;
    const dy = p.y - 0.5;
    return {
        x: parseFloat((0.5 + (dx * cos - dy * sin)).toFixed(4)),
        y: parseFloat((0.5 + (dx * sin + dy * cos)).toFixed(4))
    };
};

// --- YOUR MAPPED DATA (Cleaned & Smoothed) ---
// I aligned your "Red Victory" taps to a straight line (Y=0.475)
const RED_VICTORY_PATH = [
    {"x":0.0677, "y":0.475}, // Start of victory run
    {"x":0.1317, "y":0.475},
    {"x":0.2037, "y":0.475},
    {"x":0.2713, "y":0.475},
    {"x":0.3435, "y":0.475},
    {"x":0.3931, "y":0.475},
    {"x":0.4400, "y":0.475}  // Final spot before center
];

export const LudoBoardData = {
    // YOUR 52 POINTS (Smoothed for straight lines)
    mainPath: [
        // 1. Red Lane (Moving Right) -> Snapped Y to 0.423
        {"x":0.1505,"y":0.420}, {"x":0.2106,"y":0.420}, {"x":0.2674,"y":0.420}, {"x":0.3255,"y":0.420}, {"x":0.3813,"y":0.420},
        
        // 2. Up towards Green -> Snapped X to 0.447
        {"x":0.440,"y":0.3616}, {"x":0.440,"y":0.3082}, {"x":0.440,"y":0.2518}, {"x":0.440,"y":0.1956}, {"x":0.440,"y":0.1412}, {"x":0.440,"y":0.0854},
        
        // 3. Top Turn
        {"x":0.4991,"y":0.0869}, {"x":0.5570,"y":0.0853},
        
        // 4. Down from Green -> Snapped X to 0.5570
        {"x":0.5570,"y":0.1389}, {"x":0.5570,"y":0.1969}, {"x":0.5570,"y":0.2521}, {"x":0.5570,"y":0.3079}, {"x":0.5570,"y":0.364},
        
        // 5. Right towards Yellow -> Snapped Y to 0.427
        {"x":0.6149,"y":0.421}, {"x":0.6707,"y":0.421}, {"x":0.7299,"y":0.421}, {"x":0.789,"y":0.421}, {"x":0.848,"y":0.421}, {"x":0.9099,"y":0.421},
        
        // 6. Right Turn
        {"x":0.9099,"y":0.4770}, {"x":0.9099,"y":0.5348},
        
        // 7. Left from Yellow -> Snapped Y to 0.535
        {"x":0.8484,"y":0.535}, {"x":0.7898,"y":0.535}, {"x":0.7301,"y":0.535}, {"x":0.6707,"y":0.535}, {"x":0.6149,"y":0.535},
        
        // 8. Down towards Blue -> Snapped X to 0.570
        {"x":0.557,"y":0.5905}, {"x":0.557  ,"y":0.6452}, {"x":0.557,"y":0.6999}, {"x":0.557,"y":0.7546}, {"x":0.557,"y":0.8063}, {"x":0.557,"y":0.859},
        
        // 9. Bottom Turn d
        {"x":0.557,"y":0.9099}, {"x":0.4974,"y":0.9130},
        
        // 10. Up from Blue -> Snapped X to 0.445
        {"x":0.439,"y":0.9130}, {"x":0.439,"y":0.8583}, {"x":0.439,"y":0.8063}, {"x":0.439,"y":0.7546}, {"x":0.439,"y":0.7001}, {"x":0.439,"y":0.6449}, {"x":0.439,"y":0.5899},
        
        // 11. Left towards Red -> Snapped Y to 0.534
        {"x":0.3822,"y":0.534}, {"x":0.3245,"y":0.534}, {"x":0.2666,"y":0.534}, {"x":0.2086,"y":0.534}, {"x":0.1491,"y":0.534}, {"x":0.0873,"y":0.534}
    ] as NormalizedPoint[],

    // Victory Paths (Mathematically generated from your Red path)
    victoryPaths: {
        red: RED_VICTORY_PATH,
        green: RED_VICTORY_PATH.map(p => rotate(p, 90)),   // Top
        yellow: RED_VICTORY_PATH.map(p => rotate(p, 180)), // Right
        blue: RED_VICTORY_PATH.map(p => rotate(p, 270)),   // Bottom
    } as Record<string, NormalizedPoint[]>,

    // Yards (Based on standard Ludo positioning, adjusted slightly for your scale)
    yards: {
        red:    [{x:0.18, y:0.18}, {x:0.25, y:0.18}, {x:0.18, y:0.25}, {x:0.25, y:0.25}],
        green:  [{x:0.75, y:0.18}, {x:0.82, y:0.18}, {x:0.75, y:0.25}, {x:0.82, y:0.25}],
        yellow: [{x:0.75, y:0.75}, {x:0.82, y:0.75}, {x:0.75, y:0.82}, {x:0.82, y:0.82}],
        blue:   [{x:0.18, y:0.75}, {x:0.25, y:0.75}, {x:0.18, y:0.82}, {x:0.25, y:0.82}],
    } as Record<string, NormalizedPoint[]>,

    homeBase: { x: 0.500, y: 0.500 } as NormalizedPoint
};
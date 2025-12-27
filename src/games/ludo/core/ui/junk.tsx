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
        {"x":0.1505,"y":0.390}, {"x":0.2006,"y":0.423}, {"x":0.2774,"y":0.423}, {"x":0.3425,"y":0.423}, {"x":0.4013,"y":0.423},
        
        // 2. Up towards Green -> Snapped X to 0.447
        {"x":0.447,"y":0.3616}, {"x":0.447,"y":0.3222}, {"x":0.447,"y":0.2548}, {"x":0.447,"y":0.1926}, {"x":0.447,"y":0.1492}, {"x":0.447,"y":0.0904},
        
        // 3. Top Turn
        {"x":0.5021,"y":0.0869}, {"x":0.5609,"y":0.0738},
        
        // 4. Down from Green -> Snapped X to 0.568
        {"x":0.568,"y":0.1252}, {"x":0.568,"y":0.2023}, {"x":0.568,"y":0.2651}, {"x":0.568,"y":0.3159}, {"x":0.568,"y":0.377},
        
        // 5. Right towards Yellow -> Snapped Y to 0.427
        {"x":0.6169,"y":0.427}, {"x":0.6927,"y":0.427}, {"x":0.7519,"y":0.427}, {"x":0.805,"y":0.427}, {"x":0.8608,"y":0.427}, {"x":0.9279,"y":0.427},
        
        // 6. Right Turn
        {"x":0.9297,"y":0.4707}, {"x":0.9135,"y":0.5438},
        
        // 7. Left from Yellow -> Snapped Y to 0.535
        {"x":0.8521,"y":0.535}, {"x":0.7858,"y":0.535}, {"x":0.7351,"y":0.535}, {"x":0.6593,"y":0.535}, {"x":0.6072,"y":0.535},
        
        // 8. Down towards Blue -> Snapped X to 0.570
        {"x":0.570,"y":0.5935}, {"x":0.570,"y":0.6552}, {"x":0.570,"y":0.7077}, {"x":0.570,"y":0.7625}, {"x":0.570,"y":0.8076}, {"x":0.570,"y":0.859},
        
        // 9. Bottom Turn
        {"x":0.5627,"y":0.9099}, {"x":0.4974,"y":0.9162},
        
        // 10. Up from Blue -> Snapped X to 0.445
        {"x":0.445,"y":0.8613}, {"x":0.445,"y":0.7871}, {"x":0.445,"y":0.746}, {"x":0.445,"y":0.7031}, {"x":0.445,"y":0.6449}, {"x":0.445,"y":0.5969},
        
        // 11. Left towards Red -> Snapped Y to 0.528
        {"x":0.3792,"y":0.528}, {"x":0.3245,"y":0.528}, {"x":0.2736,"y":0.528}, {"x":0.2155,"y":0.528}, {"x":0.1531,"y":0.528}, {"x":0.0783,"y":0.528}
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
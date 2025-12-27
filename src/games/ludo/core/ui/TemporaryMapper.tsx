// TemporaryMapper.tsx
import React, { useState } from 'react';
import { useWindowDimensions, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Canvas, Image, useImage, Circle, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// CHECK YOUR IMAGE PATH
const boardSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');

export const BoardMapper = () => {
    const boardImage = useImage(boardSource);
    const { width: screenWidth } = useWindowDimensions();
    
    // Calculate aspect ratio exactly like the final board will
    const IMAGE_WIDTH = 1024; 
    const IMAGE_HEIGHT = 1024;
    const canvasWidth = screenWidth * 0.95;
    const canvasHeight = canvasWidth * (IMAGE_HEIGHT / IMAGE_WIDTH);

    const [points, setPoints] = useState<{x: number, y: number}[]>([]);

    const handleTap = (x: number, y: number) => {
        // Calculate normalized coordinates (0.0 to 1.0) based on the CANVAS size
        const normX = parseFloat((x / canvasWidth).toFixed(4));
        const normY = parseFloat((y / canvasHeight).toFixed(4));
        
        const newPoint = { x: normX, y: normY };
        const newArray = [...points, newPoint];
        setPoints(newArray);
        
        console.log("--- COPY THE ARRAY BELOW ---");
        console.log(JSON.stringify(newArray));
    };

    const tap = Gesture.Tap().onEnd((e) => {
        // Only accept taps inside the board area
        if (e.x <= canvasWidth && e.y <= canvasHeight) {
            runOnJS(handleTap)(e.x, e.y);
        }
    });

    if(!boardImage) return <Text>Loading Image...</Text>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.text}>
                Tap tiles in order (0 to 51). {'\n'}
                Current Count: {points.length}
            </Text>
            
            <GestureDetector gesture={tap}>
                <View style={{ width: canvasWidth, height: canvasHeight, borderColor: 'red', borderWidth: 1 }}>
                    <Canvas style={{ flex: 1 }}>
                        <Image image={boardImage} x={0} y={0} width={canvasWidth} height={canvasHeight} fit="fill" />
                        {points.map((p, i) => (
                            <Circle key={i} cx={p.x * canvasWidth} cy={p.y * canvasHeight} r={4} color="#00FF00" />
                        ))}
                    </Canvas>
                </View>
            </GestureDetector>

            <TouchableOpacity style={styles.btn} onPress={() => setPoints([])}>
                <Text style={styles.btnText}>RESET / CLEAR</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', paddingTop: 40, backgroundColor: '#000' },
    text: { color: 'white', fontSize: 16, marginBottom: 10, textAlign: 'center' },
    btn: { marginTop: 20, padding: 15, backgroundColor: 'red', borderRadius: 8 },
    btnText: { color: 'white', fontWeight: 'bold' }
});
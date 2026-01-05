// Ludo3DDie
import React, { useMemo } from 'react';
import {
    Canvas,
    RoundedRect,
    LinearGradient,
    vec,
    Circle,
    Group,
    Shadow,
} from '@shopify/react-native-skia';
import { ViewStyle, View } from 'react-native';
import { useSharedValue, withSequence, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import { useEffect } from 'react';

interface Ludo3DDieProps {
    value: number;
    size?: number;
    isUsed?: boolean;
    style?: ViewStyle;
}

export const Ludo3DDie: React.FC<Ludo3DDieProps> = ({
    value,
    size = 40,
    isUsed = false,
    style,
}) => {
    const r = size * 0.18; // Slightly rounder
    const pipRadius = size * 0.11;
    const padding = size * 0.22;

    // Animation Values
    const bounce = useSharedValue(0);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Trigger hopping when value changes to a new valid number
        if (value > 0) {
            bounce.value = withSequence(
                withTiming(-size * 0.4, { duration: 150, easing: Easing.out(Easing.quad) }),
                withTiming(0, { duration: 250, easing: Easing.bounce })
            );
            rotation.value = withSequence(
                withTiming(Math.PI / 8, { duration: 150 }),
                withTiming(0, { duration: 150 })
            );
        }
    }, [value, size]);

    const transform = useDerivedValue(() => [
        { translateY: bounce.value },
        { rotate: rotation.value }
    ]);

    // Pip positions logic (Standard D6)
    const pips = useMemo(() => {
        const center = size / 2;
        const left = padding;
        const right = size - padding;
        const top = padding;
        const bottom = size - padding;

        const positions: { cx: number; cy: number }[] = [];
        const add = (cx: number, cy: number) => positions.push({ cx, cy });

        switch (value) {
            case 1:
                add(center, center);
                break;
            case 2:
                add(left, bottom); add(right, top);
                break;
            case 3:
                add(left, bottom); add(center, center); add(right, top);
                break;
            case 4:
                add(left, top); add(right, top);
                add(left, bottom); add(right, bottom);
                break;
            case 5:
                add(left, top); add(right, top);
                add(center, center);
                add(left, bottom); add(right, bottom);
                break;
            case 6:
                add(left, top); add(right, top);
                add(left, center); add(right, center);
                add(left, bottom); add(right, bottom);
                break;
        }
        return positions;
    }, [value, size, padding]);

    // Colors for Glossy White Die
    const startColor = isUsed ? '#d6d6d6' : '#ffffff';
    const endColor = isUsed ? '#a8a8a8' : '#e0e0e0';
    const pipColor = isUsed ? 'rgba(0,0,0,0.4)' : 'black';

    return (
        <View style={[{ width: size, height: size }, style]}>
            <Canvas style={{ flex: 1 }}>
                {/* Drop Shadow */}
                <RoundedRect x={2} y={3} width={size - 4} height={size - 4} r={r} color="rgba(0,0,0,0.2)">
                    <Shadow dx={0} dy={2} blur={4} color="rgba(0,0,0,0.3)" />
                </RoundedRect>

                {/* Body */}
                <Group transform={transform} origin={{ x: size / 2, y: size / 2 }}>
                    <RoundedRect x={0} y={0} width={size - 1} height={size - 1} r={r}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(size, size)}
                            colors={[startColor, endColor]}
                        />
                        {/* Inner Bevel Highlight */}
                        <Shadow dx={-1} dy={-1} blur={2} color="white" inner />
                        <Shadow dx={2} dy={2} blur={3} color="rgba(0,0,0,0.2)" inner />
                    </RoundedRect>

                    {/* Pips */}
                    {pips.map((p, i) => (
                        <Group key={i}>
                            <Circle cx={p.cx} cy={p.cy} r={pipRadius} color={pipColor}>
                                {/* Engraved Effect */}
                                <Shadow dx={0} dy={1} blur={0.5} color="rgba(255,255,255,0.5)" />
                                <Shadow dx={0} dy={-0.5} blur={1} color="black" inner />
                            </Circle>
                        </Group>
                    ))}
                </Group>
            </Canvas>
        </View>
    );
};

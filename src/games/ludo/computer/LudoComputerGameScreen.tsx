// LudoComputerGameScreen.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';


import { LudoCoreUI } from '../core/ui/LudoCoreUI'; // Assuming you saved that component here

const LudoComputerGameScreen = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Ludo vs Computer</Text>
            </View>
            
            {/* The Game Component */}
            <LudoCoreUI 
                level={2} // AI Level
                player={{ name: "You", isAI: false }}
                opponent={{ name: "CPU", isAI: true }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    title: {
        color: '#FFD700',
        fontSize: 24,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2
    }
});

export default LudoComputerGameScreen;
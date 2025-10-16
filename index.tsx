import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import { ImageBackground } from 'expo-image';
import { useRouter } from 'expo-router';

const futuristicFont = 'SpaceMono-Regular';

export default function SplashScreen() {
  const pulseAnimation = new Animated.Value(1);
  const router = useRouter();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 10000);

    return () => clearTimeout(timer);
  }, [pulseAnimation, router]);

  return (
    <ImageBackground
      source={require('@/assets/images/splash-bg.png')}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <Animated.View style={[styles.loadingIcon, { transform: [{ scale: pulseAnimation }] }]} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  loadingText: {
    fontFamily: futuristicFont,
    fontSize: 24,
    color: '#fff',
    letterSpacing: 2,
  },
});

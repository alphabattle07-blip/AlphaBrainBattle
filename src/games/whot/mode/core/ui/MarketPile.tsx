// MarketPile.tsx
import React from 'react';
import { Group, type SkFont } from '@shopify/react-native-skia';
import { WhotCardBack } from './WhotCardBack';
import { CARD_WIDTH, CARD_HEIGHT, Card } from './WhotCardTypes';
import { getCoords } from '../coordinateHelper';

interface MarketPileProps {
    cards: Card[];
    // ✅ Accept fonts as props
    font: SkFont | null;
    smallFont: SkFont | null;
}

export const MarketPile = ({ cards, font, smallFont }: MarketPileProps) => {
    // ❌ We no longer load fonts here

    if (cards.length === 0) {
        return null;
    }

    const marketPos = getCoords('market');
    const x = marketPos.x - CARD_WIDTH / 2;
    const y = marketPos.y - CARD_HEIGHT / 2;

    return (
        <Group transform={[{ translateX: x }, { translateY: y }]}>
            {cards.map((card, index) => (
                <Group key={card.id} transform={[{ translateY: index * 0.4 }]}>
                    {/* ✅ Pass fonts to each card back */}
                    <WhotCardBack 
                        width={CARD_WIDTH} 
                        height={CARD_HEIGHT} 
                        font={font} 
                        smallFont={smallFont} 
                    />
                </Group>
            ))}
        </Group>
    );
};
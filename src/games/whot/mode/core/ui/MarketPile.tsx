// MarketPile.tsx

import React from 'react';
import { Group } from '@shopify/react-native-skia';
import { WhotCardBack } from './WhotCardBack';
import { CARD_WIDTH, CARD_HEIGHT, Card } from './WhotCardTypes';
import { getCoords } from '../coordinateHelper';

interface MarketPileProps {
    cards: Card[];
}

export const MarketPile = ({ cards }: MarketPileProps) => {
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
                    <WhotCardBack width={CARD_WIDTH} height={CARD_HEIGHT} />
                </Group>
            ))}
        </Group>
    );
};
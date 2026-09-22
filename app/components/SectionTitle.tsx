import React from 'react';
import { Text, View } from 'react-native';
import { C } from '../constants/theme';
import { MotionPressable } from './MotionPressable';

export function SectionTitle({ title, action = 'See all', onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 }}>
    <Text style={{ fontSize: 20, fontWeight: '900', color: C.ink }}>{title}</Text>
    <MotionPressable onPress={onPress} disabled={!onPress} hitSlop={10}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: onPress ? C.plum : C.muted }}>{action}</Text>
    </MotionPressable>
  </View>;
}

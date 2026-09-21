import React from 'react';
import { ImageSourcePropType, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../constants/theme';
import { MotionPressable } from './MotionPressable';

type BannerImage = ImageSourcePropType | string;

export function CurvedBanner({ image, title, subtitle, tag = 'JUST IN', color = C.pink, imageFit = 'cover', onPress }: { image: BannerImage; title: string; subtitle: string; tag?: string; color?: string; imageFit?: 'cover' | 'contain'; onPress?: () => void }) {
  const source = typeof image === 'string' ? { uri: image } : image;
  return <MotionPressable onPress={onPress} contentStyle={{ flex: 1 }} style={{ height: 250, backgroundColor: color, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
    <Image source={source} cachePolicy="memory-disk" contentFit={imageFit} style={{ position: 'absolute', right: imageFit === 'contain' ? -8 : -20, bottom: 0, width: imageFit === 'contain' ? '60%' : '62%', height: imageFit === 'contain' ? '96%' : '100%', opacity: 0.96 }} />
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '61%', padding: 22, justifyContent: 'center' }}>
      <View style={{ alignSelf: 'flex-start', backgroundColor: C.ink, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{tag}</Text></View>
      <Text style={{ fontSize: 27, lineHeight: 29, fontWeight: '900', color: C.ink, marginTop: 13 }}>{title}</Text>
      <Text style={{ fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 8, color: C.ink }}>{subtitle}</Text>
    </View>
    <View style={{ position: 'absolute', right: 16, bottom: 15, backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 }}><Text style={{ fontWeight: '900', fontSize: 11 }}>Explore →</Text></View>
  </MotionPressable>;
}
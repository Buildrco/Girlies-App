import React from 'react';
import { ImageSourcePropType, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../constants/theme';
import { MotionPressable } from './MotionPressable';

type BannerImage = ImageSourcePropType | string;

type CurvedBannerProps = { image: BannerImage; title: string; subtitle: string; tag?: string; color?: string; imageFit?: 'cover' | 'contain'; layout?: 'split' | 'stacked'; buttonLabel?: string; onPress?: () => void };

export function CurvedBanner({ image, title, subtitle, tag = 'JUST IN', color = C.pink, imageFit = 'cover', layout = 'split', buttonLabel = 'Explore →', onPress }: CurvedBannerProps) {
  const source = typeof image === 'string' ? { uri: image } : image;
  if (layout === 'stacked') {
    return <MotionPressable onPress={onPress} contentStyle={{ flex: 1 }} style={{ height: 405, backgroundColor: color, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
      <View style={{ height: 214, backgroundColor: '#FFFFFF55', overflow: 'hidden' }}><Image source={source} cachePolicy="memory-disk" contentFit={imageFit} style={{ width: '100%', height: '100%' }} /></View>
      <View style={{ flex: 1, padding: 22, justifyContent: 'center' }}><Text style={{ color: C.ink, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }}>{tag}</Text><Text style={{ fontSize: 28, lineHeight: 30, fontWeight: '900', color: C.ink, marginTop: 10 }}>{title}</Text><Text style={{ fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 8, color: C.ink }}>{subtitle}</Text><View style={{ alignSelf: 'flex-start', backgroundColor: C.ink, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 22, marginTop: 14 }}><Text style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>{buttonLabel}</Text></View></View>
    </MotionPressable>;
  }
  return <MotionPressable onPress={onPress} contentStyle={{ flex: 1 }} style={{ height: 250, backgroundColor: color, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
    <Image source={source} cachePolicy="memory-disk" contentFit={imageFit} style={{ position: 'absolute', right: imageFit === 'contain' ? -8 : -20, bottom: 0, width: imageFit === 'contain' ? '60%' : '62%', height: imageFit === 'contain' ? '96%' : '100%', opacity: 0.96 }} />
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '61%', padding: 22, justifyContent: 'center' }}><View style={{ alignSelf: 'flex-start', backgroundColor: C.ink, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{tag}</Text></View><Text style={{ fontSize: 27, lineHeight: 29, fontWeight: '900', color: C.ink, marginTop: 13 }}>{title}</Text><Text style={{ fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 8, color: C.ink }}>{subtitle}</Text></View>
    <View style={{ position: 'absolute', right: 16, bottom: 15, backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 }}><Text style={{ fontWeight: '900', fontSize: 11 }}>{buttonLabel}</Text></View>
  </MotionPressable>;
}
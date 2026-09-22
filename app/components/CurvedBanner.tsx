import React from 'react';
import { ImageSourcePropType, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../constants/theme';
import { MotionPressable } from './MotionPressable';

type BannerImage = ImageSourcePropType | string;

export function CurvedBanner({ image, title, subtitle, tag = 'JUST IN', color = C.pink, imageFit = 'cover', overlay = false, copySide = 'left', textColor, onPress }: { image: BannerImage; title: string; subtitle: string; tag?: string; color?: string; imageFit?: 'cover' | 'contain'; overlay?: boolean; copySide?: 'left' | 'right'; textColor?: string; onPress?: () => void }) {
  const source = typeof image === 'string' ? { uri: image } : image;
  const copyColor = textColor || C.ink;
  return <MotionPressable onPress={onPress} contentStyle={{ flex: 1 }} style={{ height: 250, backgroundColor: color, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
    <Image source={source} cachePolicy="memory-disk" contentFit={imageFit} style={overlay ? { position: 'absolute', left: 0, right: 0, bottom: -8, width: '100%', height: '78%', opacity: 1 } : { position: 'absolute', right: imageFit === 'contain' ? -8 : -20, bottom: 0, width: imageFit === 'contain' ? '60%' : '62%', height: imageFit === 'contain' ? '96%' : '100%', opacity: 0.96 }} />
    <View style={overlay ? { position: 'absolute', left: copySide === 'right' ? undefined : 0, right: copySide === 'right' ? 0 : undefined, top: 0, width: copySide === 'right' ? '58%' : '100%', height: 96, padding: 16, justifyContent: 'flex-start', alignItems: copySide === 'right' ? 'flex-end' : 'flex-start', backgroundColor: color } : { position: 'absolute', left: 0, top: 0, bottom: 0, width: '61%', padding: 22, justifyContent: 'center' }}>
      <View style={{ alignSelf: 'flex-start', backgroundColor: C.ink, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{tag}</Text></View>
      <Text style={{ fontSize: overlay ? 22 : 27, lineHeight: overlay ? 24 : 29, fontWeight: '900', color: copyColor, marginTop: overlay ? 8 : 13, textAlign: copySide === 'right' ? 'right' : 'left' }}>{title}</Text>
      <Text style={{ fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 5, color: copyColor, textAlign: copySide === 'right' ? 'right' : 'left' }}>{subtitle}</Text>
    </View>
    <View style={{ position: 'absolute', right: 16, bottom: 15, backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 }}><Text style={{ fontWeight: '900', fontSize: 11 }}>Explore →</Text></View>
  </MotionPressable>;
}
import React from 'react';
import { ImageSourcePropType, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../constants/theme';
import { MotionPressable } from './MotionPressable';

type BannerImage = ImageSourcePropType | string;
type CurvedBannerProps = {
  image: BannerImage;
  title: string;
  subtitle: string;
  tag?: string;
  color?: string;
  imageFit?: 'cover' | 'contain';
  overlay?: boolean;
  copyAlign?: 'left' | 'center' | 'right';
  copyTop?: boolean;
  textColor?: string;
  hideCopy?: boolean;
  showTagOnly?: boolean;
  onPress?: () => void;
};

export function CurvedBanner({ image, title, subtitle, tag = 'JUST IN', color = C.pink, imageFit = 'cover', overlay = false, copyAlign = 'left', copyTop = false, textColor, hideCopy = false, showTagOnly = false, onPress }: CurvedBannerProps) {
  const source = typeof image === 'string' ? { uri: image } : image;
  const copyColor = textColor || C.ink;
  const alignItems = copyAlign === 'center' ? 'center' : copyAlign === 'right' ? 'flex-end' : 'flex-start';
  return <MotionPressable onPress={onPress} contentStyle={{ flex: 1 }} style={{ height: 250, backgroundColor: color, borderRadius: 34, overflow: 'hidden', position: 'relative' }}>
    <Image source={source} cachePolicy="memory-disk" contentFit={imageFit} style={overlay ? { position: 'absolute', left: 0, right: 0, top: showTagOnly ? 72 : 96, bottom: 0, width: '100%', opacity: 1 } : { position: 'absolute', right: imageFit === 'contain' ? -8 : -20, bottom: 0, width: imageFit === 'contain' ? '60%' : '62%', height: imageFit === 'contain' ? '96%' : '100%', opacity: 0.96 }} />
    {(!hideCopy || showTagOnly) && <View style={overlay ? { position: 'absolute', left: 0, top: 0, width: '100%', height: showTagOnly ? 72 : 96, padding: 16, paddingTop: 14, justifyContent: 'flex-start', alignItems, backgroundColor: color } : { position: 'absolute', left: 0, top: 0, bottom: 0, width: '61%', padding: 22, paddingTop: 22, justifyContent: 'center' }}>
      {!!tag && <View style={{ alignSelf: copyAlign === 'center' ? 'center' : copyAlign === 'right' ? 'flex-end' : 'flex-start', backgroundColor: C.ink, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{tag}</Text></View>}
      {!showTagOnly && <><Text style={{ fontSize: overlay ? 26 : 27, lineHeight: overlay ? 28 : 29, fontWeight: '900', color: copyColor, marginTop: overlay ? (tag ? 8 : 0) : 13, textAlign: copyAlign }}>{title}</Text>
      <Text style={{ fontSize: overlay ? 13 : 12, lineHeight: overlay ? 17 : 17, fontWeight: '700', marginTop: overlay ? 5 : 8, color: copyColor, textAlign: copyAlign }}>{subtitle}</Text></>}
    </View>}
    <View style={{ position: 'absolute', right: 16, bottom: 15, backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 }}><Text style={{ fontWeight: '900', fontSize: 11 }}>Explore →</Text></View>
  </MotionPressable>;
}
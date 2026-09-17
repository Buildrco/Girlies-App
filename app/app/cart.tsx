import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { useCart } from '../lib/cart';

export default function Cart() {
  const router = useRouter();
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={31} /></Pressable><Text style={s.title}>Your bag</Text><View style={s.count}><Text style={s.countText}>{items.reduce((sum, item) => sum + item.quantity, 0)}</Text></View></View>
      {!items.length ? <View style={s.empty}><View style={s.emptyIcon}><I name="cart" size={32} color={C.pink} filled /></View><Text style={s.emptyTitle}>Your bag is ready</Text><Text style={s.emptyText}>Add something you love from the shop and it will show up here.</Text><Pressable style={s.shopButton} onPress={() => router.replace('/shop')}><Text style={s.shopButtonText}>Browse the shop</Text><I name="arrow" size={17} color="#FFF" /></Pressable></View> :
        <>
          <Text style={s.kicker}>{items.length} {items.length === 1 ? 'item' : 'items'} saved for checkout</Text>
          <View style={s.list}>{items.map(item => <View key={item.id} style={s.item}>
            {item.image ? <Image source={{ uri: item.image }} style={s.image} /> : <View style={[s.image, s.imageFallback]}><I name="bag" size={21} color={C.pink} filled /></View>}
            <View style={s.copy}><Text style={s.itemName} numberOfLines={2}>{item.name}</Text><Text style={s.seller}>{item.seller || 'Girlies seller'}</Text><Text style={s.price}>GH₵ {item.price.toFixed(0)}</Text><View style={s.qty}><Pressable onPress={() => updateQuantity(item.id, item.quantity - 1)} style={s.qtyButton}><Text>−</Text></Pressable><Text style={s.qtyValue}>{item.quantity}</Text><Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)} style={s.qtyButton}><Text>＋</Text></Pressable></View></View>
            <Pressable onPress={() => removeItem(item.id)} style={s.remove}><Text>×</Text></Pressable>
          </View>)}</View>
          <View style={s.summary}><View style={s.row}><Text style={s.muted}>Subtotal</Text><Text style={s.amount}>GH₵ {subtotal.toFixed(0)}</Text></View><View style={s.row}><Text style={s.muted}>Delivery</Text><Text style={s.muted}>Calculated at checkout</Text></View><View style={[s.row, s.totalRow]}><Text style={s.totalLabel}>Total before delivery</Text><Text style={s.total}>GH₵ {subtotal.toFixed(0)}</Text></View></View>
          <Pressable style={s.checkout} onPress={() => router.push({ pathname: '/checkout', params: { productId: items[0].id } })}><I name="cart" size={19} color="#FFF" filled /><Text style={s.checkoutText}>Continue to checkout</Text><I name="arrow" size={18} color="#FFF" /></Pressable>
          <Text style={s.note}>Checkout currently starts with the first item in your bag. Your saved quantities stay ready for the next order.</Text>
        </>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 45 }, top: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 22, fontWeight: '900' }, count: { width: 31, height: 31, borderRadius: 16, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' }, countText: { fontWeight: '900', color: C.plum }, kicker: { color: C.muted, fontSize: 11, fontWeight: '800', marginTop: 17, marginBottom: 10 }, list: { gap: 9 }, item: { minHeight: 112, padding: 11, borderRadius: 24, backgroundColor: '#FFF', flexDirection: 'row', gap: 11, position: 'relative' }, image: { width: 88, height: 92, borderRadius: 18, backgroundColor: C.rose }, imageFallback: { alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, paddingRight: 18 }, itemName: { fontSize: 14, fontWeight: '900', lineHeight: 18 }, seller: { fontSize: 10, color: C.muted, marginTop: 4 }, price: { color: C.pink, fontSize: 14, fontWeight: '900', marginTop: 5 }, qty: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 6 }, qtyButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }, qtyValue: { fontWeight: '900', minWidth: 14, textAlign: 'center' }, remove: { position: 'absolute', top: 9, right: 10, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }, summary: { padding: 17, borderRadius: 24, backgroundColor: '#FFF', marginTop: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }, muted: { color: C.muted, fontSize: 12 }, amount: { fontWeight: '800' }, totalRow: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 8, paddingTop: 13 }, totalLabel: { fontWeight: '900' }, total: { fontSize: 17, fontWeight: '900' }, checkout: { height: 55, borderRadius: 28, backgroundColor: C.ink, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, checkoutText: { color: '#FFF', fontWeight: '900' }, note: { color: C.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 11 }, empty: { alignItems: 'center', padding: 45, marginTop: 30 }, emptyIcon: { width: 74, height: 74, borderRadius: 37, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 21, fontWeight: '900', marginTop: 15 }, emptyText: { color: C.muted, lineHeight: 18, textAlign: 'center', marginTop: 6 }, shopButton: { height: 50, borderRadius: 25, backgroundColor: C.ink, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20 }, shopButtonText: { color: '#FFF', fontWeight: '900' },
});
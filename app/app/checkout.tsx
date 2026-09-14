import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { api } from '../lib/api';

type Order = { id: string; paymentReference?: string };
type Quote = { liveQuote?: number | null; status?: string; message?: string };

type PaymentState = 'idle' | 'processing' | 'pending' | 'success' | 'failed' | 'cancelled';

export default function Checkout() {
  const router = useRouter();
  const { id, productId } = useLocalSearchParams<{ id?: string; productId?: string }>();
  const selectedProductId = String(productId || id || 'p1');
  const [address, setAddress] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentState>('idle');
  const [message, setMessage] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');

  async function chooseAddress() {
    setAddress(true); setQuoteLoading(true); setMessage('');
    try {
      const response = await api<{ quote?: Quote }>('/api/orders/quote', { method: 'POST', body: JSON.stringify({ sellerLat: 5.6037, sellerLng: -0.187, buyerLat: 5.6037, buyerLng: -0.187, productId: selectedProductId }) });
      setQuote(response.quote || null);
    } catch { setQuote({ status: 'unavailable', liveQuote: null, message: 'Delivery quote unavailable.' }); }
    finally { setQuoteLoading(false); }
  }

  async function pay() {
    if (!address) return;
    setPayment('processing'); setMessage('');
    try {
      let currentOrder = order;
      if (!currentOrder) {
        const created = await api<{ order: Order }>('/api/orders', { method: 'POST', body: JSON.stringify({ buyerId: 'u1', productId: selectedProductId, quantity: 1, address: { label: 'Home · Accra', lat: 5.6037, lng: -0.187, details: 'Saved delivery location' } }) });
        currentOrder = created.order; setOrder(currentOrder);
      }
      const initialized = await api<{ status: string; message?: string; authorizationUrl?: string; reference?: string }>('/api/payments/initialize', { method: 'POST', body: JSON.stringify({ orderId: currentOrder.id, email: 'buyer@girlies.app' }) });
      if (initialized.status !== 'initialized' || !initialized.authorizationUrl) {
        setPayment('failed'); setMessage(initialized.message || 'Payment is unavailable. Configure the Paystack backend and retry.'); return;
      }
      setAuthorizationUrl(initialized.authorizationUrl); setPayment('pending');
      await Linking.openURL(initialized.authorizationUrl);
    } catch (err) { setPayment('failed'); setMessage(err instanceof Error ? err.message : 'Payment could not be started.'); }
  }

  async function verify() {
    if (!order?.paymentReference && !authorizationUrl) { setPayment('failed'); setMessage('Start payment before verifying it.'); return; }
    setPayment('processing'); setMessage('');
    try {
      const reference = order?.paymentReference || 'girlies_' + order?.id;
      const result = await api<{ status: string; message?: string; order?: Order }>('/api/payments/verify', { method: 'POST', body: JSON.stringify({ reference }) });
      if (result.status === 'paid') { setPayment('success'); router.replace({ pathname: '/delivery', params: { orderId: result.order?.id || order?.id || '' } }); return; }
      setPayment('pending'); setMessage(result.message || 'Payment is still pending.');
    } catch (err) { setPayment('failed'); setMessage(err instanceof Error ? err.message : 'Payment verification failed.'); }
  }

  const deliveryText = quoteLoading ? 'Getting delivery quote...' : quote?.liveQuote ? 'GH₵ ' + quote.liveQuote : address ? 'Delivery quote unavailable' : 'Add your location to calculate';
  const totalText = quote?.liveQuote ? 'GH₵ ' + (480 + quote.liveQuote) : 'GH₵ 480 + delivery';
  const paymentLabel = payment === 'processing' ? 'Processing…' : payment === 'pending' ? 'Verify payment' : payment === 'failed' ? 'Retry payment' : payment === 'cancelled' ? 'Pay securely with Paystack' : 'Pay securely with Paystack';

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}><View style={styles.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={styles.heading}>Checkout</Text><View style={{ width: 30 }} /></View>
    <View style={styles.step}><Text style={styles.stepOn}>1</Text><View style={styles.line} /><Text style={styles.stepOff}>2</Text><View style={styles.line} /><Text style={styles.stepOff}>3</Text></View>
    <Text style={styles.section}>Delivery address</Text><Pressable onPress={chooseAddress} style={[styles.address, address && styles.addressOn]}><View style={styles.pin}><I name="location" size={20} color={C.pink} /></View><View style={{ flex: 1 }}><Text style={styles.addrTitle}>{address ? 'Home · Accra' : 'Add your delivery location'}</Text><Text style={styles.addrText}>{address ? 'Tap to change your saved location' : 'We need this before you can purchase.'}</Text></View><I name="arrow" size={18} /></Pressable>
    <Text style={styles.section}>Delivery estimate</Text><View style={styles.delivery}><View style={styles.route}><View style={styles.point} /><View style={styles.routeLine} /><View style={styles.point} /></View><View style={{ flex: 1 }}><Text style={styles.delTitle}>Live quote from Yango</Text><Text style={styles.delText}>{deliveryText}</Text></View>{quoteLoading && <ActivityIndicator color={C.pink} />}</View>
    <Text style={styles.section}>Order</Text><View style={styles.order}><View style={styles.thumb} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '900' }}>Silk press statement wig</Text><Text style={styles.muted}>Nia Hair · Qty 1</Text></View><Text style={{ fontWeight: '900' }}>GH₵ 480</Text></View>
    <View style={styles.total}><View style={styles.row}><Text style={styles.muted}>Subtotal</Text><Text>GH₵ 480</Text></View><View style={styles.row}><Text style={styles.muted}>Delivery</Text><Text>{quote?.liveQuote ? 'GH₵ ' + quote.liveQuote : 'Pending live quote'}</Text></View><View style={[styles.row, styles.totalRow]}><Text style={styles.totalLabel}>Estimated total</Text><Text style={styles.totalPrice}>{totalText}</Text></View></View>
    <Text style={styles.note}>Payment is processed securely through Paystack. Girlies never stores your card details.</Text>
    {message ? <View style={[styles.message, payment === 'failed' ? styles.failure : styles.pending]}><Text style={styles.messageTitle}>{payment === 'failed' ? 'Payment unavailable' : 'Payment update'}</Text><Text style={styles.messageText}>{message}</Text></View> : null}
    {payment === 'cancelled' ? <Text style={styles.cancelled}>Payment cancelled. No payment success was recorded.</Text> : null}
    <Pressable disabled={!address || payment === 'processing'} onPress={payment === 'pending' ? verify : pay} style={[styles.pay, (!address || payment === 'processing') && { opacity: 0.45 }]}>{payment === 'processing' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payText}>{paymentLabel}</Text>}</Pressable>
    {payment === 'pending' ? <Pressable onPress={() => { setPayment('cancelled'); setMessage(''); }} style={styles.cancel}><Text style={styles.cancelText}>Cancel payment</Text></Pressable> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 30 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '900' }, step: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 18 }, stepOn: { width: 29, height: 29, borderRadius: 15, backgroundColor: C.pink, color: '#FFF', textAlign: 'center', paddingTop: 6, fontWeight: '900' }, stepOff: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#FFF', color: C.muted, textAlign: 'center', paddingTop: 6, fontWeight: '900', borderWidth: 1, borderColor: C.line }, line: { width: 48, height: 2, backgroundColor: C.line }, section: { fontSize: 17, fontWeight: '900', marginTop: 17, marginBottom: 10 }, address: { padding: 15, borderRadius: 24, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 11 }, addressOn: { borderColor: C.pink }, pin: { width: 43, height: 43, borderRadius: 22, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' }, addrTitle: { fontWeight: '900', fontSize: 13 }, addrText: { fontSize: 11, color: C.muted, marginTop: 3 }, delivery: { padding: 17, borderRadius: 25, backgroundColor: C.mint, flexDirection: 'row', alignItems: 'center' }, route: { width: 25, alignItems: 'center', marginRight: 10 }, point: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink }, routeLine: { height: 27, width: 2, backgroundColor: C.ink }, delTitle: { fontWeight: '900' }, delText: { fontSize: 11, fontWeight: '600', marginTop: 4 }, order: { backgroundColor: '#FFF', padding: 13, borderRadius: 25, flexDirection: 'row', alignItems: 'center', gap: 10 }, thumb: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.rose }, muted: { fontSize: 11, color: C.muted, marginTop: 3 }, total: { marginTop: 12, padding: 17, borderRadius: 24, backgroundColor: '#FFF' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }, totalRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 13 }, totalLabel: { fontWeight: '900', fontSize: 15 }, totalPrice: { fontWeight: '900', fontSize: 17 }, note: { fontSize: 10, color: C.muted, lineHeight: 15, marginVertical: 14 }, message: { padding: 14, borderRadius: 18, marginBottom: 12 }, failure: { backgroundColor: C.rose }, pending: { backgroundColor: C.mint }, messageTitle: { fontWeight: '900' }, messageText: { color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }, cancelled: { color: C.muted, fontSize: 11, marginBottom: 12 }, pay: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }, payText: { color: '#FFF', fontWeight: '900', fontSize: 15 }, cancel: { alignItems: 'center', padding: 14 }, cancelText: { color: C.muted, fontWeight: '800' } });

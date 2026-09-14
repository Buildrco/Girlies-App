import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
export default function Layout(){return <GestureHandlerRootView style={{flex:1}}><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}><Stack.Screen name="home" options={{animation:'none'}}/><Stack.Screen name="shop" options={{animation:'none'}}/><Stack.Screen name="community" options={{animation:'none'}}/><Stack.Screen name="profile" options={{animation:'none'}}/></Stack></GestureHandlerRootView>}

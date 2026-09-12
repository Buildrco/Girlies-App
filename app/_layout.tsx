import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
export default function Layout(){return <GestureHandlerRootView style={{flex:1}}><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}/></GestureHandlerRootView>}

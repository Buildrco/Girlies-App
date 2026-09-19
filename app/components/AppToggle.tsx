import React,{useEffect,useRef}from'react';import{Animated,Pressable,StyleSheet,View}from'react-native';import{C}from'../constants/theme';

type Props={value:boolean;onValueChange:(value:boolean)=>void;accessibilityLabel?:string};

// Native rendering of the supplied SVG/CSS toggle geometry and timings.
export default function AppToggle({value,onValueChange,accessibilityLabel}:Props){
  const progress=useRef(new Animated.Value(value?1:0)).current;
  useEffect(()=>{Animated.parallel([
    Animated.timing(progress,{toValue:value?1:0,duration:600,useNativeDriver:false}),
  ]).start();},[value,progress]);
  const bg=progress.interpolate({inputRange:[0,1],outputRange:['#D3D3D6',C.pink]});
  const centerX=progress.interpolate({inputRange:[0,1],outputRange:[2.6,32.4]});
  const leftScale=progress.interpolate({inputRange:[0,1],outputRange:[1,0]});
  const rightScale=progress.interpolate({inputRange:[0,1],outputRange:[0,1]});
  const onIcon=progress.interpolate({inputRange:[0,1],outputRange:['#D3D3D6','#FFFFFF']});
  const offIcon=progress.interpolate({inputRange:[0,1],outputRange:['#EAEAEC',C.pink]});
  return <Pressable accessibilityRole="switch" accessibilityState={{checked:value}} accessibilityLabel={accessibilityLabel} onPress={()=>onValueChange(!value)} style={s.wrap}>
    <Animated.View style={[s.track,{backgroundColor:bg}]}>
      <Animated.View style={[s.onIcon,{backgroundColor:onIcon}]}/>
      <Animated.View style={[s.offIcon,{borderColor:offIcon}]}/>
      <Animated.View style={[s.circle,s.left,{transform:[{scale:leftScale}]}]}/>
      <Animated.View style={[s.circle,s.right,{transform:[{scale:rightScale}]}]}/>
      <Animated.View style={[s.center,{transform:[{translateX:centerX}]}]}/>
    </Animated.View>
  </Pressable>;
}
const s=StyleSheet.create({wrap:{width:58,height:31,justifyContent:'center'},track:{width:58,height:28,borderRadius:14,overflow:'hidden',position:'relative'},center:{position:'absolute',left:0,top:8.3,width:23.1,height:11.5,borderRadius:11.5,backgroundColor:'#FFF'},circle:{position:'absolute',top:2.8,width:22.6,height:22.6,borderRadius:11.3,backgroundColor:'#FFF'},left:{left:2.8},right:{left:32.6},onIcon:{position:'absolute',left:12.7,top:7.7,width:2.4,height:12.7,borderRadius:3},offIcon:{position:'absolute',right:7.7,top:7.7,width:11.5,height:11.5,borderRadius:6,borderWidth:2.2}});

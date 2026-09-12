import React from 'react';
import { Text } from 'react-native';
const glyphs:Record<string,string>={home:'⌂',shop:'⌑',community:'♡',chat:'◌',profile:'◉',search:'⌕',bell:'♢',plus:'＋',send:'➤',bag:'▢',heart:'♡',more:'•••',back:'‹',share:'↗',settings:'⚙',spark:'✦',check:'✓',camera:'◉',mic:'●',location:'⌖',filter:'≡',arrow:'→',lock:'⌑',gift:'♧',chart:'⌁',shield:'◇'};
export const I=({name,size=23,color='#171318'}:{name:string,size?:number,color?:string})=><Text style={{fontSize:size,color,fontWeight:'700'}}>{glyphs[name]||'•'}</Text>;

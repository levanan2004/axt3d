/** Exposes the visible viewport (above the iOS keyboard) as CSS vars --vvh and --kb on <html>. */
export function trackVisualViewport(){
 const vv=typeof window!=='undefined'?window.visualViewport:null;if(!vv)return ()=>{};
 const root=document.documentElement;
 const set=()=>{root.style.setProperty('--vvh',vv.height+'px');root.style.setProperty('--kb',Math.max(0,window.innerHeight-vv.height-vv.offsetTop)+'px');};
 set();vv.addEventListener('resize',set);vv.addEventListener('scroll',set);
 return ()=>{vv.removeEventListener('resize',set);vv.removeEventListener('scroll',set);};
}

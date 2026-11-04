import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
const output = process.argv[2];
if (!output) throw new Error('Provide an output HTML path');
await build({configLoader:'runner',build:{outDir:'.landing-export',rollupOptions:{input:'landing-v1.html'},emptyOutDir:true}});
let html=fs.readFileSync('.landing-export/landing-v1.html','utf8');
html=html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>{
 let js=fs.readFileSync(path.join('.landing-export',src),'utf8');
 const images=['floor-plan.png','complex-blueprint.png','construction.png'];
 // Embed assets at the DOM boundary so the archived animation needs no server.
 const embedded=Object.fromEntries(images.map(name=>['/landing/'+name,'data:image/png;base64,'+fs.readFileSync('public/landing/'+name).toString('base64')]));
 const bootstrap=`const embedded=${JSON.stringify(embedded)};const applyImages=()=>document.querySelectorAll('img').forEach(i=>{const s=i.getAttribute('src');if(embedded[s])i.src=embedded[s]});new MutationObserver(applyImages).observe(document.documentElement,{childList:true,subtree:true});`;
 return '<script type="module">'+bootstrap+js.replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,src)=>'<style>'+fs.readFileSync(path.join('.landing-export',src),'utf8')+'</style>');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log('Exported standalone landing v1');

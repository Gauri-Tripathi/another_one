import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from 'node:crypto';

function offlineCompanion() {
  return { name:'offline-companion', generateBundle(_options,bundle) {
    const files=Object.keys(bundle);
    const version=createHash('sha256').update(files.join('|')).digest('hex').slice(0,12);
    const urls=['./','./index.html','./cat-coach.png','./icon.svg','./manifest.webmanifest',...['silver','tuxedo','siamese','ginger'].map(id=>'./cats/'+id+'.png'),...files.filter(f => /\.(js|css)$/.test(f)).map(f => './'+f)];
    this.emitFile({type:'asset',fileName:'sw.js',source:`
const CACHE='purrductive-${version}';
const FILES=${JSON.stringify(urls)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('purrductive-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(new URL('./index.html',self.location).href)));return;}
 if(FILES.some(f=>new URL(f,self.location).href===url.href))e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});`});
  }};
}

export default defineConfig({
  plugins: [react(),offlineCompanion()],
  base: "./"
});

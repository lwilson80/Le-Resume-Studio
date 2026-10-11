// Optional browser features never gate tailoring or ordinary downloads.
export const cloneData=(value,host=globalThis)=>typeof host.structuredClone==='function'?host.structuredClone(value):JSON.parse(JSON.stringify(value));
export const hasOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);

const loads=new WeakMap();
const libraries={docx:{global:'docx',file:'docx.js',label:'Word'},pdf:{global:'PDFLib',file:'pdf-lib.min.js',label:'PDF'}};
export function loadExportLibrary(format,host=globalThis,doc=host.document) {
  const library=libraries[format];
  if(!library)return Promise.reject(new Error('Choose Word, PDF, or plain text.'));
  if(host[library.global])return Promise.resolve(host[library.global]);
  if(!doc?.head)return Promise.reject(new Error('The '+library.label+' export library could not load. Try plain text or refresh the app.'));
  let pending=loads.get(doc);if(!pending){pending=new Map();loads.set(doc,pending);}
  if(pending.has(format))return pending.get(format);
  const promise=new Promise((resolve,reject)=>{
    const script=doc.createElement('script');script.src=new URL('./vendor/'+library.file,import.meta.url).href;script.async=true;
    let timer;
    const finish=failed=>{
      clearTimeout(timer);script.onload=null;script.onerror=null;
      if(failed||!host[library.global]){pending.delete(format);script.remove();reject(new Error('The '+library.label+' export library could not load. Try again or choose plain text.'));}
      else resolve(host[library.global]);
    };
    script.onload=()=>finish(false);script.onerror=()=>finish(true);
    timer=setTimeout(()=>finish(true),30000);
    doc.head.appendChild(script);
  });
  pending.set(format,promise);return promise;
}

// Soft keyboards can shrink the visual viewport without changing 100vh.
// Leave pinch zoom to the browser instead of resizing content while zooming.
export function trackViewport(doc=globalThis.document,host=globalThis) {
  const viewport=host.visualViewport,style=doc?.documentElement?.style;
  if(!viewport?.addEventListener||!style)return ()=>{};
  const update=()=>{
    if(viewport.scale>1.01){style.removeProperty('--visible-height');style.removeProperty('--visible-top');return;}
    style.setProperty('--visible-height',Math.round(viewport.height)+'px');
    style.setProperty('--visible-top',Math.max(0,Math.round(viewport.offsetTop))+'px');
  };
  viewport.addEventListener('resize',update);viewport.addEventListener('scroll',update);update();
  return ()=>{viewport.removeEventListener('resize',update);viewport.removeEventListener('scroll',update);style.removeProperty('--visible-height');style.removeProperty('--visible-top');};
}

// Browser-capability simulations; these are not real Safari/Chrome rendering tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {cloneData,loadExportLibrary,trackViewport} from '../dist/browser.js';
import {createDownloadPayload,createExportBlob,configureShareButton} from '../dist/downloads.js';
import {tailorResume,resumeText,coverLetterText} from '../dist/engine.js';
import {firstPersonBullet} from '../dist/writing.js';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {setup,Element,enterMaster} from './dom-adapter.mjs';
import {parseHtml} from './html-tree.mjs';

const jd='A Business Applications Analyst will support application enhancements, UAT, requirements analysis, root cause analysis, training and technical documentation. Build reports and work with internal stakeholders.';
const version=tailorResume(MASTER_RESUME,jd,{company:'Example Company'});
test('Plain resume snapshots clone independently even when structuredClone is unavailable',()=>{
  const copied=cloneData(version,{});assert.deepEqual(copied,version);
  copied.resume.name='Changed';copied.coverLetter.paragraphs[0]='Changed';
  assert.equal(version.resume.name,MASTER_RESUME.name);assert.notEqual(version.coverLetter.paragraphs[0],'Changed');
});
test('Tailoring and transfers work without structuredClone, Object.hasOwn or Array.at',()=>{
  const prior={clone:globalThis.structuredClone,own:Object.hasOwn,at:Array.prototype.at};
  try {
    globalThis.structuredClone=undefined;Object.hasOwn=undefined;Array.prototype.at=undefined;
    const result=tailorResume(MASTER_RESUME,jd),payload=createDownloadPayload(result,'cover','txt');
    assert.equal(result.resume.name,MASTER_RESUME.name);assert.ok(result.coverLetter.paragraphs.length>0);
    assert.equal(payload.letter.signature,MASTER_RESUME.name);assert.notEqual(result.resume,MASTER_RESUME);
  }finally{globalThis.structuredClone=prior.clone;Object.hasOwn=prior.own;Array.prototype.at=prior.at;}
});
test('Sentence and semicolon conversion preserves single punctuation without Safari-incompatible lookbehind',()=>{
  assert.equal(firstPersonBullet('Developed reports; documented requirements.'),'I developed reports. I documented requirements');
  assert.equal(firstPersonBullet('Led testing. Resolved issues.'),'I led testing. I resolved issues');
  assert.equal(firstPersonBullet('Resolved issues! Trained users.'),'I resolved issues! I trained users');
});
function scriptHost() {
  const scripts=[],host={};
  const doc={head:{appendChild:script=>scripts.push(script)},createElement:tag=>{assert.equal(tag,'script');return {remove(){this.removed=true;}};}};
  return {host,doc,scripts};
}
test('Export libraries load only the requested format and concurrent requests share one script',async()=>{
  const {host,doc,scripts}=scriptHost();
  const first=loadExportLibrary('pdf',host,doc),second=loadExportLibrary('pdf',host,doc);
  assert.equal(first,second);assert.equal(scripts.length,1);assert.match(scripts[0].src,/\/vendor\/pdf-lib\.min\.js$/);
  assert.equal(scripts[0].async,true);host.PDFLib={PDFDocument:{}};scripts[0].onload();
  assert.equal(await first,host.PDFLib);assert.equal(await loadExportLibrary('pdf',host,doc),host.PDFLib);assert.equal(scripts.length,1);
  const word=loadExportLibrary('docx',host,doc);assert.equal(scripts.length,2);assert.match(scripts[1].src,/\/vendor\/docx\.js$/);
  host.docx={Document:{}};scripts[1].onload();assert.equal(await word,host.docx);
});
test('A failed export-library load offers a retry without poisoning later requests',async()=>{
  const {host,doc,scripts}=scriptHost(),first=loadExportLibrary('docx',host,doc);
  scripts[0].onerror();await assert.rejects(first,/Try again or choose plain text/);assert.equal(scripts[0].removed,true);
  const retry=loadExportLibrary('docx',host,doc);assert.equal(scripts.length,2);host.docx={Document:{}};scripts[1].onload();assert.equal(await retry,host.docx);
});
test('Neither page downloads Word/PDF libraries until an export needs them',async()=>{
  for(const name of ['index','download']) {
    const {nodes}=parseHtml(await fs.readFile(new URL('../dist/'+name+'.html',import.meta.url),'utf8'));
    assert.ok(nodes.some(n=>n.tag==='script'&&n.attrs.type==='module'));
    assert.ok(!nodes.some(n=>n.tag==='script'&&/docx|pdf-lib/.test(n.attrs.src||'')));
  }
});
test('Actual Word and PDF exports remain valid when dynamic lookbehind is unavailable',async()=>{
  const NativeRegExp=globalThis.RegExp;
  function CompatibleRegExp(pattern,flags) {
    if(typeof pattern==='string'&&/\(\?<([=!])/.test(pattern))throw new SyntaxError('Lookbehind unavailable');
    return new NativeRegExp(pattern,flags);
  }
  CompatibleRegExp.prototype=NativeRegExp.prototype;Object.setPrototypeOf(CompatibleRegExp,NativeRegExp);
  try {
    globalThis.RegExp=CompatibleRegExp;
    vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/docx.js',import.meta.url),'utf8'));
    vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/pdf-lib.min.js',import.meta.url),'utf8'));
    const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
    for(const kind of ['resume','cover'])for(const format of ['docx','pdf']) {
      const blob=await createExportBlob(createDownloadPayload(version,kind,format),{docx:globalThis.docx,pdf:globalThis.PDFLib,fonts});
      const bytes=new Uint8Array(await blob.arrayBuffer());
      if(format==='pdf')assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');else assert.deepEqual([...bytes.slice(0,2)],[0x50,0x4b]);
    }
  }finally{globalThis.RegExp=NativeRegExp;}
});
function shareHost({embedded=false,accept=true,share}={}) {
  const host={File:globalThis.File,navigator:{canShare:()=>accept,share:share||(()=>Promise.resolve())}};
  host.self=host;host.top=embedded?{}:host;return host;
}
test('Sharing stays hidden when unsupported, forbidden in a frame, or rejected for the file type',()=>{
  const payload=createDownloadPayload(version,'resume','txt'),blob=new Blob(['Content']);
  for(const host of [{},shareHost({embedded:true}),shareHost({accept:false}),{File:File,navigator:{canShare:()=>{throw new Error('Blocked');},share(){assert.fail('Unexpected share');}}}]) {
    const button=new Element(),status=new Element();configureShareButton(button,status,blob,payload,host);
    assert.equal(button.hidden,true);assert.equal(button.events.click,undefined);
  }
});
test('Sharing starts on the click with the exact prepared file, disables repeat clicks, and never claims the file was saved',async()=>{
  const payload=createDownloadPayload(version,'cover','txt'),blob=new Blob(['Exact edited text — café']),button=new Element(),status=new Element();
  let received,release;const wait=new Promise(resolve=>{release=resolve;});
  const host=shareHost({share:data=>{received=data;return wait;}}),cleanup=configureShareButton(button,status,blob,payload,host);
  assert.equal(received,undefined);assert.equal(button.hidden,false);
  const first=button.dispatch('click');assert.equal(button.disabled,true);assert.equal(button.attrs['aria-busy'],'true');
  assert.equal(received.files[0].name,payload.name);assert.equal(received.files[0].type,'text/plain');assert.equal(await received.files[0].text(),'Exact edited text — café');
  await button.dispatch('click');release();await first;
  assert.equal(button.disabled,false);assert.equal(button.attrs['aria-busy'],undefined);assert.doesNotMatch(status.textContent,/File saved/);
  cleanup();assert.equal(button.hidden,true);assert.equal(button.events.click.length,0);
});
test('Canceled and denied share requests retain ordinary downloads and reset their busy state',async()=>{
  const payload=createDownloadPayload(version,'resume','pdf');
  for(const reason of ['AbortError','NotAllowedError']) {
    const button=new Element(),status=new Element(),host=shareHost({share:()=>Promise.reject(new DOMException(reason,reason))});
    configureShareButton(button,status,new Blob(['PDF data']),payload,host);await button.dispatch('click');
    assert.match(status.textContent,reason==='AbortError'?/canceled.*available to download/:/Use Download file/);
    assert.equal(button.disabled,false);assert.equal(button.attrs['aria-busy'],undefined);assert.doesNotMatch(status.textContent,/File saved/);
  }
});
test('Visual-viewport updates track the keyboard and release size overrides during pinch zoom',()=>{
  const events=new Map(),properties=new Map();
  const viewport={height:720,offsetTop:0,scale:1,addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)};
  const style={setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)};
  const cleanup=trackViewport({documentElement:{style}},{visualViewport:viewport});assert.equal(properties.get('--visible-height'),'720px');
  viewport.height=340;viewport.offsetTop=90;events.get('resize')();assert.equal(properties.get('--visible-height'),'340px');assert.equal(properties.get('--visible-top'),'90px');
  viewport.scale=2;events.get('resize')();assert.equal(properties.size,0);
  viewport.scale=1;events.get('scroll')();assert.equal(properties.get('--visible-top'),'90px');cleanup();assert.equal(events.size,0);assert.equal(properties.size,0);
  assert.doesNotThrow(()=>trackViewport({},{}));
});
async function withNavigator(navigator,action) {
  const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{value:navigator,configurable:true});
  try{await action();}finally{if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;}
}
test('Missing or denied clipboard access opens selectable text and returns focus after closing',async()=>{
  for(const navigator of [{},{clipboard:{writeText:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))}}])await withNavigator(navigator,async()=>{
    const {get,doc,values}=await setup();get('job-description').value=jd;await get('tailor-form').dispatch('submit');await get('tab-cover').dispatch('click');
    const saved=JSON.parse(values.get('lw-resume-studio-history-v1'))[0];await get('copy-resume').dispatch('click');
    assert.equal(get('copy-dialog').open,true);assert.equal(doc.activeElement,get('copy-heading'));assert.equal(get('copy-text').value,coverLetterText(saved.coverLetter,saved.resume));
    await get('select-copy-text').dispatch('click');assert.equal(doc.activeElement,get('copy-text'));
    assert.equal(get('copy-text').selectionStart,0);assert.equal(get('copy-text').selectionEnd,get('copy-text').value.length);
    get('copy-dialog').close();assert.equal(doc.activeElement,get('copy-resume'));
  });
});
test('Available clipboard access copies the selected document without an extra dialog',async()=>{
  let copied;await withNavigator({clipboard:{writeText:async text=>{copied=text;}}},async()=>{
    const {get,values}=await setup();get('job-description').value=jd;await get('tailor-form').dispatch('submit');
    const saved=JSON.parse(values.get('lw-resume-studio-history-v1'))[0];await get('copy-resume').dispatch('click');
    assert.equal(copied,resumeText(saved.resume));assert.equal(get('copy-dialog').open,false);assert.match(get('toast').textContent,/Resume text copied/);
  });
});
test('Blocked browser storage keeps tailoring, current-tab history and downloads usable with a persistent notice',async()=>{
  const storage={getItem(){throw new DOMException('Blocked','SecurityError');},setItem(){throw new DOMException('Full','QuotaExceededError');}};
  const ui=await setup({},false,{storage});const {get}=ui;assert.equal(get('storage-note').hidden,false);
  await enterMaster(ui);
  get('job-description').value=jd;await get('tailor-form').dispatch('submit');
  assert.equal(get('download-txt').disabled,false);assert.equal(get('history-count').textContent,'1');
  assert.match(get('storage-note').textContent,/only while this tab is open/);assert.match(get('toast').textContent,/ready to review/);
  await get('download-txt').dispatch('click');assert.equal(get('save-dialog').open,true);assert.ok((await(await fetch(get('save-file').href)).text()).includes(MASTER_RESUME.name.toUpperCase()));
});

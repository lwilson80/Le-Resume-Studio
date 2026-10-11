import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume} from '../dist/engine.js';
import {createDownloadPayload,encodeDownloadPayload,decodeDownloadPayload,downloadPageUrl,createExportBlob,configureSaveLink,readDownloadTransfer,documentText} from '../dist/downloads.js';
import {startDownloadPage} from '../dist/download-page.js';

const version=tailorResume(MASTER_RESUME,'Our Billing Analyst manages WIP, AR, billing recommendations, reports, forecasts and month-end close. Track realization and utilization and advise partners on engagement economics.',{title:'Billing Analyst',company:'Example & Company'});
version.resume.summary='An edited summary — including Unicode: café.';
version.coverLetter.paragraphs[0]='My edited opening — I would welcome a conversation about this role.';
version.coverLetter.edited=true;

class Element {
  constructor(){this.events=new Map();this.attrs={};this.textContent='';this.hidden=true;}
  addEventListener(type,handler){this.events.set(type,handler);}
  removeEventListener(type,handler){if(this.events.get(type)===handler)this.events.delete(type);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  click(){const event={prevented:false,preventDefault(){this.prevented=true;}};return {event,promise:this.events.get('click')(event)};}
}
function hostFor(payload,embedded=false){
  const host={};host.self=host;host.top=embedded?{}:host;
  const stored=new Map();
  host.location={hash:'#document='+encodeDownloadPayload(payload),pathname:'/download.html',search:''};
  host.history={replaceState:(_state,_title,path)=>{assert.equal(path,'/download.html');host.location.hash='';}};
  host.sessionStorage={setItem:(k,v)=>stored.set(k,v),getItem:k=>stored.get(k)};
  return host;
}

test('New-tab transfers preserve manual edits, Unicode, file choice, and filenames',()=>{
  for(const kind of ['resume','cover']) for(const format of ['docx','pdf','txt']){
    const payload=createDownloadPayload(version,kind,format);
    const url=new URL(downloadPageUrl(payload));
    assert.equal(url.pathname.endsWith('/download.html'),true);
    assert.equal(url.search,'');
    const restored=decodeDownloadPayload(url.hash);
    assert.deepEqual(restored,payload);
    assert.ok(restored.name.endsWith('.'+format));
    assert.ok(documentText(restored).includes(kind==='cover'?version.coverLetter.paragraphs[0]:version.resume.summary));
    assert.ok(!JSON.stringify(restored).includes('Our Billing Analyst manages'));
    assert.ok(!Object.hasOwn(restored,'master'));
    if(kind==='cover'){assert.ok(!Object.hasOwn(restored.resume,'roles'));assert.ok(!Object.hasOwn(restored.letter,'evidence'));}
  }
});
test('Invalid transfers fail with a useful error instead of generating a different document',()=>{
  for(const hash of ['','#document=','document=abc','#document=%%%','#document=e30','#document='+btoa('{"format":"exe"}')])assert.throws(()=>decodeDownloadPayload(hash),/download|Resume Studio/);
  const bad=createDownloadPayload(version,'resume','txt');bad.resume.roles=[null];
  assert.throws(()=>encodeDownloadPayload(bad),/incomplete/);
});
test('A handoff clears document contents from the URL and survives a tab refresh',()=>{
  const payload=createDownloadPayload(version,'cover','docx'),host=hostFor(payload);
  assert.deepEqual(readDownloadTransfer(host),payload);
  assert.equal(host.location.hash,'');
  // No localStorage or original app state exists in the receiving context.
  assert.equal(host.localStorage,undefined);
  assert.deepEqual(readDownloadTransfer(host),payload);
  host.location.hash='#document=e30';
  assert.throws(()=>readDownloadTransfer(host),/invalid/);
  assert.equal(host.location.hash,'');
});
test('All six handoff exports create actual files from the selected snapshot',async()=>{
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/pdf-lib.min.js',import.meta.url),'utf8'));
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/docx.js',import.meta.url),'utf8'));
  const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
  for(const kind of ['resume','cover'])for(const format of ['pdf','docx','txt']){
    const payload=decodeDownloadPayload(new URL(downloadPageUrl(createDownloadPayload(version,kind,format))).hash);
    const blob=await createExportBlob(payload,{pdf:globalThis.PDFLib,docx:globalThis.docx,fonts});
    assert.ok(blob.size>100);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    if(format==='pdf'){
      assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');
      const pdf=await globalThis.PDFLib.PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=1);
    }else if(format==='docx'){assert.deepEqual([...bytes.slice(0,2)],[0x50,0x4b]);assert.ok(blob.size>5000);}
    else assert.ok((await blob.text()).includes(kind==='cover'?version.coverLetter.paragraphs[0]:version.resume.summary));
  }
});
test('The save picker starts directly on a click and confirms saving only after close',async()=>{
  const payload=createDownloadPayload(version,'resume','txt'),blob=new Blob(['File contents']),link=new Element(),status=new Element();
  const host=hostFor(payload),events=[];
  let releaseClose,atClose;
  const closeReached=new Promise(resolve=>{atClose=resolve;});
  const closeDone=new Promise(resolve=>{releaseClose=resolve;});
  host.showSaveFilePicker=options=>{
    events.push('picker');assert.equal(options.startIn,'downloads');assert.equal(options.suggestedName,payload.name);
    return Promise.resolve({name:'Chosen_Name.txt',createWritable:async()=>({write:async data=>{assert.equal(data,blob);events.push('write');},close:async()=>{events.push('close');atClose();await closeDone;}})});
  };
  const cleanup=configureSaveLink(link,status,blob,payload,host);
  const {event,promise}=link.click();
  assert.deepEqual(events,['picker']);assert.equal(event.prevented,true);
  await closeReached;
  assert.equal(link.attrs['aria-busy'],'true');assert.equal(link.attrs['aria-disabled'],'true');
  assert.doesNotMatch(status.textContent,/File saved/);
  releaseClose();await promise;
  assert.deepEqual(events,['picker','write','close']);assert.equal(status.textContent,'File saved: Chosen_Name.txt.');
  assert.equal(link.attrs['aria-disabled'],undefined);
  assert.equal(link.attrs['aria-busy'],undefined);
  cleanup();assert.equal(link.events.size,0);
});
test('Ordinary and embedded download links never claim the browser saved a file',async()=>{
  const payload=createDownloadPayload(version,'resume','txt'),blob=new Blob(['File contents']);
  for(const embedded of [false,true]){
    const host=hostFor(payload,embedded),link=new Element(),status=new Element();
    if(embedded)host.showSaveFilePicker=()=>assert.fail('An embedded frame cannot open the save picker.');
    const cleanup=configureSaveLink(link,status,blob,payload,host);
    const {event,promise}=link.click();await promise;
    assert.equal(event.prevented,false);assert.match(status.textContent,/Download requested/);assert.doesNotMatch(status.textContent,/File saved/);
    assert.equal(link.download,payload.name);
    assert.equal(await(await fetch(link.href)).text(),'File contents');
    cleanup();
  }
});
test('Canceled saving does not download unexpectedly or claim a saved file',async()=>{
  const payload=createDownloadPayload(version,'resume','txt'),host=hostFor(payload),link=new Element(),status=new Element();
  host.showSaveFilePicker=()=>Promise.reject(new DOMException('Canceled','AbortError'));
  const cleanup=configureSaveLink(link,status,new Blob(['x']),payload,host);
  const {event,promise}=link.click();await promise;
  assert.equal(event.prevented,true);assert.match(status.textContent,/canceled/);assert.equal(link.textContent,'Save file…');
  assert.equal(link.attrs['aria-disabled'],undefined);cleanup();
});
test('A failed file write aborts the stream and offers the download manager',async()=>{
  const payload=createDownloadPayload(version,'resume','txt'),host=hostFor(payload),link=new Element(),status=new Element();let aborted=false;
  host.showSaveFilePicker=async()=>({createWritable:async()=>({write:async()=>{throw new Error('Disk full');},abort:async()=>{aborted=true;}})});
  const cleanup=configureSaveLink(link,status,new Blob(['x']),payload,host);
  await link.click().promise;assert.equal(aborted,true);assert.doesNotMatch(status.textContent,/File saved/);assert.equal(link.textContent,'Download file');
  const fallback=link.click();await fallback.promise;assert.equal(fallback.event.prevented,false);cleanup();
});
test('The standalone page prepares the exact selected file and keeps it available after Back',async()=>{
  const payload=createDownloadPayload(version,'cover','txt'),host=hostFor(payload),elements=new Map();let onPageHide;
  host.addEventListener=(type,fn)=>{assert.equal(type,'pagehide');onPageHide=fn;};
  const doc={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  const result=await startDownloadPage(doc,host);
  assert.deepEqual(result.payload,payload);assert.equal(elements.get('file-name').textContent,payload.name);
  assert.equal(elements.get('download-content').attrs['aria-busy'],'false');
  assert.equal(elements.get('file-save').attrs['aria-describedby'],'file-name file-type file-guidance');
  assert.equal(elements.get('document-text').textContent,documentText(payload));
  assert.equal(elements.get('file-save').hidden,false);assert.equal(elements.get('file-browser').hidden,true);
  assert.doesNotMatch(elements.get('file-status').textContent,/File saved|Download requested/);
  onPageHide({persisted:true});
  assert.ok((await(await fetch(elements.get('file-save').href)).text()).includes(version.coverLetter.paragraphs[0]));
  result.cleanup();
});
test('A malformed standalone link shows an error and disables saving',async()=>{
  const host=hostFor(createDownloadPayload(version,'resume','txt'));host.location.hash='#document=e30';
  const elements=new Map(),doc={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  const result=await startDownloadPage(doc,host,()=>assert.fail('Invalid links must not export.'));
  assert.equal(elements.get('download-content').attrs['aria-busy'],'false');
  assert.ok(result.error);assert.equal(elements.get('file-error').hidden,false);assert.match(elements.get('file-error').textContent,/invalid/);assert.equal(elements.get('file-save').hidden,true);
});

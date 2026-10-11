import {resumeText, coverLetterText} from './engine.js';
import {createDocx, createPdf, createCoverDocx, createCoverPdf} from './exports.js';
import {cloneData,hasOwn,loadExportLibrary} from './browser.js';
import {getATSProfile} from './ats.js';

export const FILE_TYPES = {
  docx: {label:'Word document', mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},
  pdf: {label:'PDF document', mime:'application/pdf'},
  txt: {label:'Plain text', mime:'text/plain'}
};
const MAX_TRANSFER = 600000;
const text = value => typeof value === 'string' && value.length <= 20000;
const texts = values => Array.isArray(values) && values.length <= 200 && values.every(text);
const rows = (values, check) => Array.isArray(values) && values.length <= 100 && values.every(check);
const contact = r => r && text(r.name) && r.name.trim() && ['phone','email','linkedin'].every(k => text(r[k]));

export function validateDownloadPayload(p) {
  if (!p || p.version !== 1 || !hasOwn(FILE_TYPES,p.format) || !['resume','cover'].includes(p.kind) || !text(p.name) || p.name.length > 180 || !/^[a-zA-Z0-9_ -]+\.(docx|pdf|txt)$/.test(p.name) || !p.name.endsWith('.'+p.format) || !contact(p.resume)) throw new Error('This download link is incomplete. Choose a format again in Le Resume Studio.');
  const r=p.resume;
  if(p.ats!==undefined&&(typeof p.ats!=='string'||p.ats.length>100))throw new Error('The ATS preference is invalid. Choose a format again in Le Resume Studio.');
  if (p.kind==='resume' && (!text(r.summary) || !texts(r.competencies) || !rows(r.roles,x=>x && ['employer','title','dates'].every(k=>text(x[k])) && texts(x.bullets)) || !rows(r.skills,x=>x && text(x.group) && texts(x.items)) || !rows(r.education,x=>x && ['school','qualification','dates'].every(k=>text(x[k]))))) throw new Error('The resume data is incomplete. Choose a format again in Le Resume Studio.');
  const c=p.letter;
  if (p.kind==='cover' && (!c || !['date','company','subject','salutation','closing','signature'].every(k=>text(c[k])) || !texts(c.paragraphs) || !c.paragraphs.length)) throw new Error('The cover letter data is incomplete. Choose a format again in Le Resume Studio.');
  return p;
}

export function createDownloadPayload(version,kind,format) {
  const r=version.resume;
  const resume={name:r.name,phone:r.phone||'',email:r.email||'',linkedin:r.linkedin||''};
  if (kind==='resume') Object.assign(resume,{summary:r.summary,competencies:r.competencies,roles:r.roles.map(({employer,title,dates,bullets})=>({employer,title,dates,bullets})),skills:r.skills.map(({group,items})=>({group,items})),education:r.education.map(({school,qualification,dates})=>({school,qualification,dates}))});
  const c=version.coverLetter;
  const letter=kind==='cover'?{date:c.date,company:c.company||'',subject:c.subject||'',salutation:c.salutation,paragraphs:c.paragraphs,closing:c.closing,signature:c.signature}:null;
  const name=[r.name,version.title||'Tailored',version.company,kind==='cover'?'Cover Letter':'Resume'].filter(Boolean).join('_').replace(/[^a-zA-Z0-9_\- ]/g,'').replace(/\s+/g,'_').slice(0,160)+'.'+format;
  return cloneData(validateDownloadPayload({version:1,kind,format,name,resume,letter,ats:getATSProfile(version.ats).id}));
}

export function encodeDownloadPayload(payload) {
  const bytes=new TextEncoder().encode(JSON.stringify(validateDownloadPayload(payload)));
  if (bytes.length > MAX_TRANSFER) throw new Error('This document is too large to open in another tab. Save it directly from this window.');
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export function decodeDownloadPayload(hash) {
  if (!hash.startsWith('#document=')) throw new Error('Open a document from Le Resume Studio to download it.');
  const encoded=hash.slice(10);
  if (!encoded || encoded.length > MAX_TRANSFER*4/3 || !/^[a-zA-Z0-9_-]+$/.test(encoded)) throw new Error('This download link is invalid. Choose a format again in Le Resume Studio.');
  try {
    const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    return validateDownloadPayload(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  } catch {throw new Error('This download link is invalid. Choose a format again in Le Resume Studio.');}
}

export function downloadPageUrl(payload) {
  const url=new URL('./download.html',import.meta.url);
  url.hash='document='+encodeDownloadPayload(payload);
  return url.href;
}

export function documentText(payload) {
  return payload.kind==='cover'?coverLetterText(payload.letter,payload.resume):resumeText(payload.resume);
}

export async function createExportBlob(payload,dependencies={}) {
  validateDownloadPayload(payload);
  const {resume:r,letter:c,kind,format}=payload;
  if (format==='docx') {
    const api=dependencies.docx||await loadExportLibrary('docx');
    return kind==='cover'?createCoverDocx(c,r,api):createDocx(r,api);
  }
  if (format==='pdf') {
    const api=dependencies.pdf||await loadExportLibrary('pdf');
    return new Blob([kind==='cover'?await createCoverPdf(c,r,api,dependencies.fonts):await createPdf(r,api,dependencies.fonts)],{type:FILE_TYPES.pdf.mime});
  }
  return new Blob([documentText(payload)],{type:'text/plain;charset=utf-8'});
}

export function isEmbedded(host=globalThis) {
  try {return !!host.self && host.self !== host.top;} catch {return true;}
}
export function canChooseLocation(host=globalThis) {
  return !isEmbedded(host) && typeof host.showSaveFilePicker === 'function';
}

// Keep a real download link available. Native downloads have no completion signal.
// The picker is invoked immediately on the next click, after the file is prepared.
export function configureSaveLink(link,status,blob,payload,host=globalThis) {
  const url=URL.createObjectURL(blob);
  let busy=false, nativeOnly=!canChooseLocation(host);
  link.href=url;link.download=payload.name;
  link.textContent=nativeOnly?'Download file':'Save file…';
  const click=async event=>{
    if (busy) {event.preventDefault();return;}
    if (nativeOnly) {status.textContent='Download requested. Check your browser’s downloads for '+payload.name+'.';return;}
    event.preventDefault();busy=true;link.setAttribute('aria-disabled','true');
    link.setAttribute('aria-busy','true');status.textContent='Saving your file. Please wait.';
    let stream;
    try {
      const type=FILE_TYPES[payload.format];
      const handle=await host.showSaveFilePicker({suggestedName:payload.name,startIn:'downloads',types:[{description:type.label,accept:{[type.mime]:['.'+payload.format]}}]});
      stream=await handle.createWritable();
      await stream.write(blob);await stream.close();stream=null;
      status.textContent='File saved: '+(handle.name||payload.name)+'.';
    } catch (error) {
      if (stream?.abort) {try {await stream.abort();} catch {}}
      if (error.name==='AbortError') status.textContent='Saving was canceled. Choose Save file to try again.';
      else {nativeOnly=true;link.textContent='Download file';status.textContent='Could not save to the selected folder. Choose Download file to use your browser’s download manager.';}
    } finally {busy=false;link.removeAttribute('aria-disabled');link.removeAttribute('aria-busy');}
  };
  link.addEventListener('click',click);
  return ()=>{link.removeEventListener('click',click);URL.revokeObjectURL(url);};
}

// Share the already-prepared file on the user's click, preserving activation.
// Some devices offer Save to Files here; downloads remain available everywhere.
export function configureShareButton(button,status,blob,payload,host=globalThis) {
  button.hidden=true;button.disabled=false;
  let file;
  try {
    if(isEmbedded(host)||typeof host.File!=='function'||typeof host.navigator?.canShare!=='function'||typeof host.navigator?.share!=='function')return ()=>{};
    file=new host.File([blob],payload.name,{type:FILE_TYPES[payload.format].mime});
    if(!host.navigator.canShare({files:[file]}))return ()=>{};
  }catch{return ()=>{};}
  button.hidden=false;
  const click=async event=>{
    event.preventDefault();if(button.disabled)return;
    button.disabled=true;button.setAttribute('aria-busy','true');
    status.textContent='Opening your device’s share options. Choose a destination to save or share the file.';
    try {
      await host.navigator.share({files:[file],title:payload.name});
      status.textContent='Use your device’s share options to finish saving or sharing this file.';
    }catch(error) {
      status.textContent=error?.name==='AbortError'?'Sharing was canceled. Your file is still available to download.':'Sharing is unavailable here. Use Download file or open the download page in your browser.';
    }finally{button.disabled=false;button.removeAttribute('aria-busy');}
  };
  button.addEventListener('click',click);
  return ()=>{button.removeEventListener('click',click);button.hidden=true;};
}

// A new tab receives the selected document, without relying on shared storage.
// Remove its contents from the address bar and retain the snapshot for tab refreshes.
export function readDownloadTransfer(host=globalThis) {
  const key='lw-resume-studio-export-v1',hash=host.location.hash;
  if (hash) {
    host.history.replaceState(null,'',host.location.pathname+host.location.search);
    const payload=decodeDownloadPayload(hash);
    try {host.sessionStorage.setItem(key,JSON.stringify(payload));} catch {}
    return payload;
  }
  try {const saved=host.sessionStorage.getItem(key);if(saved)return validateDownloadPayload(JSON.parse(saved));} catch {}
  throw new Error('Return to Le Resume Studio, open your saved version, and choose Word, PDF, or plain text.');
}

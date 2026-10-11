import {createExportBlob,readDownloadTransfer,configureSaveLink,configureShareButton,downloadPageUrl,documentText,isEmbedded,FILE_TYPES} from './downloads.js';
import {trackViewport} from './browser.js';
import {reviewATSFile} from './ats.js';

export async function startDownloadPage(doc=globalThis.document,host=globalThis,make=createExportBlob) {
  const $=id=>doc.getElementById(id);
  $('download-content').setAttribute('aria-busy','true');
  try {
    const payload=readDownloadTransfer(host);
    $('file-title').textContent=payload.kind==='cover'?'Save your cover letter':'Save your resume';
    $('file-name').textContent=payload.name;
    $('file-type').textContent=FILE_TYPES[payload.format].label;
    $('document-text').textContent=documentText(payload);
    $('file-browser').href=downloadPageUrl(payload);
    $('file-browser').hidden=!isEmbedded(host);
    $('file-save').setAttribute('aria-describedby','file-name file-type file-guidance');
    const blob=await make(payload);
    $('file-ats-note').textContent=reviewATSFile(payload,blob).note;
    const releaseSave=configureSaveLink($('file-save'),$('file-status'),blob,payload,host);
    const releaseShare=configureShareButton($('file-share'),$('file-status'),blob,payload,host);
    const cleanup=()=>{releaseSave();releaseShare();};
    $('file-save').hidden=false;
    $('file-status').textContent=isEmbedded(host)?'Open the download page in a browser tab, then save your file.':'Your file is ready. Choose Save file or Download file below.';
    $('file-guidance').textContent='Choose a folder if your browser offers a save dialog. Otherwise, check your browser’s downloads. On a phone or tablet, Share file may offer Save to Files. If a document opens in a preview, use its Download or Share action.';
    host.addEventListener?.('pagehide',event=>{if(!event.persisted)cleanup();});
    return {payload,cleanup};
  } catch(error) {
    $('file-status').textContent='The document could not be prepared.';
    $('file-error').textContent=error.message||'Return to Le Resume Studio and choose a format again.';
    $('file-error').hidden=false;
    $('file-save').hidden=true;$('file-browser').hidden=true;$('file-share').hidden=true;
    return {error};
  } finally {
    $('download-content').setAttribute('aria-busy','false');
  }
}
if (globalThis.document?.body?.dataset.page==='download') {trackViewport();startDownloadPage();}

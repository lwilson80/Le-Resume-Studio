import {createBlankMaster} from './resume.js';

export const IMPORT_LIMITS = {bytes:10*1024*1024,pages:30,characters:200000};
let zipLibrary;
function stopped(signal){if(signal?.aborted)throw new DOMException('Import canceled.','AbortError');}
async function zipLoader(){
  if(globalThis.JSZip)return globalThis.JSZip;
  if(!zipLibrary)zipLibrary=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('./vendor/jszip.min.js',import.meta.url).href;
    script.onload=()=>globalThis.JSZip?resolve(globalThis.JSZip):reject(new Error('Word reader could not load.'));
    script.onerror=()=>{script.remove();reject(new Error('Word reader could not load. Try again or upload plain text.'));};document.head.appendChild(script);
  }).catch(error=>{zipLibrary=undefined;throw error;});
  return zipLibrary;
}
async function pdfLoader(){const pdf=await import('./vendor/pdfjs/pdf.mjs');pdf.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;return pdf;}
function bytesOf(file){if(typeof file.arrayBuffer==='function')return file.arrayBuffer();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('The file could not be read.'));reader.readAsArrayBuffer(file);});}
export function validateResumeFile(file){
  if(!file)throw new Error('Choose a resume file.');
  const extension=String(file.name||'').split('.').pop().toLowerCase();
  if(!['pdf','docx','txt'].includes(extension))throw new Error('Choose a PDF, Word .docx, or plain-text .txt file. Convert older .doc files to .docx first.');
  if(!file.size||file.size>IMPORT_LIMITS.bytes)throw new Error('Choose a nonempty file no larger than 10 MB.');
  return extension;
}
export function wordXmlText(xml){
  // Only extract paragraph text. Never insert document markup into the page.
  const decode=text=>text.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,entity=>{
    const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};if(named[entity])return named[entity];
    const hex=entity.startsWith('&#x');const n=parseInt(entity.slice(hex?3:2,-1),hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
  });
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(match=>{
    const paragraph=match[0].replace(/<w:(?:tab|br|cr)\b[^>]*\/>/g,' ');
    return [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>decode(m[1])).join('');
  }).filter(Boolean).join('\n');
}
function checkZipSizes(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let total=0;
  for(let i=0;i+46<=bytes.length;i++)if(view.getUint32(i,true)===0x02014b50){total+=view.getUint32(i+24,true);if(total>30*1024*1024)throw new Error('This Word document expands beyond the import limit. Save a simpler .docx or plain-text copy.');i+=45+view.getUint16(i+28,true)+view.getUint16(i+30,true)+view.getUint16(i+32,true);}
}
export async function extractResumeText(file,{signal,loadZip=zipLoader,loadPDF=pdfLoader}={}){
  const extension=validateResumeFile(file);stopped(signal);const bytes=new Uint8Array(await bytesOf(file));stopped(signal);let text;
  if(extension==='txt'){
    if(bytes.includes(0))throw new Error('Save your resume as UTF-8 plain text before uploading.');
    text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }else if(extension==='docx'){
    if(bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error('This is not a valid Word .docx file.');
    checkZipSizes(bytes);const zip=await loadZip();stopped(signal);
    const archive=await zip.loadAsync(bytes);const documentFile=archive.file('word/document.xml');
    if(!documentFile)throw new Error('This file does not contain a Word document.');
    text=wordXmlText(await documentFile.async('string'));
  }else{
    if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw new Error('This is not a valid PDF file.');
    const pdf=await loadPDF();stopped(signal);
    const task=pdf.getDocument({data:bytes,isEvalSupported:false,useWasm:false,disableFontFace:true,useSystemFonts:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href});
    const abort=()=>{void task.destroy().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
    try{
      const document=await task.promise;
      if(document.numPages>IMPORT_LIMITS.pages)throw new Error('Upload a resume of 30 pages or fewer.');
      const pages=[];
      for(let p=1;p<=document.numPages;p++){
        stopped(signal);const page=await document.getPage(p),content=await page.getTextContent();let line='',y=null,lines=[];
        for(const item of content.items){if(typeof item.str!=='string')continue;const nextY=item.transform?.[5];if(y!==null&&Math.abs(nextY-y)>3){lines.push(line.trim());line='';}line+=(line?' ':'')+item.str;y=nextY;if(item.hasEOL){lines.push(line.trim());line='';y=null;}}
        if(line.trim())lines.push(line.trim());pages.push(lines.join('\n'));page.cleanup();
      }
      text=pages.join('\n');
    }catch(error){stopped(signal);if(error.name==='PasswordException')throw new Error('Remove the PDF password before uploading.');throw error;}
    finally{signal?.removeEventListener('abort',abort);await task.destroy();}
  }
  stopped(signal);text=text.replace(/\r\n?/g,'\n').replace(/\u0000/g,'').trim();
  if(text.length>IMPORT_LIMITS.characters)throw new Error('The extracted resume is too long. Upload a shorter document.');
  if(text.replace(/\s/g,'').length<30)throw new Error('No usable resume text was found. Scanned or image-only PDFs need a text-based PDF, Word, or plain-text copy.');
  return text;
}

const sectionNames={summary:/^(professional (?:summary|profile)|summary|profile|career (?:summary|objective)|objective|about me)$/i,competencies:/^(core competencies|competencies|areas of expertise|expertise|key skills|skills|professional skills)$/i,skills:/^(technical skills|technical proficiencies|tools and technologies)$/i,roles:/^(professional experience|work experience|employment history|work history|experience|career history)$/i,education:/^(education|education and certifications|certifications|qualifications)$/i};
const datePattern=/\b(?:19|20)\d{2}\b/;
const clean=line=>line.replace(/^\s*[•●▪◦*-]\s*/,'').trim();
export function parseResumeText(text){
  const resume=createBlankMaster(),sections={intro:[],summary:[],competencies:[],skills:[],roles:[],education:[]};let section='intro';
  for(const raw of text.replace(/\r\n?/g,'\n').split('\n')){
    const line=raw.trim();if(!line)continue;const heading=line.replace(/[:\s]+$/,'');
    const match=Object.keys(sectionNames).find(key=>sectionNames[key].test(heading));
    if(match){section=match;continue;}sections[section].push(line);
  }
  const intro=sections.intro;resume.name=(intro.find(line=>!/@|https?:|linkedin\.com|\d{3}/i.test(line))||'').slice(0,250);
  resume.email=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||'';
  resume.phone=intro.join(' ').match(/(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}/)?.[0]||'';
  const linkedin=text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+\/?/i)?.[0];resume.linkedin=linkedin?(linkedin.startsWith('http')?linkedin:'https://'+linkedin):'';
  resume.summary=sections.summary.map(clean).join(' ');
  resume.competencies=[...new Set(sections.competencies.flatMap(line=>clean(line).split(/\s*[|;,•]\s*/)).filter(Boolean))];
  for(const line of sections.skills){const split=clean(line).split(':');resume.skills.push({group:split.length>1?split.shift().trim():'Skills',items:split.join(':').split(/\s*[|;,•]\s*/).map(s=>s.trim()).filter(Boolean)});}
  if(resume.skills.length>20)resume.skills=[{group:'Skills',items:resume.skills.flatMap(s=>s.items)}];
  if(!resume.competencies.length)resume.competencies=[...new Set(resume.skills.flatMap(s=>s.items))];
  let header=[],role=null;
  for(const line of sections.roles){
    const bullet=/^[•●▪◦*-]\s*/.test(line);
    if(!bullet&&datePattern.test(line)&&!/^\w+ed\s/.test(line)){
      const pieces=line.split(/\s*[|·]\s*|\s+[–—]\s+/).filter(Boolean),dateIndex=pieces.findIndex(part=>datePattern.test(part));
      const dates=dateIndex>=0?pieces.splice(dateIndex,1)[0]:line;
      const labels=[...header,...pieces];
      role={employer:labels[0]||'',title:labels[1]||'',dates,bullets:[]};resume.roles.push(role);header=[];
    }else if(bullet){if(!role){role={employer:header[0]||'',title:header[1]||'',dates:'',bullets:[]};resume.roles.push(role);header=[];}role.bullets.push(clean(line));}
    else if(role&&/^(?:[A-Z][a-z]+ed|Led|Built|Oversaw|Managed|Support|Analyze|Develop|Maintain|Provide|Coordinate)\b/.test(line))role.bullets.push(clean(line));
    else if(role&&role.bullets.length&&header.length===0&&line.length>100)role.bullets[role.bullets.length-1]+=' '+line;
    else header.push(line);
  }
  if(!resume.roles.length)resume.roles.push({employer:'',title:'',dates:'',bullets:[]});
  // Common labeled or line-separated education; missing dates remain blank.
  let education=null,pending=[];
  const qualification=/\b(?:bachelor|master|doctor|associate|degree|diploma|certificate|certification|BSc|BS|BA|MBA|PhD)\b/i;
  for(const line of sections.education){
    const parts=line.split(/\s*[|·]\s*|\s+[–—]\s+/);
    if(parts.length>=2){const dates=parts.find(p=>datePattern.test(p)||/in progress|expected|completed/i.test(p))||'';const other=parts.filter(p=>p!==dates);resume.education.push({school:other[0]||'',qualification:other[1]||'',dates});education=null;pending=[];}
    else if(datePattern.test(line)||/in progress|expected|completed/i.test(line)){education={school:pending.find(p=>!qualification.test(p))||'',qualification:pending.find(p=>qualification.test(p))||'',dates:line};resume.education.push(education);pending=[];}
    else if(education&&!education.qualification&&qualification.test(line))education.qualification=line;
    else pending.push(line);
  }
  if(pending.length)resume.education.push({school:pending.find(p=>!qualification.test(p))||'',qualification:pending.find(p=>qualification.test(p))||'',dates:''});
  resume.source='Uploaded master resume';resume.importedText=text;
  if(resume.roles.length>30||resume.education.length>20)throw new Error('This resume has too many entries. Upload a shorter version.');
  return resume;
}

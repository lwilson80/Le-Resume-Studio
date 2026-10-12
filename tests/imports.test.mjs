import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {extractResumeText,parseResumeText,validateResumeFile,wordXmlText} from '../dist/imports.js';
import {createBlankMaster} from '../dist/resume.js';
import {resumeText,tailorResume} from '../dist/engine.js';
import {createDocx,createPdf} from '../dist/exports.js';
import {setup,withFormData} from './dom-adapter.mjs';
const own={...createBlankMaster(),name:'Avery Taylor',email:'avery@example.com',phone:'(202) 555-0148',linkedin:'https://www.linkedin.com/in/example',summary:'Business analyst supporting reports and requirements.',competencies:['SQL','Requirements Analysis'],roles:[{employer:'Example Company',title:'Business Analyst',dates:'2022 to Present',bullets:['Analyzed requirements and SQL reports.','Documented processes for stakeholders.']}],skills:[{group:'Data',items:['SQL','Reporting']}],education:[{school:'Example University',dates:'2020',qualification:'Bachelor of Science'}]};
const plain=resumeText(own),key='lw-resume-studio-master-v1';
const file=(text,name='resume.txt')=>Object.assign(new Blob([text]),{name});

test('Plain-text import preserves facts, roles, skills and education without adding qualifications',async()=>{
  const text=await extractResumeText(file(plain));const draft=parseResumeText(text);
  assert.equal(draft.name,'AVERY TAYLOR');assert.equal(draft.email,own.email);
  assert.deepEqual(draft.roles.map(({headerOrder,...facts})=>facts),own.roles);assert.deepEqual(draft.roles[0].headerOrder,['title','employer','dates']);assert.deepEqual(draft.skills,own.skills);assert.deepEqual(draft.education,own.education);
  assert.deepEqual(draft.competencies,own.competencies);assert.equal(draft.summary,own.summary);assert.equal(draft.importedText,plain.trim());
});
test('File validation rejects unsupported, empty, oversized and disguised files and unreadable text',async()=>{
  for(const [input,message] of [[{name:'a.doc',size:80},/docx/],[{name:'a.txt',size:0},/nonempty/],[{name:'a.pdf',size:11*1024*1024},/10 MB/]])assert.throws(()=>validateResumeFile(input),message);
  await assert.rejects(extractResumeText(file('this is not a PDF'.repeat(3),'resume.pdf')),/valid PDF/);
  await assert.rejects(extractResumeText(file('this is not Word'.repeat(3),'resume.docx')),/valid Word/);
  await assert.rejects(extractResumeText(file('too short')),/usable resume text/);
});
test('Word extraction decodes text and preserves paragraphs without rendering markup',()=>{
  assert.equal(wordXmlText('<w:document><w:p><w:r><w:t>Avery &amp; Taylor</w:t></w:r></w:p><w:p><w:r><w:t>&lt;script&gt;</w:t></w:r></w:p></w:document>'),'Avery & Taylor\n<script>');
});
test('Actual generated Word and PDF resumes can be extracted and reviewed',async()=>{
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/docx.js',import.meta.url),'utf8'));
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/pdf-lib.min.js',import.meta.url),'utf8'));
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'));
  // Text extraction does not render canvas. A constructor is sufficient for PDF.js's unused rendering constant.
  globalThis.DOMMatrix ||= class DOMMatrix {};
  const zip=globalThis.JSZip;const pdf=await import('../dist/vendor/pdfjs/pdf.mjs');
  const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
  for(const [format,blob] of [['docx',await createDocx(own)],['pdf',new Blob([await createPdf(own,globalThis.PDFLib,fonts)])]]){
    const imported=await extractResumeText(Object.assign(blob,{name:'resume.'+format}),{loadZip:async()=>zip,loadPDF:async()=>pdf});
    assert.match(imported,/AVERY TAYLOR/);assert.match(imported,/Example Company/);assert.match(imported,/Analyzed requirements/);
    const parsed=parseResumeText(imported);assert.equal(parsed.email,own.email);assert.equal(parsed.roles[0].employer,'Example Company');assert.equal(parsed.roles[0].title,'Business Analyst');assert.ok(parsed.roles[0].bullets.length>=2);
  }
});
test('Uploading prepares an editable draft, saving persists it, and removing it stays blank after reopening',async()=>{
  let ui=await setup({},false,{fresh:true});await ui.get('open-master').dispatch('click');
  ui.get('master-upload').files=[file(plain)];await ui.get('master-upload').dispatch('change');
  assert.equal(ui.values.has(key),false);assert.equal(ui.get('tailor-button').disabled,true);assert.equal(ui.get('m-email').value,own.email);
  assert.equal(ui.get('master-import-preview').hidden,false);assert.equal(ui.get('master-import-text').value,plain.trim());assert.equal(ui.doc.activeElement,ui.get('m-name'));
  await withFormData(ui.doc,()=>ui.get('master-form').dispatch('submit'));
  assert.equal(JSON.parse(ui.values.get(key)).source,'Uploaded master resume');assert.equal(ui.get('tailor-button').disabled,false);
  await ui.get('open-master').dispatch('click');await ui.get('restore-master').dispatch('click');
  assert.deepEqual(JSON.parse(ui.values.get(key)),createBlankMaster());assert.equal(ui.get('master-import-text').value,'');
  ui=await setup(Object.fromEntries(ui.values),false,{fresh:true});await ui.get('open-master').dispatch('click');assert.equal(ui.get('m-name').value,'');assert.equal(ui.get('master-import-preview').hidden,true);
});
test('Clearing while an upload is pending prevents old file contents from repopulating the master',async()=>{
  const ui=await setup({},false,{fresh:true});await ui.get('open-master').dispatch('click');
  let finish;const pending=new Promise(resolve=>{finish=resolve;});
  ui.get('master-upload').files=[{name:'resume.txt',size:100,arrayBuffer:()=>pending}];
  const importing=ui.get('master-upload').dispatch('change');assert.equal(ui.get('master-save').disabled,true);
  await ui.get('restore-master').dispatch('click');finish(new TextEncoder().encode(plain).buffer);await importing;
  assert.deepEqual(JSON.parse(ui.values.get(key)),createBlankMaster());assert.equal(ui.get('master-import-text').value,'');assert.equal(ui.get('master-editor').innerHTML,'');
});
test('Bad uploads preserve a saved master and focus the file input with an accessible error',async()=>{
  const ui=await setup({[key]:JSON.stringify(own)},false,{fresh:true});await ui.get('open-master').dispatch('click');
  ui.get('master-upload').files=[file('unreadable','resume.doc')];await ui.get('master-upload').dispatch('change');
  assert.deepEqual(JSON.parse(ui.values.get(key)),own);assert.equal(ui.doc.activeElement,ui.get('master-upload'));assert.equal(ui.get('master-import-error').hidden,false);assert.equal(ui.get('master-save').disabled,false);
});

test('Every final accomplishment stays with its role, including short text and years, before the next heading',()=>{
  const text=`Avery Taylor\nSUMMARY\nBusiness analyst supporting reporting.\nSKILLS\nReporting\nEXPERIENCE\nSenior Analyst\nExample Company\n2022 to Present\n• Analyzed reports.\nWon recognition in 2023.\nAnalyst\nEarlier Company\n2020 to 2022\n• Reviewed requirements.\nClient support\nEDUCATION\nExample University\n2020\nBachelor of Science`;
  const draft=parseResumeText(text);
  assert.equal(draft.roles.length,2);assert.deepEqual(draft.roles[0].bullets,['Analyzed reports.','Won recognition in 2023.']);assert.deepEqual(draft.roles[1].bullets,['Reviewed requirements.','Client support']);
  assert.deepEqual(draft.roles.map(r=>[r.title,r.employer,r.dates]),[['Senior Analyst','Example Company','2022 to Present'],['Analyst','Earlier Company','2020 to 2022']]);
  const result=tailorResume(draft,'Our Analyst supports reporting, reviews requirements and provides client support. Analyze reports and document processes for business stakeholders.',{length:'detailed'});
  assert.deepEqual(result.resume.roles.map(r=>[r.title,r.employer,r.dates]),draft.roles.map(r=>[r.title,r.employer,r.dates]));
  assert.ok(result.resume.roles[0].bullets.some(b=>b.includes('2023')));assert.ok(!result.resume.roles[1].bullets.some(b=>b.includes('2023')));
  assert.match(resumeText(result.resume),/Senior Analyst\nExample Company\n2022 to Present/);
});
test('Word numbering identifies a final list paragraph even when its text resembles a date or heading',()=>{
  const paragraph=text=>`<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
  const extracted=wordXmlText(`<w:document>${paragraph('2020 to 2022')}${paragraph('Technical skills')}</w:document>`);
  assert.equal(extracted,'• 2020 to 2022\n• Technical skills');
  const draft=parseResumeText('Avery Taylor\nEXPERIENCE\nAnalyst\nExample Company\n2023 to Present\n'+extracted);
  assert.deepEqual(draft.roles[0].bullets,['2020 to 2022','Technical skills']);assert.equal(draft.roles.length,1);
});
test('Company-first and inline headings preserve their imported field order and all final bullets',()=>{
  const draft=parseResumeText('Avery Taylor\nEXPERIENCE\nExample Company\nSenior Analyst\n2022 to Present\n• First role accomplishment.\nFinal task\nCoordinator | Earlier Company | 2020 – 2022\n• Earlier accomplishment.\nLast task');
  assert.deepEqual(draft.roles[0].headerOrder,['employer','title','dates']);assert.deepEqual(draft.roles[1].headerOrder,['title','employer','dates']);
  assert.match(resumeText(draft),/Example Company\nSenior Analyst\n2022 to Present/);assert.match(resumeText(draft),/Coordinator\nEarlier Company\n2020 – 2022/);
  assert.equal(draft.roles[0].bullets.at(-1),'Final task');assert.equal(draft.roles[1].bullets.at(-1),'Last task');
});

test('Word, PDF and text exports retain the source role/company/year heading order and final accomplishment',async()=>{
  const zip=globalThis.JSZip,pdf=await import('../dist/vendor/pdfjs/pdf.mjs');const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
  for(const order of [['title','employer','dates'],['employer','title','dates']]){
    const r={...own,roles:[{...own.roles[0],headerOrder:order,bullets:['Analyzed reports.','Final responsibility.']}]};
    for(const [ext,blob] of [['txt',new Blob([resumeText(r)])],['docx',await createDocx(r)],['pdf',new Blob([await createPdf(r,globalThis.PDFLib,fonts)])]]){
      const text=await extractResumeText(Object.assign(blob,{name:'fictional.'+ext}),{loadZip:async()=>zip,loadPDF:async()=>pdf});
      const start=text.indexOf('PROFESSIONAL EXPERIENCE');const body=text.slice(start);
      assert.ok(body.indexOf(r.roles[0][order[0]])<body.indexOf(r.roles[0][order[1]]));assert.ok(body.indexOf(r.roles[0][order[1]])<body.indexOf(r.roles[0].dates));
      const parsed=parseResumeText(text);assert.deepEqual(parsed.roles[0].headerOrder,order);assert.equal(parsed.roles[0].bullets.at(-1),'Final responsibility.');
    }
  }
});

// DOM-adapter checks of application handlers. These do not substitute for visual browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume} from '../dist/engine.js';
import {createDocx,createPdf,createCoverDocx,createCoverPdf} from '../dist/exports.js';
import {readDownloadTransfer} from '../dist/downloads.js';
import {setup} from './dom-adapter.mjs';

test('Returning visitor starts with a blank workspace, tailors from their saved master, persists a version, and switches tabs',async()=>{
  const {get,values}=await setup();
  assert.equal(get('resume-document').innerHTML,'');
  assert.equal(get('cover-document').innerHTML,'');
  assert.equal(get('download-docx').disabled,true);
  get('job-description').value='Seeking a Business Applications Analyst with SQL, Salesforce, UAT, requirements analysis, incident resolution and technical documentation. Build reports, support application enhancements and work with stakeholders. Jira experience is preferred.';
  get('job-title').value='Business Applications Analyst';get('company').value='Test Company';
  await get('tailor-form').dispatch('submit');
  assert.equal(get('form-error').hidden,true);
  assert.equal(get('download-docx').disabled,false);
  assert.equal(get('download-pdf').disabled,false);
  assert.ok(get('resume-document').innerHTML.includes(MASTER_RESUME.name.toUpperCase()));
  assert.ok(get('resume-document').innerHTML.includes('2020 to 2026'));
  assert.ok(get('resume-document').innerHTML.includes('User Acceptance Testing (UAT)'));
  assert.ok(get('keywords-panel').innerHTML.includes('Jira'));
  assert.ok(!get('resume-document').innerHTML.includes('Jira'));
  const history=JSON.parse(values.get('lw-resume-studio-history-v1'));
  assert.equal(history.length,1);assert.equal(history[0].title,'Business Applications Analyst');
  assert.deepEqual(history[0].master,MASTER_RESUME);
  assert.ok(history[0].coverLetter.paragraphs[0].includes('Test Company'));
  assert.ok(get('cover-document').innerHTML.includes('Dear Hiring Manager,'));
  assert.ok(get('keywords-panel').innerHTML.includes('Cover letter'));
  assert.ok(get('keywords-panel').innerHTML.includes('10/10 target'));
  await get('tab-writing').dispatch('click');assert.equal(get('writing-panel').hidden,false);
  assert.ok(get('writing-panel').innerHTML.includes('over 20 years'));
  assert.ok(get('writing-panel').innerHTML.includes('Bullets with action verbs'));
  await get('tab-cover').dispatch('click');
  assert.equal(get('cover-panel').hidden,false);assert.equal(get('resume-panel').hidden,true);
  assert.equal(get('export-document').value,'cover');
  assert.equal(get('copy-resume').attrs['aria-label'],'Copy cover letter text');
  await get('edit-output').dispatch('click');assert.equal(get('cover-edit-dialog').open,true);
  assert.ok(get('cover-editor').innerHTML.includes('Test Company'));
  await get('tab-keywords').dispatch('click');
  assert.equal(get('keywords-panel').hidden,false);assert.equal(get('resume-panel').hidden,true);
  await get('open-master').dispatch('click');assert.equal(get('master-dialog').open,true);
  assert.ok(get('master-import-text').value.includes('Mortgage Insurance Operations Analyst'));
  await get('open-history').dispatch('click');assert.ok(get('history-list').innerHTML.includes('Test Company'));
});

const resetJd='A Business Applications Analyst will support application enhancements, UAT, requirements analysis, root cause analysis, training and technical documentation. Build reports and work with internal stakeholders.';
function assertBlankWorkspace({get}) {
  for(const id of ['job-description','job-title','company','extra-keywords'])assert.equal(get(id).value,'');
  assert.equal(get('length').value,'balanced');assert.equal(get('char-count').textContent,'0 / 40,000');
  assert.equal(get('resume-document').innerHTML,'');assert.equal(get('cover-document').innerHTML,'');
  assert.equal(get('match-strip').hidden,true);assert.equal(get('keyword-count').textContent,'');
  assert.equal(get('match-title').textContent,'');assert.equal(get('match-subtitle').textContent,'');
  assert.equal(get('tab-resume').attrs['aria-selected'],'true');assert.equal(get('export-document').value,'resume');
  for(const id of ['edit-output','export-document','copy-resume','download-pdf','download-docx','download-txt'])assert.equal(get(id).disabled,true);
  assert.equal(get('form-error').hidden,true);assert.equal(get('toast').textContent,'');
}
test('Opening the app ignores and removes old drafts while preserving the master and saved applications',async()=>{
  const master=structuredClone(MASTER_RESUME);master.name='My Updated Name';master.source='Edited master resume';
  const version=tailorResume(master,resetJd,{title:'Previous Role',company:'Previous Company'});
  const stored={'lw-resume-studio-master-v1':JSON.stringify(master),'lw-resume-studio-history-v1':JSON.stringify([version]),'lw-resume-studio-draft-v1':JSON.stringify({jd:resetJd,title:'Previous Role',company:'Previous Company',length:'detailed',extra:'SQL'})};
  const ui=await setup(stored);assertBlankWorkspace(ui);
  assert.equal(ui.values.has('lw-resume-studio-draft-v1'),false);
  assert.equal(ui.values.get('lw-resume-studio-master-v1'),stored['lw-resume-studio-master-v1']);
  assert.equal(ui.values.get('lw-resume-studio-history-v1'),stored['lw-resume-studio-history-v1']);
  assert.equal(ui.get('history-count').textContent,'1');
  await ui.get('open-master').dispatch('click');assert.equal(ui.get('profile-name').textContent,'My Updated Name');
  await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  assert.equal(ui.get('job-description').value,resetJd);assert.ok(ui.get('resume-document').innerHTML.includes('MY UPDATED NAME'));
});
test('Refreshing or reopening clears both sections but saved versions can be reopened explicitly',async()=>{
  let ui=await setup();ui.get('job-description').value=resetJd;ui.get('company').value='Keep This Application';
  await ui.get('job-description').dispatch('input');await ui.get('tailor-form').dispatch('submit');
  assert.equal(ui.values.has('lw-resume-studio-draft-v1'),false);
  const stored=Object.fromEntries(ui.values);ui=await setup(stored);assertBlankWorkspace(ui);
  assert.equal(ui.get('history-count').textContent,'1');
  await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  assert.equal(ui.get('job-description').value,resetJd);assert.ok(ui.get('cover-document').innerHTML.includes('Keep This Application'));
  await ui.get('tab-cover').dispatch('click');await ui.get('download-txt').dispatch('click');
  assert.equal(ui.get('save-dialog').open,true);
  assert.match(ui.get('save-file').href,/^blob:/);assert.match(ui.get('save-browser').href,/download\.html$/);
  const saved=ui.values.get('lw-resume-studio-history-v1');await ui.page.dispatch('pageshow',{persisted:true});assertBlankWorkspace(ui);
  assert.equal(ui.get('save-dialog').open,false);assert.equal(ui.get('save-file').attrs.href,undefined);assert.equal(ui.get('save-browser').attrs.href,undefined);
  assert.equal(ui.get('save-file').href,'');assert.equal(ui.get('save-browser').href,'');
  assert.equal(ui.values.get('lw-resume-studio-history-v1'),saved);
  await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  const pendingExport=ui.get('download-txt').dispatch('click');
  await ui.page.dispatch('pageshow',{persisted:true});await pendingExport;assertBlankWorkspace(ui);
  assert.equal(ui.get('save-dialog').open,false);assert.equal(ui.get('save-file').attrs.href,undefined);
  assert.equal(ui.get('download-txt').attrs['aria-busy'],'false');
});
test('Browser-restored input values are cleared on pageshow and pending tailoring cannot repopulate the workspace',async()=>{
  const ui=await setup();
  ui.get('job-description').value=resetJd;ui.get('job-title').value='Restored title';ui.get('company').value='Restored company';ui.get('extra-keywords').value='SQL';ui.get('length').value='detailed';
  await ui.page.dispatch('pageshow',{persisted:false});assertBlankWorkspace(ui);
  ui.get('job-description').value=resetJd;const pending=ui.get('tailor-form').dispatch('submit');
  assert.equal(ui.get('tailor-button').disabled,true);
  await ui.page.dispatch('pageshow',{persisted:true});await pending;assertBlankWorkspace(ui);
  assert.equal(ui.get('history-count').textContent,'0');assert.equal(ui.get('tailor-button').disabled,false);
  assert.equal(ui.get('tailor-form').attrs['aria-busy'],'false');assert.equal(ui.get('output-panel').attrs['aria-busy'],'false');
  ui.get('job-description').value=resetJd;await ui.get('tailor-form').dispatch('submit');assert.equal(ui.get('history-count').textContent,'1');
});

test('Clear saved versions deletes both documents on one click, revokes prepared files, and stays empty after reopening',async()=>{
  const master=structuredClone(MASTER_RESUME);master.source='Edited master resume';master.name='My Updated Name';
  const first=tailorResume(master,resetJd,{title:'First Role',company:'First Company'});
  const second=tailorResume(master,resetJd,{title:'Second Role',company:'Second Company'});
  const stored={'lw-resume-studio-master-v1':JSON.stringify(master),'lw-resume-studio-history-v1':JSON.stringify([first,second]),'unrelated-setting':'keep this'};
  let ui=await setup(stored,true);
  await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'1'}})}});
  await ui.get('tab-cover').dispatch('click');await ui.get('download-txt').dispatch('click');
  const preparedFile=ui.get('save-file').href;assert.ok((await(await fetch(preparedFile)).text()).includes('Second Company'));
  ui.get('save-dialog').close();await ui.get('open-history').dispatch('click');
  globalThis.confirm=()=>assert.fail('Deletion must not depend on a browser confirmation');
  await ui.get('clear-history').dispatch('click');assertBlankWorkspace(ui);
  assert.equal(ui.values.has('lw-resume-studio-history-v1'),false);assert.equal(ui.get('history-count').textContent,'0');
  assert.equal(ui.get('history-dialog').open,true);assert.equal(ui.doc.activeElement,ui.get('history-heading'));
  assert.equal(ui.get('clear-history').disabled,true);assert.ok(!ui.get('history-list').innerHTML.includes('data-open-version'));
  assert.match(ui.get('history-dialog').querySelector('[data-dialog-status]').textContent,/All saved resumes and cover letters have been deleted/);
  assert.equal(ui.get('save-file').href,'');assert.equal(ui.get('save-browser').href,'');
  await assert.rejects(fetch(preparedFile));
  assert.equal(ui.values.get('lw-resume-studio-master-v1'),stored['lw-resume-studio-master-v1']);assert.equal(ui.values.get('unrelated-setting'),'keep this');
  await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'1'}})}});assertBlankWorkspace(ui);
  ui=await setup(Object.fromEntries(ui.values));assertBlankWorkspace(ui);assert.equal(ui.get('history-count').textContent,'0');
  await ui.get('open-master').dispatch('click');assert.equal(ui.get('profile-name').textContent,'My Updated Name');
});
test('Clearing saved versions cancels in-flight tailoring so deleted applications cannot reappear',async()=>{
  const version=tailorResume(MASTER_RESUME,resetJd,{company:'Delete This Company'});
  const ui=await setup({'lw-resume-studio-history-v1':JSON.stringify([version])});
  ui.get('job-description').value=resetJd;const pending=ui.get('tailor-form').dispatch('submit');
  await ui.get('open-history').dispatch('click');await ui.get('clear-history').dispatch('click');await pending;
  assertBlankWorkspace(ui);assert.equal(ui.values.has('lw-resume-studio-history-v1'),false);assert.equal(ui.get('history-count').textContent,'0');
  assert.equal(ui.get('tailor-button').disabled,false);assert.equal(ui.get('tailor-form').attrs['aria-busy'],'false');
});
test('Stored documents are deleted with an empty replacement when key removal is restricted',async()=>{
  const version=tailorResume(MASTER_RESUME,resetJd,{company:'Remove With Fallback'}),values=new Map([['lw-resume-studio-history-v1',JSON.stringify([version])]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>{if(key==='lw-resume-studio-history-v1')throw new DOMException('Restricted','SecurityError');values.delete(key);}};
  const ui=await setup({},false,{storage});await ui.get('open-history').dispatch('click');await ui.get('clear-history').dispatch('click');
  assertBlankWorkspace(ui);assert.equal(values.get('lw-resume-studio-history-v1'),'[]');assert.equal(ui.get('clear-history').disabled,true);
  assert.match(ui.get('history-dialog').querySelector('[data-dialog-status]').textContent,/have been deleted/);
  const reopened=await setup(Object.fromEntries(values));assert.equal(reopened.get('history-count').textContent,'0');
});
test('A storage deletion failure reports incomplete deletion and permits a successful retry',async()=>{
  const version=tailorResume(MASTER_RESUME,resetJd,{company:'Retry Deletion'}),values=new Map([['lw-resume-studio-history-v1',JSON.stringify([version])]]);
  let blocked=true;
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(blocked)throw new DOMException('Blocked','SecurityError');values.set(key,value);},removeItem:key=>{if(key==='lw-resume-studio-history-v1'&&blocked)throw new DOMException('Blocked','SecurityError');values.delete(key);}};
  const ui=await setup({},false,{storage});await ui.get('open-history').dispatch('click');await ui.get('clear-history').dispatch('click');
  assertBlankWorkspace(ui);assert.equal(ui.get('clear-history').disabled,false);assert.equal(values.has('lw-resume-studio-history-v1'),true);
  const status=ui.get('history-dialog').querySelector('[data-dialog-status]');assert.match(status.textContent,/deletion from browser storage could not be confirmed/);assert.doesNotMatch(status.textContent,/have been deleted/);
  blocked=false;await ui.get('clear-history').dispatch('click');assert.equal(values.has('lw-resume-studio-history-v1'),false);
  assert.equal(ui.get('clear-history').disabled,true);assert.match(status.textContent,/have been deleted/);
});
test('Deletion in another tab discards local copies and pending exports without reacting to unrelated storage',async()=>{
  const version=tailorResume(MASTER_RESUME,resetJd,{company:'Clear Across Tabs'});
  for(const newValue of [null,'[]']) {
    const ui=await setup({'lw-resume-studio-history-v1':JSON.stringify([version])});
    await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
    await ui.page.dispatch('storage',{key:'unrelated-setting',newValue:null});assert.ok(ui.get('resume-document').innerHTML.includes(MASTER_RESUME.name.toUpperCase()));
    await ui.page.dispatch('storage',{key:'lw-resume-studio-history-v1',newValue:'[]',storageArea:{}});assert.equal(ui.get('history-count').textContent,'1');
    await ui.page.dispatch('storage',{key:'lw-resume-studio-history-v1',newValue:JSON.stringify([version])});assert.equal(ui.get('history-count').textContent,'1');
    await ui.get('open-history').dispatch('click');const exporting=ui.get('download-txt').dispatch('click');
    if(newValue===null)ui.values.delete('lw-resume-studio-history-v1');else ui.values.set('lw-resume-studio-history-v1',newValue);
    await ui.page.dispatch('storage',{key:'lw-resume-studio-history-v1',newValue,storageArea:globalThis.localStorage});await exporting;
    assertBlankWorkspace(ui);assert.equal(ui.get('history-count').textContent,'0');assert.equal(ui.get('save-dialog').open,false);assert.equal(ui.get('save-file').href,'');
    assert.equal(ui.get('clear-history').disabled,true);assert.match(ui.get('history-dialog').querySelector('[data-dialog-status]').textContent,/deleted in another tab/);
    await ui.get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});assertBlankWorkspace(ui);
  }
});

test('Earlier saved resumes receive a cover letter without changing the saved resume',async()=>{
  const version=tailorResume(MASTER_RESUME,'Our Billing Analyst manages WIP, AR, billing recommendations and reports. Review realization and utilization, support month-end close and work with partners on engagement economics.',{title:'Billing Analyst',company:'Earlier Company'});
  delete version.coverLetter;version.id='saved-before-cover-letters';version.resume.name='Saved Version Name';
  const before=structuredClone(version.resume);
  const {get,values}=await setup({'lw-resume-studio-history-v1':JSON.stringify([version])});
  await get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  const stored=JSON.parse(values.get('lw-resume-studio-history-v1'));
  assert.equal(stored.length,1);assert.deepEqual(stored[0].resume,before);
  assert.equal(stored[0].coverLetter.signature,'Saved Version Name');
  assert.ok(stored[0].coverLetter.paragraphs[0].includes('Earlier Company'));
  assert.ok(get('cover-document').innerHTML.includes('SAVED VERSION NAME'));
});
test('Cover letter edits are saved and retained when the application is reopened',async()=>{
  const {get,values}=await setup();
  get('job-description').value='A Business Applications Analyst will support application enhancements, user acceptance testing, requirements analysis, root cause analysis, training and technical documentation. Build reports and work with internal stakeholders.';
  await get('tailor-form').dispatch('submit');await get('tab-cover').dispatch('click');
  const prior=JSON.parse(values.get('lw-resume-studio-history-v1'))[0];
  const fields={};for(const key of ['date','company','subject','salutation','closing','signature'])fields['c-'+key]=prior.coverLetter[key]||'';
  prior.coverLetter.paragraphs.forEach((p,i)=>fields['c-paragraph-'+i]=p);
  fields['c-salutation']='Dear Ms. Taylor,';fields['c-paragraph-0']='I am pleased to submit my application and would welcome a conversation about the role.';
  const native=globalThis.FormData;globalThis.FormData=class{constructor(form){this.form=form;}get(key){return this.form.fields[key];}};
  get('cover-form').fields=fields;
  try{await get('cover-form').dispatch('submit');}finally{globalThis.FormData=native;}
  const stored=JSON.parse(values.get('lw-resume-studio-history-v1'))[0];
  assert.equal(stored.coverLetter.edited,true);assert.equal(stored.coverLetter.salutation,'Dear Ms. Taylor,');
  await get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  assert.ok(get('cover-document').innerHTML.includes('Dear Ms. Taylor,'));
  assert.ok(get('cover-document').innerHTML.includes('I am pleased to submit my application'));
});
test('Short descriptions return a helpful error without enabling exports',async()=>{
  const {get}=await setup();get('job-description').value='SQL';
  await get('tailor-form').dispatch('submit');
  assert.equal(get('form-error').hidden,false);assert.match(get('form-error').textContent,/fuller job description/);
  assert.equal(get('download-pdf').disabled,true);
  assert.equal(get('tailor-button').disabled,false);
});
test('Stored contact text is safely escaped and corrupt storage falls back to a blank master',async()=>{
  const altered=structuredClone(MASTER_RESUME);altered.name='<img src=x onerror=alert(1)>';
  let ui=await setup({'lw-resume-studio-master-v1':JSON.stringify(altered)});
  await ui.get('open-master').dispatch('click');
  assert.ok(ui.get('master-import-text').value.toLowerCase().includes('<img'));
  assert.equal(ui.get('master-import-text').children.length,0);
  ui=await setup({'lw-resume-studio-master-v1':'{"name":"Broken","roles":[null]}','lw-resume-studio-history-v1':'oops'});
  await ui.get('open-master').dispatch('click');assert.equal(ui.get('master-import-text').value,'');
});
test('Inside ChatGPT, export offers a browser page carrying the edited document',async()=>{
  const version=tailorResume(MASTER_RESUME,'A Business Applications Analyst will support application enhancements, UAT, requirements analysis, root cause analysis, training and technical documentation. Build reports and work with stakeholders.',{title:'Business Applications Analyst',company:'Current Company'});
  version.id='edited-version';version.coverLetter.edited=true;version.coverLetter.paragraphs[0]='My edited opening — preserved exactly for this company.';
  const {get}=await setup({'lw-resume-studio-history-v1':JSON.stringify([version])},true);
  await get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  await get('tab-cover').dispatch('click');
  const preparing=get('download-txt').dispatch('click');
  await get('tab-resume').dispatch('click');await preparing;
  assert.equal(get('save-dialog').open,true);
  assert.equal(get('save-browser').className,'dark-button');
  assert.match(get('save-status').textContent,/browser tab/);
  const transfers=new Map();globalThis.sessionStorage={setItem:(k,v)=>transfers.set(k,v),getItem:k=>transfers.get(k),removeItem:k=>transfers.delete(k)};let child;globalThis.open=url=>{const data=new Map(transfers);child={location:{hash:new URL(url).hash,pathname:'/download.html',search:''},history:{replaceState(){}},sessionStorage:{setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)}};return {};};
  await get('save-browser').dispatch('click');const payload=readDownloadTransfer(child);
  assert.equal(payload.kind,'cover');assert.equal(payload.format,'txt');
  assert.equal(payload.letter.paragraphs[0],version.coverLetter.paragraphs[0]);
  assert.match(get('save-filename').textContent,/Current_Company_Cover_Letter\.txt$/);
  const contents=await (await fetch(get('save-file').href)).text();
  assert.ok(contents.includes(version.coverLetter.paragraphs[0]));
  assert.doesNotMatch(get('save-status').textContent,/File saved/);
  await get('save-file').dispatch('click');
  assert.match(get('save-status').textContent,/Download requested/);
  // A second export replaces the old save handler and retains the right file.
  await get('download-txt').dispatch('click');
  assert.equal(get('save-file').events.click.length,1);
  assert.match(get('save-filename').textContent,/_Resume\.txt$/);
});
test('The shipped browser export libraries generate actual PDF and DOCX bytes',async()=>{
  // Use one realm, just as the browser does; pdf-lib uses Array instanceof checks.
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/pdf-lib.min.js',import.meta.url),'utf8'));
  vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/docx.js',import.meta.url),'utf8'));
  const jd='Our Billing Analyst manages WIP, AR, billing recommendations, reports, forecasts and month-end close. Track realization and utilization and advise partners on engagement economics. Experience with BillBlast is preferred.';
  const result=tailorResume(MASTER_RESUME,jd);
  const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
  const pdf=await createPdf(result.resume,globalThis.PDFLib,fonts);
  assert.equal(new TextDecoder().decode(pdf.slice(0,5)),'%PDF-');
  const blob=await createDocx(result.resume,globalThis.docx);
  const docx=new Uint8Array(await blob.arrayBuffer());
  assert.equal(docx[0],0x50);assert.equal(docx[1],0x4b);assert.ok(docx.length>5000);
  const letterPdf=await createCoverPdf(result.coverLetter,result.resume,globalThis.PDFLib,fonts);
  assert.equal(new TextDecoder().decode(letterPdf.slice(0,5)),'%PDF-');
  const letterBlob=await createCoverDocx(result.coverLetter,result.resume,globalThis.docx);
  const letterDocx=new Uint8Array(await letterBlob.arrayBuffer());
  assert.equal(letterDocx[0],0x50);assert.equal(letterDocx[1],0x4b);assert.ok(letterDocx.length>5000);
});

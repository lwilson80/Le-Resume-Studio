// Fresh-browser privacy and master-onboarding journeys, using a DOM adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup,withFormData,enterMaster} from './dom-adapter.mjs';
import {createBlankMaster} from '../dist/resume.js';
import {tailorResume,resumeText} from '../dist/engine.js';

const key='lw-resume-studio-master-v1',historyKey='lw-resume-studio-history-v1';
const jd='The Business Analyst conducts requirements analysis, uses SQL, prepares reports and technical documentation, and supports user acceptance testing with stakeholders.';
const own={...createBlankMaster(),name:'Avery Taylor',email:'avery@example.com',summary:'Business analyst supporting reporting and process improvements.',competencies:['SQL','Requirements Analysis','Technical Documentation','User Acceptance Testing'],roles:[{employer:'Example Company',title:'Business Analyst',dates:'2022 to Present',bullets:['Analyzed requirements and SQL reports for stakeholders.','Documented processes and supported user acceptance testing.']}],source:'Edited master resume'};

test('First-time visitors receive an empty master, empty workspace and no saved versions',async()=>{
  const ui=await setup({},false,{fresh:true});
  assert.equal(ui.get('tailor-button').disabled,true);assert.equal(ui.get('history-count').textContent,'0');
  assert.equal(ui.get('master-name').textContent,'No master resume added');assert.equal(ui.get('profile-name').textContent,'Your workspace');
  assert.equal(ui.values.has(key),false);assert.equal(ui.values.has(historyKey),false);
  for(const id of ['job-description','job-title','company','extra-keywords'])assert.equal(ui.get(id).value,'');
  assert.equal(ui.get('resume-document').innerHTML,'');assert.equal(ui.get('cover-document').innerHTML,'');
  await ui.get('open-master').dispatch('click');
  assert.equal(ui.get('master-import-text').value,'');assert.equal(ui.doc.getElementById('master-form'),null);
  assert.equal(ui.get('restore-master').disabled,true);
});

test('Published default assets contain no personal resume seed',async()=>{
  const factory=await fs.readFile(new URL('../dist/resume.js',import.meta.url),'utf8');
  const assets=await Promise.all(['index.html','download.html','app.js'].map(name=>fs.readFile(new URL('../dist/'+name,import.meta.url),'utf8')));
  assert.deepEqual(createBlankMaster().roles,[]);assert.equal(createBlankMaster().name,'');
  for(const source of [factory,...assets])assert.doesNotMatch(source,/Avery Taylor|AVERY TAYLOR|Example Company|MASTER_RESUME/);
});

test('New visitors upload complete work history without manual master editing controls',async()=>{
  const ui=await setup({},false,{fresh:true});await enterMaster(ui,own);
  assert.equal(ui.get('master-import-error').hidden,true);assert.equal(ui.get('tailor-button').disabled,false);
  const stored=JSON.parse(ui.values.get(key));assert.equal(stored.name,own.name);assert.equal(stored.roles[0].title,'Business Analyst');
  assert.equal(ui.doc.getElementById('master-editor'),null);assert.equal(ui.doc.getElementById('master-save'),null);assert.equal(ui.doc.getElementById('master-add-role'),null);assert.equal(ui.get('master-import-text').attrs.readonly,'');
  ui.get('job-description').value=jd;await ui.get('tailor-form').dispatch('submit');assert.ok(ui.get('resume-document').innerHTML.includes('AVERY TAYLOR'));assert.equal(ui.get('history-count').textContent,'1');
  const returning=await setup(Object.fromEntries(ui.values),false,{fresh:true});await returning.get('open-master').dispatch('click');assert.ok(returning.get('master-import-text').value.includes(own.name));
  const separate=await setup({},false,{fresh:true});await separate.get('open-master').dispatch('click');assert.equal(separate.get('master-import-text').value,'');assert.equal(separate.get('history-count').textContent,'0');
});
test('Incomplete uploads fail accessibly without replacing an existing saved master',async()=>{
  const ui=await setup({[key]:JSON.stringify(own)},false,{fresh:true});await ui.get('open-master').dispatch('click');
  ui.get('master-upload').files=[Object.assign(new Blob(['Avery Taylor\nEXPERIENCE\nExample Company\nAnalyst\n2022 to Present\n• Reviewed reports.']),{name:'incomplete.txt'})];
  await ui.get('master-upload').dispatch('change');assert.equal(ui.get('master-import-error').hidden,false);assert.equal(ui.doc.activeElement,ui.get('master-upload'));assert.deepEqual(JSON.parse(ui.values.get(key)),own);
});

test('Missing master can recover only this browser’s own history and survives clearing that history',async()=>{
  const version=tailorResume(own,jd);
  let ui=await setup({[historyKey]:JSON.stringify([version])},false,{fresh:true});
  assert.equal(JSON.parse(ui.values.get(key)).name,own.name);
  await ui.get('open-history').dispatch('click');await ui.get('clear-history').dispatch('click');
  assert.equal(ui.values.has(historyKey),false);assert.equal(JSON.parse(ui.values.get(key)).name,own.name);
  ui=await setup(Object.fromEntries(ui.values),false,{fresh:true});await ui.get('open-master').dispatch('click');assert.ok(ui.get('master-import-text').value.includes(own.name.toUpperCase()));
});

test('Intentional master clearing remains blank after reopening even when saved versions exist',async()=>{
  const version=tailorResume(own,jd);let ui=await setup({[key]:JSON.stringify(own),[historyKey]:JSON.stringify([version])},false,{fresh:true});
  await ui.get('open-master').dispatch('click');globalThis.confirm=()=>false;await ui.get('restore-master').dispatch('click');assert.equal(JSON.parse(ui.values.get(key)).name,own.name);
  globalThis.confirm=()=>true;await ui.get('restore-master').dispatch('click');assert.deepEqual(JSON.parse(ui.values.get(key)),createBlankMaster());assert.equal(ui.get('master-import-text').value,'');assert.equal(ui.get('master-upload').value,'');assert.equal(ui.get('master-import-preview').hidden,true);assert.equal(ui.get('resume-document').innerHTML,'');assert.equal(ui.get('history-count').textContent,'1');assert.equal(ui.get('tailor-button').disabled,true);
  ui=await setup(Object.fromEntries(ui.values),false,{fresh:true});await ui.get('open-master').dispatch('click');assert.equal(ui.get('master-import-text').value,'');assert.equal(ui.get('history-count').textContent,'1');
});

test('Blocked storage starts empty and allows an uploaded master only for the current session',async()=>{
  const storage={getItem(){throw new DOMException('Blocked','SecurityError');},setItem(){throw new DOMException('Blocked','SecurityError');}};
  const ui=await setup({},false,{storage,fresh:true});assert.equal(ui.get('tailor-button').disabled,true);
  await enterMaster(ui,own);assert.equal(ui.get('tailor-button').disabled,false);assert.equal(ui.get('storage-note').hidden,false);assert.match(ui.get('master-import-status').textContent,/ready in this tab/);
  ui.get('job-description').value=jd;await ui.get('tailor-form').dispatch('submit');assert.equal(ui.get('download-txt').disabled,false);
});

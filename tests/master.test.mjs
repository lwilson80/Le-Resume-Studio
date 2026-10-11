// Fresh-browser privacy and master-onboarding journeys, using a DOM adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup,withFormData,enterMaster} from './dom-adapter.mjs';
import {createBlankMaster} from '../dist/resume.js';
import {tailorResume} from '../dist/engine.js';

const key='lw-resume-studio-master-v1',historyKey='lw-resume-studio-history-v1';
const jd='The Business Analyst conducts requirements analysis, uses SQL, prepares reports and technical documentation, and supports user acceptance testing with stakeholders.';
const own={...createBlankMaster(),name:'Avery Taylor',email:'avery@example.com',summary:'Business analyst supporting reporting and process improvements.',competencies:['SQL','Requirements Analysis','Technical Documentation','User Acceptance Testing'],roles:[{employer:'Example Company',title:'Business Analyst',dates:'2022 to Present',bullets:['Analyzed requirements and SQL reports for stakeholders.','Documented processes and supported user acceptance testing.']}],source:'Edited master resume'};
const masterAction=(ui,button)=>withFormData(ui.doc,()=>ui.get('master-editor').dispatch('click',{target:button}));

test('First-time visitors receive an empty master, empty workspace and no saved versions',async()=>{
  const ui=await setup({},false,{fresh:true});
  assert.equal(ui.get('tailor-button').disabled,true);assert.equal(ui.get('history-count').textContent,'0');
  assert.equal(ui.get('master-name').textContent,'No master resume added');assert.equal(ui.get('profile-name').textContent,'Your workspace');
  assert.equal(ui.values.has(key),false);assert.equal(ui.values.has(historyKey),false);
  for(const id of ['job-description','job-title','company','extra-keywords'])assert.equal(ui.get(id).value,'');
  assert.equal(ui.get('resume-document').innerHTML,'');assert.equal(ui.get('cover-document').innerHTML,'');
  await ui.get('open-master').dispatch('click');
  for(const id of ['m-name','m-email','m-phone','m-linkedin','m-summary','m-competencies','m-employer-0','m-title-0','m-dates-0','m-bullets-0'])assert.equal(ui.get(id).value,'');
  assert.equal(ui.get('restore-master').disabled,true);
});

test('Published default assets contain no personal resume seed',async()=>{
  const factory=await fs.readFile(new URL('../dist/resume.js',import.meta.url),'utf8');
  const assets=await Promise.all(['index.html','download.html','app.js'].map(name=>fs.readFile(new URL('../dist/'+name,import.meta.url),'utf8')));
  assert.deepEqual(createBlankMaster().roles,[]);assert.equal(createBlankMaster().name,'');
  for(const source of [factory,...assets])assert.doesNotMatch(source,/Avery Taylor|AVERY TAYLOR|Example Advisory Group|Mortgage Insurance Operations Analyst|MASTER_RESUME/);
});

test('New visitors can add their own roles, skills and education without losing unsaved fields',async()=>{
  const ui=await setup({},false,{fresh:true});await ui.get('open-master').dispatch('click');
  for(const field of ['name','email','phone','linkedin','summary'])ui.get('m-'+field).value=own[field];
  ui.get('m-competencies').value=own.competencies.join('\n');
  for(const field of ['employer','title','dates'])ui.get('m-'+field+'-0').value=own.roles[0][field];
  ui.get('m-bullets-0').value=own.roles[0].bullets.join('\n');
  await masterAction(ui,ui.get('master-add-role'));assert.equal(ui.doc.activeElement,ui.get('m-employer-1'));
  assert.equal(ui.get('m-name').value,own.name);assert.equal(ui.get('m-bullets-0').value,own.roles[0].bullets.join('\n'));
  for(const [field,value] of Object.entries({employer:'Earlier Company',title:'Analyst',dates:'2020 to 2022',bullets:'Prepared reports and collaborated with stakeholders.'}))ui.get('m-'+field+'-1').value=value;
  await masterAction(ui,ui.get('master-add-skill'));ui.get('m-skill-group-0').value='Analysis';ui.get('m-skills-0').value='SQL, Reporting';
  await masterAction(ui,ui.get('master-add-education'));assert.equal(ui.doc.activeElement,ui.get('m-school-0'));
  ui.get('m-school-0').value='Example University';ui.get('m-qualification-0').value='Bachelor of Science';ui.get('m-edates-0').value='2020';
  await withFormData(ui.doc,()=>ui.get('master-form').dispatch('submit'));
  assert.equal(ui.get('master-error').hidden,true);assert.equal(ui.get('master-dialog').open,false);assert.equal(ui.get('tailor-button').disabled,false);
  const stored=JSON.parse(ui.values.get(key));assert.equal(stored.name,own.name);assert.equal(stored.roles.length,2);assert.equal(stored.skills[0].group,'Analysis');assert.equal(stored.education[0].school,'Example University');
  ui.get('job-description').value=jd;await ui.get('tailor-form').dispatch('submit');
  assert.equal(ui.get('form-error').hidden,true);assert.ok(ui.get('resume-document').innerHTML.includes('AVERY TAYLOR'));assert.ok(ui.get('resume-document').innerHTML.includes('Earlier Company'));
  assert.ok(ui.get('cover-document').innerHTML.includes('Avery Taylor'));assert.equal(ui.get('history-count').textContent,'1');
  const returning=await setup(Object.fromEntries(ui.values),false,{fresh:true});await returning.get('open-master').dispatch('click');assert.equal(returning.get('m-name').value,own.name);
  const separate=await setup({},false,{fresh:true});await separate.get('open-master').dispatch('click');assert.equal(separate.get('m-name').value,'');assert.equal(separate.get('history-count').textContent,'0');
});

test('Master validation identifies missing facts, and removal retains at least one role',async()=>{
  const ui=await setup({},false,{fresh:true});await ui.get('open-master').dispatch('click');
  await withFormData(ui.doc,()=>ui.get('master-form').dispatch('submit'));
  assert.equal(ui.get('master-error').hidden,false);assert.equal(ui.doc.activeElement,ui.get('m-name'));assert.equal(ui.values.has(key),false);
  await masterAction(ui,ui.get('master-add-role'));
  const remove=ui.get('master-editor').querySelectorAll('[data-master-action]').find(b=>b.dataset.masterAction==='remove-role'&&b.dataset.index==='1');
  await masterAction(ui,remove);assert.equal(ui.doc.activeElement,ui.get('master-add-role'));
  assert.equal(ui.get('master-editor').querySelectorAll('[data-master-action]').find(b=>b.dataset.masterAction==='remove-role').disabled,true);
});

test('Missing master can recover only this browser’s own history and survives clearing that history',async()=>{
  const version=tailorResume(own,jd);
  let ui=await setup({[historyKey]:JSON.stringify([version])},false,{fresh:true});
  assert.equal(JSON.parse(ui.values.get(key)).name,own.name);
  await ui.get('open-history').dispatch('click');await ui.get('clear-history').dispatch('click');
  assert.equal(ui.values.has(historyKey),false);assert.equal(JSON.parse(ui.values.get(key)).name,own.name);
  ui=await setup(Object.fromEntries(ui.values),false,{fresh:true});await ui.get('open-master').dispatch('click');assert.equal(ui.get('m-name').value,own.name);
});

test('Intentional master clearing remains blank after reopening even when saved versions exist',async()=>{
  const version=tailorResume(own,jd);let ui=await setup({[key]:JSON.stringify(own),[historyKey]:JSON.stringify([version])},false,{fresh:true});
  await ui.get('open-master').dispatch('click');globalThis.confirm=()=>false;await ui.get('restore-master').dispatch('click');assert.equal(JSON.parse(ui.values.get(key)).name,own.name);
  globalThis.confirm=()=>true;await ui.get('restore-master').dispatch('click');assert.deepEqual(JSON.parse(ui.values.get(key)),createBlankMaster());assert.equal(ui.get('history-count').textContent,'1');assert.equal(ui.get('tailor-button').disabled,true);
  ui=await setup(Object.fromEntries(ui.values),false,{fresh:true});await ui.get('open-master').dispatch('click');assert.equal(ui.get('m-name').value,'');assert.equal(ui.get('history-count').textContent,'1');
});

test('Blocked storage starts empty and allows an entered master only for the current session',async()=>{
  const storage={getItem(){throw new DOMException('Blocked','SecurityError');},setItem(){throw new DOMException('Blocked','SecurityError');}};
  const ui=await setup({},false,{storage,fresh:true});assert.equal(ui.get('tailor-button').disabled,true);
  await enterMaster(ui,own);assert.equal(ui.get('tailor-button').disabled,false);assert.equal(ui.get('storage-note').hidden,false);assert.match(ui.get('toast').textContent,/ready in this tab/);
  ui.get('job-description').value=jd;await ui.get('tailor-form').dispatch('submit');assert.equal(ui.get('download-txt').disabled,false);
});

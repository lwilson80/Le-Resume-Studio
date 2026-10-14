import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createBlankMaster} from '../dist/resume.js';
import {PrivateVault,VAULT_KEY} from '../dist/privacy.js';
import {setup} from './dom-adapter.mjs';
const pass='Fictional private passphrase 42';
const master={name:'Avery Taylor',phone:'',email:'avery@example.com',linkedin:'',summary:'Business analyst supporting reporting.',competencies:['Reporting'],roles:[{title:'Analyst',employer:'Example Company',dates:'2022 to Present',bullets:['Reviewed reports.']}],skills:[],education:[],source:'Edited master resume'};
function storage(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('Password protection stores authenticated ciphertext and rejects other passwords and tampered data',async()=>{
  const s=storage(),v=new PrivateVault(s);await v.create(pass,{master,history:[]});
  const saved=s.getItem(VAULT_KEY);assert.ok(!saved.includes('Avery')&&!saved.includes('example.com')&&!saved.includes(pass));
  v.lock();await assert.rejects(v.unlock('A different passphrase 42'),/incorrect/);
  assert.deepEqual(await v.unlock(pass),{master,history:[]});
  const record=JSON.parse(saved);record.ciphertext=record.ciphertext.slice(0,-8)+'AAAAAAAA';s.setItem(VAULT_KEY,JSON.stringify(record));v.lock();await assert.rejects(v.unlock(pass),/incorrect|changed/);
});
test('Protected writes serialize updates, delete contents, and never persist an update after locking',async()=>{
  const s=storage(),v=new PrivateVault(s);await v.create(pass,{master,history:[{resume:master}]});
  await Promise.all([v.write({master,history:[{resume:master}]}),v.write({master:{...master,name:''},history:[]})]);v.lock();
  const data=await v.unlock(pass);assert.equal(data.master.name,'');assert.deepEqual(data.history,[]);
  const before=s.getItem(VAULT_KEY),pending=v.write({master,history:[]});v.lock();await assert.rejects(pending,/locked/);assert.equal(s.getItem(VAULT_KEY),before);
});
test('A protected returning browser starts blank, unlocks with its password, and locks without deleting its vault',async()=>{
  const s=storage(),v=new PrivateVault(s);await v.create(pass,{master,history:[]});v.lock();
  const ui=await setup({},false,{fresh:true,storage:s});await ui.get('open-master').dispatch('click');assert.equal(ui.get('privacy-dialog').open,true);assert.equal(ui.get('tailor-button').disabled,true);
  ui.get('privacy-password').value=pass;await ui.get('privacy-form').dispatch('submit');await ui.get('open-master').dispatch('click');assert.ok(ui.get('master-import-text').value.includes('AVERY TAYLOR'));
  await ui.get('open-privacy').dispatch('click');await ui.get('privacy-lock').dispatch('click');assert.equal(ui.get('tailor-button').disabled,true);assert.equal(ui.get('resume-document').innerHTML,'');assert.ok(s.getItem(VAULT_KEY));
});
test('Protecting a browser-owned master removes its legacy plaintext records',async()=>{
  const s=storage();s.setItem('lw-resume-studio-master-v1',JSON.stringify(master));s.setItem('lw-resume-studio-history-v1','[]');
  const ui=await setup({},false,{fresh:true,storage:s});await ui.get('open-privacy').dispatch('click');ui.get('privacy-password').value=pass;ui.get('privacy-confirm').value=pass;await ui.get('privacy-form').dispatch('submit');
  assert.equal(s.getItem('lw-resume-studio-master-v1'),null);assert.equal(s.getItem('lw-resume-studio-history-v1'),null);assert.ok(s.getItem(VAULT_KEY));
});
test('Both application pages restrict scripts and connections to local assets and suppress referrers',async()=>{
  for(const page of ['index','download']){const html=await fs.readFile(new URL('../dist/'+page+'.html',import.meta.url),'utf8');assert.match(html,/name="referrer" content="no-referrer"/);assert.match(html,/script-src 'self'/);assert.match(html,/connect-src 'self'/);assert.match(html,/object-src 'none'/);assert.ok(!/https?:\/\/[^"\s]+\.js/.test(html));}
});

test('Deleting protected saved applications and master removes their contents from the encrypted snapshot',async()=>{
  const s=storage(),v=new PrivateVault(s);await v.create(pass,{master,history:[{id:'fictional',master,resume:master,keywords:[],jd:'Example job description',title:'Analyst',company:'Example Company'}]});v.lock();
  const ui=await setup({},false,{fresh:true,storage:s});await ui.get('open-privacy').dispatch('click');ui.get('privacy-password').value=pass;await ui.get('privacy-form').dispatch('submit');
  await ui.get('open-history').dispatch('click');await ui.get('clear-history').dispatch('click');
  let snapshot=await v.unlock(pass);assert.deepEqual(snapshot.history,[]);assert.equal(snapshot.master.name,'Avery Taylor');
  await ui.get('open-master').dispatch('click');await ui.get('restore-master').dispatch('click');snapshot=await v.unlock(pass);assert.deepEqual(snapshot.master,createBlankMaster());assert.equal(ui.get('master-review').innerHTML,'');assert.equal(ui.get('master-import-text').value,'');assert.equal(ui.get('master-source-name').textContent,'');
  assert.equal(s.getItem('lw-resume-studio-master-v1'),null);assert.equal(s.getItem('lw-resume-studio-history-v1'),null);
});

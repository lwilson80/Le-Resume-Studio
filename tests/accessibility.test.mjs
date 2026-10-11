import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup} from './dom-adapter.mjs';
import {parseHtml,sourceText} from './html-tree.mjs';
import {notify} from '../dist/accessibility.js';

const jd='A Business Applications Analyst will support application enhancements, UAT, requirements analysis, root cause analysis, training and technical documentation. Build reports and work with internal stakeholders.';
const read=name=>fs.readFile(new URL('../dist/'+name,import.meta.url),'utf8');
function auditSemantics(html) {
  const {nodes}=parseHtml(html),ids=new Map();
  for(const node of nodes.filter(n=>n.attrs.id)) {
    assert.ok(!ids.has(node.attrs.id),'Duplicate ID '+node.attrs.id);ids.set(node.attrs.id,node);
  }
  for(const node of nodes) {
    for(const attribute of ['aria-labelledby','aria-describedby','aria-controls'])for(const id of (node.attrs[attribute]||'').split(/\s+/).filter(Boolean))assert.ok(ids.has(id),attribute+' points to missing '+id);
    if(['input','textarea','select'].includes(node.tag)) {
      const label=nodes.find(n=>n.tag==='label'&&n.attrs.for===node.attrs.id);
      assert.ok(node.attrs['aria-label']||label&&sourceText(label),'Unlabeled field '+node.attrs.id);
      if(Object.hasOwn(node.attrs,'required'))assert.match(sourceText(label),/required|Please add the job description/i,'Required field is not identified');
    }
    if(node.tag==='button'||node.tag==='summary')assert.ok(node.attrs['aria-label']||sourceText(node),'Unnamed '+node.tag);
    if(node.tag==='svg')assert.equal(node.attrs['aria-hidden'],'true','Decorative icon exposed without a name');
  }
  return {nodes,ids};
}
for(const name of ['index.html','download.html'])test(name+' has valid labels, ID references, a language, landmarks and a working skip target',async()=>{
  const {nodes,ids}=auditSemantics(await read(name));
  assert.equal(nodes.find(n=>n.tag==='html').attrs.lang,'en');
  assert.ok(sourceText(nodes.find(n=>n.tag==='title')));
  assert.equal(nodes.filter(n=>n.tag==='main').length,1);
  assert.equal(nodes.filter(n=>n.tag==='h1').length,1);
  const viewport=nodes.find(n=>n.tag==='meta'&&n.attrs.name==='viewport').attrs.content;
  assert.doesNotMatch(viewport,/user-scalable\s*=\s*no|maximum-scale/i);
  const skip=nodes.find(n=>n.attrs.class==='skip-link'),target=ids.get(skip.attrs.href.slice(1));
  assert.equal(target.tag,'main');assert.equal(target.attrs.tabindex,'-1');
  for(const link of nodes.filter(n=>n.tag==='a'&&n.attrs.target==='_blank'))assert.match(sourceText(link),/new tab/i);
});
test('Dialogs have named focusable headings and existing live regions; review tabs contain only tabs',async()=>{
  const {nodes,ids}=auditSemantics(await read('index.html'));
  for(const dialog of nodes.filter(n=>n.tag==='dialog')) {
    assert.equal(dialog.attrs['aria-modal'],'true');
    const heading=ids.get(dialog.attrs['aria-labelledby']);
    assert.equal(heading.tag,'h2');assert.equal(heading.attrs.tabindex,'-1');
    assert.ok(dialog.children.some(n=>n.attrs&&Object.hasOwn(n.attrs,'data-dialog-status')&&n.attrs.role==='status'));
  }
  const tablist=nodes.find(n=>n.attrs.role==='tablist'),tabs=tablist.children.filter(n=>typeof n!=='string');
  assert.equal(tabs.length,6);assert.ok(tabs.every(n=>n.attrs.role==='tab'));
  assert.equal(tabs.filter(n=>n.attrs['aria-selected']==='true').length,1);
  for(const tab of tabs){const panel=ids.get(tab.attrs['aria-controls']);assert.equal(panel.attrs.role,'tabpanel');assert.equal(panel.attrs['aria-labelledby'],tab.attrs.id);}
});
test('Left, Right, Home and End activate exactly one review tab and move keyboard focus',async()=>{
  const {get,doc}=await setup(),tablist=doc.querySelector('.review-tabs');
  for(const [key,expected] of [['ArrowRight','cover'],['End','changes'],['ArrowLeft','ats'],['ArrowRight','changes'],['ArrowRight','resume'],['ArrowLeft','changes'],['Home','resume']]) {
    const target=doc.querySelectorAll('[data-tab]').find(e=>e.getAttribute('aria-selected')==='true');
    await tablist.dispatch('keydown',{key,target});
    assert.equal(doc.activeElement,get('tab-'+expected));
    assert.deepEqual(doc.querySelectorAll('[data-tab]').filter(e=>e.tabIndex===0).map(e=>e.dataset.tab),[expected]);
    for(const name of ['resume','cover','keywords','writing','ats','changes']) {
      assert.equal(get(name+'-panel').hidden,name!==expected);
      assert.equal(get(name+'-panel').tabIndex,name===expected?0:-1);
    }
  }
});
test('Creating documents exposes its busy state, rejects repeated submissions, and focuses the completed review',async()=>{
  const {get,doc,values}=await setup();get('job-description').value=jd;
  const pending=get('tailor-form').dispatch('submit');
  assert.equal(get('tailor-form').attrs['aria-busy'],'true');assert.equal(get('output-panel').attrs['aria-busy'],'true');
  assert.match(get('toast').textContent,/Please wait/);
  await get('tailor-form').dispatch('submit');await pending;
  assert.equal(JSON.parse(values.get('lw-resume-studio-history-v1')).length,1);
  assert.equal(doc.activeElement,get('output-heading'));
  assert.equal(get('tailor-form').attrs['aria-busy'],'false');assert.equal(get('output-panel').attrs['aria-busy'],'false');
  assert.match(get('toast').textContent,/resume and matching cover letter are ready/);
  await get('view-keywords').dispatch('click');assert.equal(doc.activeElement,get('keywords-panel'));
  assert.ok(get('keywords-panel').innerHTML.includes('scope="col"'));
  assert.ok(get('keywords-panel').innerHTML.includes('<caption>'));
});
test('Invalid job descriptions focus the field and associate the error without losing its instructions',async()=>{
  const {get,doc}=await setup(),field=get('job-description'),instructions=field.attrs['aria-describedby'];field.value='SQL';
  await get('tailor-form').dispatch('submit');
  assert.equal(doc.activeElement,field);assert.equal(field.attrs['aria-invalid'],'true');
  assert.equal(field.attrs['aria-describedby'],instructions+' form-error');
  assert.equal(get('form-error').attrs.role,'alert');assert.equal(get('form-error').hidden,false);
  await field.dispatch('input');
  assert.equal(field.attrs['aria-invalid'],undefined);assert.equal(field.attrs['aria-describedby'],instructions);assert.equal(get('form-error').hidden,true);
});
test('Every dialog initially focuses its heading and returns focus on close, including an asynchronous export',async()=>{
  const {get,doc}=await setup();
  for(const [opener,dialog,heading] of [['open-help','help-dialog','help-heading'],['open-master','master-dialog','master-heading'],['open-history','history-dialog','history-heading']]) {
    await get(opener).dispatch('click');assert.equal(doc.activeElement,get(heading));assert.equal(get(dialog).open,true);
    get(dialog).close();assert.equal(doc.activeElement,get(opener));
  }
  get('job-description').value=jd;await get('tailor-form').dispatch('submit');
  await get('edit-output').dispatch('click');assert.equal(doc.activeElement,get('edit-heading'));
  const close=doc.querySelectorAll('[data-close]').find(e=>e.dataset.close==='edit-dialog');await close.dispatch('click');
  assert.equal(get('edit-dialog').open,false);assert.equal(doc.activeElement,get('edit-output'));
  await get('tab-cover').dispatch('click');await get('edit-output').dispatch('click');assert.equal(doc.activeElement,get('cover-edit-heading'));
  get('cover-edit-dialog').close();assert.equal(doc.activeElement,get('edit-output'));
  await get('download-txt').dispatch('click');assert.equal(doc.activeElement,get('save-heading'));
  assert.match(get('save-status').textContent,/file is ready/);
  get('save-dialog').close();assert.equal(doc.activeElement,get('download-txt'));
});
test('Generated editors retain labels, required indicators, field purposes and per-role context',async()=>{
  const {get}=await setup();await get('open-master').dispatch('click');
  auditSemantics(get('master-editor').innerHTML);
  for(const [id,type,autocomplete] of [['m-name','text','name'],['m-email','email','email'],['m-phone','tel','tel'],['m-linkedin','url','url']]) {
    assert.equal(get(id).attrs.type,type);assert.equal(get(id).attrs.autocomplete,autocomplete);
  }
  assert.equal(get('m-bullets-1').attrs['aria-describedby'],'m-role-context-1 m-bullets-1-hint');
  get('master-dialog').close();get('job-description').value=jd;await get('tailor-form').dispatch('submit');
  await get('edit-output').dispatch('click');auditSemantics(get('output-editor').innerHTML);get('edit-dialog').close();
  await get('tab-cover').dispatch('click');await get('edit-output').dispatch('click');auditSemantics(get('cover-editor').innerHTML);
  assert.equal(get('c-paragraph-0').attrs['aria-describedby'],'cover-paragraph-guide');
});
async function withFormData(doc,action) {
  const prior=globalThis.FormData;globalThis.FormData=class{get(name){return doc.getElementById(name)?.value;}};
  try{await action();}finally{globalThis.FormData=prior;}
}
test('An error inside a closed role expands it, focuses the correct field, and clears while preserving context',async()=>{
  const {get,doc}=await setup();await get('open-master').dispatch('click');
  const field=get('m-bullets-1'),role=field.closest('details');assert.equal(role.open,false);field.value='';
  await withFormData(doc,()=>get('master-form').dispatch('submit'));
  assert.equal(role.open,true);assert.equal(doc.activeElement,field);assert.equal(field.attrs['aria-invalid'],'true');
  assert.match(field.attrs['aria-describedby'],/m-role-context-1 m-bullets-1-hint master-error/);
  await get('master-form').dispatch('input');assert.equal(field.attrs['aria-invalid'],undefined);
  assert.equal(field.attrs['aria-describedby'],'m-role-context-1 m-bullets-1-hint');
});
test('Cover letter errors focus the actual required field and do not overwrite the saved letter',async()=>{
  const {get,doc,values}=await setup();get('job-description').value=jd;await get('tailor-form').dispatch('submit');
  const saved=values.get('lw-resume-studio-history-v1');await get('tab-cover').dispatch('click');await get('edit-output').dispatch('click');
  get('c-salutation').value='';await withFormData(doc,()=>get('cover-form').dispatch('submit'));
  assert.equal(doc.activeElement,get('c-salutation'));assert.equal(get('c-salutation').attrs['aria-invalid'],'true');
  assert.match(get('cover-error').textContent,/greeting/);assert.equal(values.get('lw-resume-studio-history-v1'),saved);
});
test('Status messages persist and are announced inside the active modal rather than its inert background',async()=>{
  const {get,doc}=await setup();notify(doc,'First message');assert.equal(get('toast').textContent,'First message');
  await get('open-help').dispatch('click');notify(doc,'Help remains available');
  assert.equal(get('help-dialog').querySelector('[data-dialog-status]').textContent,'Help remains available');
  assert.equal(get('toast').textContent,'First message');get('help-dialog').close();
  assert.equal(get('toast').textContent,'First message');notify(doc,'Second message');assert.equal(get('toast').textContent,'Second message');
});
function luminance(hex) {
  let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');
  const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a,b){const [light,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (light+.05)/(dark+.05);}
test('Authored text colors meet AA contrast against their solid palettes, and controls and focus rings exceed 3:1',async()=>{
  const css=await read('styles.css')+await read('accessibility.css')+await read('browser.css'),colors=new Map(),variables=new Map([...css.matchAll(/(--[\w-]+):(#[\da-f]+)/gi)].map(m=>[m[1],m[2]]));
  for(const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))for(const [,value] of body.matchAll(/(?:^|;)\s*color\s*:\s*([^;]+)/g)) {
    const color=value==='white'?'#fff':value.match(/^var\((--[^)]+)\)$/)?variables.get(value.slice(4,-1)):value;
    if(!/^#[a-f\d]{3,6}$/i.test(color||''))continue;
    for(const selector of selectors.trim().split(','))colors.set(selector.trim(),color);
  }
  const darkSelectors=new Set(['.sidebar','.sidebar-caption','.nav-item','.nav-item.active','.nav-item:hover','.nav-count','.source-kicker','.source-card strong','.source-card p','.text-link','.profile small','.primary-button','.dark-button','.toast','.skip-link']);
  assert.ok(colors.size>=80);
  for(const [selector,color] of colors) {
    // The darkest light surface is deliberately conservative for shared text.
    let background='#dae8d0',minimum=4.5;
    if(darkSelectors.has(selector))background=selector==='.nav-count'?'#31575a':selector==='.nav-item.active'?'#315256':selector==='.nav-item:hover'?'#2a4b4e':'#173b3f';
    if(selector==='.avatar')background='#dab18d';
    if(selector==='.brand-icon span'){background='#f0ede2';minimum=3;}
    assert.ok(contrast(color,background)>=minimum,selector+' fails contrast: '+contrast(color,background).toFixed(2));
  }
  const a11y=await read('accessibility.css'),border=a11y.match(/input,select,textarea,\.icon-button,\.secondary-button,\.master-status button\{border-color:(#[\da-f]+)/i)[1];
  const focus=a11y.match(/:focus-visible[^{}]*\{outline:3px solid (#[\da-f]+)/i)[1],sidebar=a11y.match(/\.sidebar :focus-visible\{outline-color:(#[\da-f]+)/i)[1];
  assert.ok(contrast(border,'#dae8d0')>=3);assert.ok(contrast(focus,'#dae8d0')>=3);assert.ok(contrast(sidebar,'#315256')>=3);
});

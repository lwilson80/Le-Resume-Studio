import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseHtml} from './html-tree.mjs';
import {MASTER_RESUME} from './fixtures/master-resume.js';

function descendants(element) {return element.children.flatMap(c=>c instanceof Element?[c,...descendants(c)]:[]);}
function matches(element,selector) {
  if(selector.startsWith('.'))return (element.attrs.class||'').split(/\s+/).includes(selector.slice(1));
  const attribute=selector.match(/^(\w+)?\[([^\]]+)\]$/);
  if(attribute)return (!attribute[1]||element.tag===attribute[1])&&(attribute[2]==='open'?element.open:Object.hasOwn(element.attrs,attribute[2]));
  return element.tag===selector;
}
export class Element {
  constructor(id='',doc=null,tag='div',attrs={}) {
    this.id=id;this.doc=doc;this.tag=tag;this.attrs={...attrs};this.children=[];this._html='';this._text='';
    this.value=attrs.value||'';this.hidden=Object.hasOwn(attrs,'hidden');this.disabled=Object.hasOwn(attrs,'disabled');
    this.open=Object.hasOwn(attrs,'open');this.isConnected=true;this.events={};this.dataset={};
    for(const [key,value] of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
    this.classList={toggle:(name,on)=>{const classes=new Set((this.attrs.class||'').split(/\s+/).filter(Boolean));on?classes.add(name):classes.delete(name);this.attrs.class=[...classes].join(' ');}};
  }
  get innerHTML(){return this._html;}
  set innerHTML(value) {
    for(const element of descendants(this)){if(element.id)this.doc?.elements.delete(element.id);element.isConnected=false;}
    this._html=value;this._text='';this.children=[];
    for(const child of parseHtml(value).root.children)this.children.push(convert(child,this,this.doc));
  }
  get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
  set textContent(value){this._text=String(value);this._html='';this.children=[];}
  get tabIndex(){return Number(this.attrs.tabindex??0);}
  set tabIndex(value){this.attrs.tabindex=String(value);}
  get href(){return this.attrs.href||'';}
  set href(value){this.attrs.href=String(value);}
  addEventListener(type,fn){(this.events[type]||=[]).push(fn);}
  removeEventListener(type,fn){this.events[type]=(this.events[type]||[]).filter(h=>h!==fn);}
  async dispatch(type,options={}){for(const fn of this.events[type]||[])await fn({preventDefault(){},currentTarget:this,target:this,...options});}
  setAttribute(key,value){this.attrs[key]=String(value);}
  getAttribute(key){return this.attrs[key]??null;}
  removeAttribute(key){delete this.attrs[key];}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){return descendants(this).filter(e=>matches(e,selector));}
  matches(selector){return matches(this,selector);}
  closest(selector){for(let e=this;e;e=e.parent)if(matches(e,selector))return e;return null;}
  focus(){if(this.doc?.activeElement)this.doc.activeElement.focused=false;this.focused=true;if(this.doc)this.doc.activeElement=this;}
  select(){this.selectionStart=0;this.selectionEnd=this.value.length;}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
  showModal(){this.open=true;}
  close(){this.open=false;for(const fn of this.events.close||[])fn({currentTarget:this,target:this});}
  getBoundingClientRect(){return {left:10,right:100,top:10,bottom:100};}
}
function convert(node,parent,doc) {
  if(typeof node==='string')return node;
  const element=new Element(node.attrs.id||'',doc,node.tag,node.attrs);element.parent=parent;
  if(element.id)doc?.elements.set(element.id,element);
  element.children=node.children.map(child=>convert(child,element,doc));
  if(element.tag==='textarea')element.value=element.textContent;
  return element;
}
export async function setup(stored={},embedded=false,{storage,fresh=false}={}) {
  const html=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),elements=new Map();
  const doc={elements,activeElement:null,getElementById:id=>elements.get(id)||null};
  const root=new Element('',doc,'#document');root.children=parseHtml(html).root.children.map(n=>convert(n,root,doc));
  doc.querySelectorAll=selector=>root.querySelectorAll(selector);doc.querySelector=selector=>root.querySelector(selector);
  elements.get('length').value='balanced';elements.get('export-document').value='resume';
  // Most regression journeys represent a returning visitor. Fresh onboarding
  // tests explicitly request empty storage; production assets have no seed.
  const values=new Map(Object.entries(fresh?stored:{'lw-resume-studio-master-v1':JSON.stringify(MASTER_RESUME),...stored}));
  globalThis.localStorage=storage||{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  globalThis.document=doc;globalThis.matchMedia=()=>({matches:true});globalThis.confirm=()=>true;
  globalThis.self=globalThis;globalThis.top=embedded?{}:globalThis;
  const page=new Element();globalThis.addEventListener=(type,fn)=>page.addEventListener(type,fn);
  await import('../dist/app.js?test='+Math.random());
  return {elements,values,doc,page,get:id=>{assert.ok(elements.has(id),'Unknown DOM ID '+id);return elements.get(id);}};
}

export async function withFormData(doc,action) {
  const native=globalThis.FormData;
  globalThis.FormData=class {get(name){return doc.getElementById(name)?.value??null;}};
  try{return await action();}finally{globalThis.FormData=native;}
}
export async function enterMaster(ui,resume=MASTER_RESUME) {
  await ui.get('open-master').dispatch('click');
  for(const key of ['name','email','phone','linkedin','summary'])ui.get('m-'+key).value=resume[key]||'';
  ui.get('m-competencies').value=resume.competencies.join('\n');
  const role=resume.roles[0];
  for(const key of ['employer','title','dates'])ui.get('m-'+key+'-0').value=role[key];
  ui.get('m-bullets-0').value=role.bullets.join('\n');
  await withFormData(ui.doc,()=>ui.get('master-form').dispatch('submit'));
}

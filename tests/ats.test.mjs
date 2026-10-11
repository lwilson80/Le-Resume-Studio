import test from 'node:test';
import assert from 'node:assert/strict';
import {ATS_PLATFORMS,getATSProfile,reviewATS,reviewATSFile} from '../dist/ats.js';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume,auditResume} from '../dist/engine.js';
import {createDownloadPayload,encodeDownloadPayload,decodeDownloadPayload} from '../dist/downloads.js';
import {setup} from './dom-adapter.mjs';

const jd='A Business Applications Analyst needs SQL, Structured Query Language, Salesforce, UAT, user acceptance testing, application support, technical documentation and requirements analysis. Work with stakeholders to support application enhancements.';
const historyKey='lw-resume-studio-history-v1';
test('Every requested ATS is selectable with a unique profile and a general fallback',()=>{
  const expected=['ADP Workforce Now','ApplicantAI','Applied','Apploi','Ashby','Asure','BambooHR','Brassring','Breezy HR','Bullhorn','Career puck','Cezanne','Cornerstone','Deel','Fountain','Frontline','Getro','Greenhouse','HireBridge','HRM Direct by Clear Company','iCims','JazzHR','JobAps','Juggle Hire','Lever (acquired by Employ)','Loxo','Manatal','Oracle','Pageup','Paycor','PeopleGuru','Pinpoint','Sage People','SAP SuccessFactors','SmartRecruiters','TalentLyft','TalentReef','Talexio','TeamTailor','TrackerRMS','TriNet Zenefits','UltiPro','Vista PDS','Workable','Workday','Zoho'];
  assert.deepEqual(ATS_PLATFORMS.slice(1).map(p=>p.name),expected);
  assert.equal(new Set(ATS_PLATFORMS.map(p=>p.id)).size,47);
  assert.equal(getATSProfile('unrecognized').id,'general');
  for(const p of ATS_PLATFORMS)assert.ok(p.note&&Array.isArray(p.sources));
});
test('All employer alternatives are required and duplicate detected phrases count once',()=>{
  const master=structuredClone(MASTER_RESUME),r=structuredClone(master);
  r.summary='SQL.';r.competencies=[];r.skills=[];r.roles=[];
  const keywords=[{name:'SQL',jobTerms:['SQL','Structured Query Language'],supported:true,inJobDescription:true},{name:'Duplicate',jobTerms:['sql'],supported:true,inJobDescription:true}];
  let a=auditResume(r,keywords,master);
  assert.equal(a.total,2);assert.equal(a.after,1);assert.equal(a.score,5);assert.equal(a.targetMet,false);
  assert.deepEqual(a.keywords[0].missingTerms,['Structured Query Language']);
  r.summary+=' Structured Query Language.';a=auditResume(r,keywords,master);
  assert.equal(a.after,2);assert.equal(a.targetMet,true);assert.equal(a.score,10);
});
test('Merely typing an unsupported qualification cannot produce a supported 10/10',()=>{
  const r=structuredClone(MASTER_RESUME);r.summary+=' CISSP.';
  const a=auditResume(r,[{name:'CISSP',jobTerms:['CISSP'],supported:false,inJobDescription:true}],MASTER_RESUME);
  assert.equal(a.after,0);assert.equal(a.score,0);assert.equal(a.targetPossible,false);assert.equal(a.evidenceNeeded,1);
});
test('Platform warnings use the actual file format and scope the size limit to resumes',()=>{
  const version=tailorResume(MASTER_RESUME,jd,{ats:'workable'});
  const txt=createDownloadPayload(version,'resume','txt');
  assert.match(reviewATSFile(txt,{size:1000}).warnings[0],/choose Word or PDF/);
  const pdf=createDownloadPayload(version,'resume','pdf');
  assert.equal(reviewATSFile(pdf,{size:5000000}).warnings.length,0);
  assert.match(reviewATSFile(pdf,{size:5000001}).warnings[0],/exceeds.*5 MB/);
  const cover=createDownloadPayload(version,'cover','txt');
  assert.equal(reviewATSFile(cover,{size:6000000}).warnings.length,0);
  pdf.ats='greenhouse';assert.equal(reviewATSFile(pdf,{size:2500000}).warnings.length,0);
  assert.match(reviewATSFile(pdf,{size:2500001}).warnings[0],/2.5 MB/);
  assert.match(getATSProfile('workday').note,/HiredScore.*related product/);
});
test('The ATS review flags incomplete contact details and a PDF character limitation',()=>{
  const result=tailorResume(MASTER_RESUME,jd);
  assert.equal(reviewATS(result).issues,0);
  result.resume.email='';result.resume.phone='';
  assert.equal(reviewATS(result).checks.find(c=>c.id==='contact').ok,false);
  result.resume.name='王 Example';
  assert.match(reviewATSFile(createDownloadPayload(result,'resume','pdf'),{size:1000}).warnings[0],/Word or plain text/);
  assert.equal(reviewATSFile(createDownloadPayload(result,'resume','docx'),{size:1000}).warnings.length,0);
});
test('ATS preferences survive saved versions and download transfers, then reset blank workspace controls',async()=>{
  const {get,values,page}=await setup();
  for(const p of ATS_PLATFORMS)assert.ok(get('ats-platform').innerHTML.includes(p.name));
  get('job-description').value=jd;get('ats-platform').value='greenhouse';
  await get('tailor-form').dispatch('submit');
  let saved=JSON.parse(values.get(historyKey))[0];assert.equal(saved.ats,'greenhouse');
  assert.match(get('ats-panel').innerHTML,/2.5 MB/);assert.match(get('ats-panel').innerHTML,/✓ Ready/);
  const payload=decodeDownloadPayload('#document='+encodeDownloadPayload(createDownloadPayload(saved,'resume','pdf')));
  assert.equal(payload.ats,'greenhouse');
  get('ats-platform').value='workable';await get('ats-platform').dispatch('change');
  saved=JSON.parse(values.get(historyKey))[0];assert.equal(saved.ats,'workable');
  await get('download-txt').dispatch('click');assert.match(get('save-ats-note').textContent,/choose Word or PDF/);
  await page.dispatch('pageshow');
  assert.equal(get('ats-platform').value,'general');assert.equal(get('save-ats-note').textContent,'');
  assert.equal(get('resume-document').innerHTML,'');
  await get('open-history').dispatch('click');
  await get('history-list').dispatch('click',{target:{closest:()=>({dataset:{openVersion:'0'}})}});
  assert.equal(get('ats-platform').value,'workable');
  await get('clear-history').dispatch('click');assert.equal(get('ats-platform').value,'general');
  assert.equal(get('save-ats-note').textContent,'');assert.equal(values.has(historyKey),false);
});

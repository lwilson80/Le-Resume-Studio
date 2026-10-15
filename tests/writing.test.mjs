import test from 'node:test';
import assert from 'node:assert/strict';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume,resumeText,coverLetterText,auditResume,auditCoverLetter,reviewApplication,hasPhrase,CATALOG,masterText} from '../dist/engine.js';
import {ACTION_VERBS,WRITING_PROFILE,actionVerb,cleanEnglish,polishResume,polishBullet,polishCoverLetter,firstPersonBullet} from '../dist/writing.js';

const postings={
  business:'We need a Business Applications Analyst with SQL, Salesforce, UAT, requirements analysis, root cause analysis, data modeling, advanced Excel, incident resolution, technical documentation and stakeholder management. Support application enhancements and reporting.',
  billing:'Our Billing Analyst manages WIP, billing recommendations, accounts receivable, AR, realization, utilization, budgets, forecasts, revenue recognition, profitability, reporting, engagement economics and month-end close. Maintain internal controls and financial operations.',
  mortgage:'A Mortgage Closer manages loan funding, reviews title commitments, HUD-1 Settlement Statements, hazard insurance and flood insurance, coordinates escrow disbursements and meets investor requirements. Ensure RESPA and Regulation Z compliance.',
  risk:'A Risk Analyst supports operational risk, compliance monitoring, internal controls, risk management, reporting and quality assurance. Document findings, maintain audit documentation and provide technical documentation and training.'
};
test('The complete user-supplied bank retains every category and compound verb',()=>{
  assert.deepEqual(Object.fromEntries(Object.entries(ACTION_VERBS).map(([k,v])=>[k,v.length])),{Leadership:40,Communication:37,Research:27,Technical:20,Teaching:22,Quantitative:18,Creative:27,Helping:22,Organizational:47});
  assert.equal(actionVerb('Set goals for the team.'),'Set Goals');
  assert.equal(actionVerb('Rehabilitated client accounts.'),'Rehabilitated');
  assert.equal(actionVerb('Supported billing operations.'),'Supported');
});
test('Both documents reach exactly 10/10 for source-supported postings in four career areas',()=>{
  for(const [name,jd] of Object.entries(postings)){
    const result=tailorResume(MASTER_RESUME,jd,{title:name+' Analyst',company:'Example Company'});
    assert.ok(result.audit.targetMet,name+' resume target');assert.ok(result.coverAudit.targetMet,name+' cover target');
    assert.equal(result.audit.coverage,100);assert.equal(result.coverAudit.coverage,100);
    assert.equal(result.audit.score,10);assert.equal(result.coverAudit.score,10);
    assert.ok(result.audit.phrases.every(p=>p.included&&p.supported));assert.ok(result.coverAudit.phrases.every(p=>p.included&&p.supported));
    assert.equal(result.review.actionBullets,result.review.totalBullets);
    assert.equal(result.review.resumeIssues.length,0);assert.equal(result.review.coverIssues.length,0);
    assert.equal(result.writingProfile,WRITING_PROFILE.id);
  }
});
test('The reviewer perspective never becomes twenty years of applicant experience',()=>{
  const result=tailorResume(MASTER_RESUME,postings.business);
  assert.match(result.review.profile.perspective,/20 years/);
  assert.doesNotMatch(resumeText(result.resume)+' '+coverLetterText(result.coverLetter,result.resume),/20\+? years/);
  assert.match(result.resume.summary,/15 years of overall professional experience/);
});
test('Missing experience lowers both actual scores and explains the evidence needed',()=>{
  const result=tailorResume(MASTER_RESUME,'An engineer needs Kubernetes, Docker, React, APIs, AWS, NIST and CISSP. Develop software and support SQL analysis, reporting and technical documentation. Jira and Agile experience is required.');
  assert.equal(result.audit.targetMet,false);assert.equal(result.coverAudit.targetMet,false);assert.equal(result.audit.targetPossible,false);
  assert.ok(result.audit.evidenceNeeded>0);assert.ok(result.audit.coverage<90);
  for(const term of ['Kubernetes','Docker','React','AWS','NIST','CISSP','Jira','Agile']){
    assert.equal(hasPhrase(resumeText(result.resume),term),false);
    assert.equal(hasPhrase(coverLetterText(result.coverLetter,result.resume),term),false);
  }
});
test('Additional terms absent from the posting do not inflate or reduce the match score',()=>{
  const ordinary=tailorResume(MASTER_RESUME,postings.billing);
  const extra=tailorResume(MASTER_RESUME,postings.billing,{extra:'Python, ServiceNow, Encompass'});
  assert.equal(extra.audit.total,ordinary.audit.total);
  assert.equal(extra.audit.coverage,ordinary.audit.coverage);
  assert.ok(extra.audit.keywords.filter(k=>['Python','ServiceNow','Encompass'].includes(k.name)).every(k=>!k.scored));
});
test('Rounding can never turn an incomplete phrase match into a 10/10 target',()=>{
  const keywords=Array.from({length:99},(_,i)=>({name:'skill'+i,jobTerms:['skill'+i],supported:true,inJobDescription:true}));
  const master=structuredClone(MASTER_RESUME);master.summary=keywords.map(k=>k.name).join(' ')+'.';
  const resume=structuredClone(master);resume.summary=keywords.slice(0,98).map(k=>k.name).join(' ')+'.';
  const a=auditResume(resume,keywords,master);assert.equal(a.targetMet,false);assert.equal(a.score,9.8);assert.equal(a.after,98);
  resume.summary+=' skill98.';assert.equal(auditResume(resume,keywords,master).targetMet,true);
});
test('Cover scores count supported body claims and ignore company and subject metadata',()=>{
  const keywords=[{name:'Jira',jobTerms:['Jira'],supported:false,inJobDescription:true},{name:'SQL',jobTerms:['SQL'],supported:true,inJobDescription:true}];
  const letter={company:'SQL Company',subject:'SQL Analyst',paragraphs:['I am applying for a role at Jira.']};
  const a=auditCoverLetter(letter,keywords);assert.equal(a.after,0);assert.equal(a.targetMet,false);
});
test('English edits retain numeric facts, the field of study, and the untouched source',()=>{
  const source=structuredClone(MASTER_RESUME);
  source.roles[4].bullets[0]='Responsible for managing a monthly pipeline of approximately $2 million  , and and reviewing title documents';
  const before=structuredClone(source),polished=polishResume(source);
  assert.equal(polished.resume.roles[4].bullets[0],'Managed a monthly pipeline of approximately $2 million and reviewed title documents.');
  assert.equal(polished.resume.education[0].qualification,'Bachelor of Science in Computer Programming');
  assert.deepEqual(source,before);assert.ok(polished.corrections.length>=2);
  assert.equal(cleanEnglish('Reviewed the the records in accordance to policy .',true),'Reviewed the records in accordance with policy.');
});
test('Verb editing retains support responsibility and uses correct current-role tense',()=>{
  assert.equal(polishBullet('Supported analysts and reviewed reports'),'Supported analysts and reviewed reports.');
  assert.equal(polishBullet('Worked with finance teams'),'Collaborated with finance teams.');
  assert.equal(polishBullet('Handled billing inquiries','2024 to Present'),'Handle billing inquiries.');
  assert.equal(polishBullet('Planned training sessions','2024 to Present'),'Plan training sessions.');
  assert.equal(polishBullet('Sold services','2024 to Present'),'Sell services.');
  assert.equal(polishBullet('Managed billing','2020 to 2026'),'Managed billing.');
});
test('Semicolon clauses become complete cover-letter sentences',()=>{
  assert.equal(firstPersonBullet('Resolved insurance exceptions; coordinated corrections.'),'I resolved insurance exceptions. I coordinated corrections');
  const letter=polishCoverLetter({salutation:'Dear Hiring Manager',closing:'Sincerely',paragraphs:['I reviewed the the records in accordance to policy']});
  assert.equal(letter.salutation,'Dear Hiring Manager,');assert.equal(letter.closing,'Sincerely,');assert.equal(letter.paragraphs[0],'I reviewed the records in accordance with policy.');
});
test('Employer alternatives and named products remain readable and match literally',()=>{
  const result=tailorResume(MASTER_RESUME,'This financial operations role requires work in progress, Structured Query Language, Microsoft 365, Google Workspace and Microsoft Excel. Produce forecasts and reports and maintain technical documentation.');
  assert.equal(result.audit.targetMet,true);assert.equal(result.coverAudit.targetMet,true);
  assert.ok(hasPhrase(resumeText(result.resume),'work in progress'));
  const text=coverLetterText(result.coverLetter,result.resume);assert.ok(text.includes('Microsoft 365'));assert.ok(text.includes('Google Workspace'));
});
test('Tailored clauses stay parallel and a shared controls term does not add unrelated mortgage evidence',()=>{
  const business=tailorResume(MASTER_RESUME,postings.business),text=coverLetterText(business.coverLetter,business.resume);
  assert.match(text,/incident resolution, the evaluation of enhancements, and improvements to application reliability/);
  assert.doesNotMatch(text,/and performed data modeling and developed/);
  const billing=tailorResume(MASTER_RESUME,postings.billing);
  assert.ok(billing.coverLetter.evidence.every(e=>!e.text.includes('foreclosure')));
  const mortgage=tailorResume(MASTER_RESUME,postings.mortgage);
  assert.match(coverLetterText(mortgage.coverLetter,mortgage.resume),/Regulation Z/);
});
test('Rechecking a customized letter changes its score without replacing its content',()=>{
  const result=tailorResume(MASTER_RESUME,postings.business);
  result.coverLetter.paragraphs=['I would appreciate the opportunity to discuss my application.'];result.coverLetter.edited=true;
  const before=structuredClone(result.coverLetter);
  reviewApplication(result);assert.deepEqual(result.coverLetter,before);assert.equal(result.coverAudit.targetMet,false);assert.equal(result.coverAudit.after,0);
});
test('A broad posting keeps original evidence and all detected supported job phrases',()=>{
  const supported=CATALOG.filter(k=>k.aliases.some(a=>hasPhrase(masterText(MASTER_RESUME),a))).map(k=>k.aliases[0]);
  const result=tailorResume(MASTER_RESUME,'We seek an experienced operations analyst with the following skills: '+supported.join(', ')+'. Work with stakeholders to support accurate reporting, resolve exceptions, document requirements and improve regulated operations.',{title:'Operations Analyst',company:'Example Company'});
  assert.ok(result.coverAudit.total>80);assert.ok(result.coverAudit.targetMet);assert.equal(result.coverAudit.coverage,100);
  assert.ok(result.review.coverWords<=320);assert.equal(result.review.coverIssues.length,0);
  assert.doesNotMatch(result.coverLetter.paragraphs.join(' '),/role as Quality Assurance/);
  for(const e of result.coverLetter.evidence)assert.ok(result.resume.roles.some(r=>r.employer===e.employer&&r.title===e.title&&r.bullets.includes(e.text)));
});
export {postings};

test('Negated experience and learning goals never become supported qualifications or a false 10 out of 10',()=>{
  const source=structuredClone(MASTER_RESUME);source.summary='Analyst. No experience with Python or Kubernetes. Currently learning Terraform.';source.competencies=['Reporting'];source.roles=[{title:'Analyst',employer:'Example Company',dates:'2020 to Present',bullets:['Analyzed reporting records.']}];source.skills=[];source.education=[];
  const result=tailorResume(source,'We need an analyst with experience with Python, Kubernetes and Terraform. Maintain technical reporting and document work for business stakeholders.');
  for(const term of ['Python','Kubernetes','Terraform']){const k=result.keywords.find(k=>k.jobTerms.some(t=>hasPhrase(t,term)));assert.ok(k,term);assert.equal(k.supported,false,term);}
  assert.equal(result.audit.targetMet,false);assert.ok(result.audit.evidenceNeeded>=3);assert.ok(!coverLetterText(result.coverLetter,result.resume).includes('Python'));
});
test('Independent affirmative source evidence supports a skill despite a separate negative mention',()=>{
  const source=structuredClone(MASTER_RESUME);source.summary='No experience with Python.';source.roles[0].bullets.push('Programmed Python reports for stakeholders.');
  const result=tailorResume(source,'The analyst needs Python, reporting, SQL and requirements analysis to maintain business reports and support stakeholders through technical documentation.');
  const python=result.keywords.find(k=>k.name==='Python');assert.equal(python.supported,true);assert.ok(python.evidence.some(e=>e.text.includes('Programmed Python')));
});

test('Keyword alignment never invents a new professional title from a shared skill',()=>{
  const source=structuredClone(MASTER_RESUME);source.summary='Administrative assistant supporting reporting.';source.roles=[{title:'Administrative Assistant',employer:'Example Company',dates:'2020 to Present',bullets:['Prepared reporting documents.']}];source.competencies=['Reporting'];source.skills=[];source.education=[];
  const result=tailorResume(source,'A data analysis professional is needed to support reporting and prepare documents for business stakeholders. Python experience is also required.');
  assert.doesNotMatch(result.resume.summary,/data analysis professional|business applications professional/i);
  assert.equal(result.resume.roles[0].title,'Administrative Assistant');assert.equal(result.audit.targetMet,false);
});

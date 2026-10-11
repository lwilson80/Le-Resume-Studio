import test from 'node:test';
import assert from 'node:assert/strict';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume,createCoverLetter,coverLetterText,hasPhrase} from '../dist/engine.js';
const business='We seek a Business Applications Analyst with UAT, requirements analysis, root cause analysis, SQL, Salesforce, application enhancements and technical documentation. Support reporting, training and stakeholder management. Jira and Agile experience is preferred.';
const billing='Our Billing Analyst manages WIP, AR, billing recommendations, realization, utilization, reports and month-end close. Advise partners on engagement economics and resolve billing issues. BillBlast and LEDES experience is required.';
const mortgage='Our Mortgage Closer manages loan funding, reviews title commitments, HUD-1 Settlement Statements, hazard and flood insurance and escrow disbursements. Meet investor requirements and RESPA regulations. Encompass and Closing Disclosure experience is preferred.';
test('Each tailored resume automatically includes a personalized cover letter',()=>{
  const result=tailorResume(MASTER_RESUME,business,{title:'Business Applications Analyst',company:'Example Company'});
  assert.ok(result.coverLetter);assert.ok(result.coverLetter.paragraphs[0].includes('Business Applications Analyst position at Example Company'));
  assert.equal(result.coverLetter.signature,MASTER_RESUME.name);assert.equal(result.coverLetter.salutation,'Dear Hiring Manager,');
  assert.ok(result.coverLetter.paragraphs.length>=3);
});
test('Different opportunities select different letter evidence and terminology',()=>{
  const b=tailorResume(MASTER_RESUME,business),f=tailorResume(MASTER_RESUME,billing);
  assert.notDeepEqual(b.coverLetter.paragraphs,f.coverLetter.paragraphs);
  assert.ok(f.coverLetter.evidence.some(e=>e.title==='Billing Analyst, Client Engagement Team'));
  assert.ok(b.coverLetter.evidence.some(e=>e.title==='Senior Business Applications Analyst, Global Risk Management'));
});
test('Every claimed accomplishment comes from the corresponding tailored resume',()=>{
  for(const jd of [business,billing,mortgage]){
    const result=tailorResume(MASTER_RESUME,jd);
    for(const e of result.coverLetter.evidence){
      assert.ok(result.resume.roles.some(r=>r.employer===e.employer&&r.title===e.title&&r.bullets.includes(e.text)));
    }
    assert.ok(!result.coverLetter.paragraphs.join(' ').includes('15 years of SQL'));
  }
});
test('Missing tools and credentials are not claimed in a generated letter',()=>{
  const result=tailorResume(MASTER_RESUME,business+' A CPA or CISSP is preferred.');
  const text=coverLetterText(result.coverLetter,result.resume);
  for(const term of ['Jira','Agile','CPA','CISSP'])assert.equal(hasPhrase(text,term),false);
});
test('A single generic reporting match does not pull unrelated foreclosure experience into a technical letter',()=>{
  const result=tailorResume(MASTER_RESUME,business);
  assert.ok(!result.coverLetter.paragraphs.join(' ').includes('Foreclosure Review and Mortgage Servicing Analyst'));
});
test('Source metrics stay unchanged in mortgage letter evidence',()=>{
  const result=tailorResume(MASTER_RESUME,mortgage,{title:'Mortgage Closer'});
  assert.ok(result.coverLetter.evidence.some(e=>e.text.includes('$2 million')));
  assert.ok(coverLetterText(result.coverLetter,result.resume).includes('$2 million'));
});
test('Optional blank job title and company produce a complete letter without placeholders',()=>{
  const result=tailorResume(MASTER_RESUME,business);
  const text=coverLetterText(result.coverLetter,result.resume);
  assert.ok(!/undefined|null|\[Company\]|\[Job Title\]/.test(text));
  assert.ok(text.includes('Dear Hiring Manager,'));assert.ok(text.endsWith(MASTER_RESUME.name));
});
test('Letters can be regenerated from a saved edited resume and original creation date',()=>{
  const result=tailorResume(MASTER_RESUME,billing,{title:'Billing Analyst',company:'Saved Company'});
  result.createdAt='2026-10-08T01:00:00Z';result.resume.name='Saved Applicant';
  const letter=createCoverLetter(result);
  assert.equal(letter.date,'October 7, 2026');assert.equal(letter.signature,'Saved Applicant');
  assert.ok(letter.paragraphs[0].includes('Saved Company'));
});

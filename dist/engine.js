import {roleHeaderFields} from './resume.js';
import {WRITING_PROFILE,polishResume,polishCoverLetter,cleanEnglish,firstPersonBullet,actionVerb,writingReview} from './writing.js';
import {cloneData} from './browser.js';
// Every addition is checked against the master resume, never against the job description alone.
export const CATALOG = [
  ['User Acceptance Testing', ['user acceptance testing', 'UAT'], 'Testing', 'User Acceptance Testing (UAT)'],
  ['Quality Assurance', ['quality assurance', 'QA'], 'Testing', 'Quality Assurance (QA)'],
  ['Requirements Analysis', ['requirements analysis', 'requirements definition', 'requirements gathering', 'requirements elicitation'], 'Business'],
  ['Test Planning', ['test planning', 'test plans'], 'Testing'],
  ['Defect Management', ['defect management', 'defects', 'defect tracking'], 'Testing'],
  ['Root Cause Analysis', ['root cause analysis', 'RCA'], 'Business', 'Root Cause Analysis (RCA)'],
  ['Impact Analysis', ['impact analysis'], 'Business'],
  ['Application Support', ['application support', 'applications support', 'business applications support', 'business applications', 'enterprise applications'], 'Technology'],
  ['Incident Resolution', ['incident resolution', 'resolve incidents', 'incident troubleshooting'], 'Technology'],
  ['Application Enhancements', ['application enhancements', 'enhancements'], 'Technology'],
  ['Technical Documentation', ['technical documentation', 'technical writing', 'process documentation'], 'Business'],
  ['User Guides', ['user guides', 'user manuals'], 'Business'],
  ['Training', ['training', 'knowledge transfer', 'training development'], 'Business'],
  ['Stakeholder Management', ['stakeholder management', 'stakeholders'], 'Business'],
  ['Process Improvement', ['process improvement', 'improved workflows', 'workflow improvement'], 'Business'],
  ['Data Analysis', ['data analysis', 'analyzing complex data', 'analyzed large datasets', 'data analytics'], 'Data'],
  ['Data Modeling', ['data modeling', 'data models'], 'Data'],
  ['Reporting', ['reporting', 'reports'], 'Data'],
  ['Microsoft Excel', ['Microsoft Excel', 'advanced Excel', 'Excel'], 'Data'],
  ['Microsoft 365', ['Microsoft 365', 'Office 365'], 'Technology'],
  ['Google Workspace', ['Google Workspace'], 'Technology'],
  ['ServiceNow', ['ServiceNow'], 'Technology'],
  ['Salesforce', ['Salesforce', 'Salesforce CRM'], 'Technology'],
  ['Microsoft Azure', ['Microsoft Azure', 'Azure'], 'Technology'],
  ['SQL', ['SQL', 'Structured Query Language'], 'Data'],
  ['Python', ['Python'], 'Technology'],
  ['C#', ['C#', 'C sharp'], 'Technology'],
  ['JavaScript', ['JavaScript'], 'Technology'],
  ['Java', ['Java'], 'Technology'],
  ['Risk Management', ['risk management', 'risk-based decisions'], 'Risk'],
  ['Operational Risk', ['operational risk'], 'Risk'],
  ['Compliance', ['compliance', 'regulatory compliance'], 'Risk'],
  ['Compliance Monitoring', ['compliance monitoring'], 'Risk'],
  ['Independence', ['independence', 'independence quality'], 'Risk'],
  ['Internal Controls', ['internal controls', 'financial controls', 'control reviews', 'controls'], 'Risk'],
  ['Audit Documentation', ['audit documentation', 'audit requirements', 'documentation prepared for audit'], 'Risk'],
  ['BSA/AML', ['BSA/AML', 'BSA', 'AML', 'anti-money laundering'], 'Risk', 'BSA/AML'],
  ['Financial Operations', ['financial operations', 'financial lifecycle'], 'Finance'],
  ['Billing', ['billing', 'invoicing', 'invoice preparation'], 'Finance'],
  ['Accounts Receivable', ['accounts receivable', 'AR', 'A/R'], 'Finance', 'Accounts Receivable (AR)'],
  ['Work in Process', ['work in process', 'work in progress', 'WIP'], 'Finance', 'Work in Process (WIP)'],
  ['Billing Recommendations', ['billing recommendations'], 'Finance'],
  ['Engagement Economics', ['engagement economics', 'engagement financials'], 'Finance'],
  ['Profitability', ['profitability'], 'Finance'],
  ['Realization', ['realization'], 'Finance'],
  ['Utilization', ['utilization'], 'Finance'],
  ['Revenue Recognition', ['revenue recognition'], 'Finance'],
  ['Budgets', ['budgets', 'budgeting'], 'Finance'],
  ['Forecasts', ['forecasts', 'forecasting'], 'Finance'],
  ['Month-End Close', ['month-end close', 'month end close'], 'Finance'],
  ['Reconciliation', ['reconciliation', 'reconciled'], 'Finance'],
  ['Financial Adjustments', ['financial adjustments', 'premium adjustments'], 'Finance'],
  ['Mortgage Servicing', ['mortgage servicing', 'loan servicing'], 'Mortgage'],
  ['Mortgage Closing', ['mortgage closing', 'loan closing', 'loan closer', 'mortgage closer'], 'Mortgage'],
  ['Loan Funding', ['loan funding', 'funding'], 'Mortgage'],
  ['Escrow', ['escrow', 'escrow accounts', 'escrow disbursements'], 'Mortgage'],
  ['Title Commitments', ['title commitments', 'title commitment'], 'Mortgage'],
  ['HUD-1', ['HUD-1', 'HUD 1', 'HUD-1 Settlement Statements'], 'Mortgage'],
  ['Settlement Statements', ['settlement statements', 'settlement statement'], 'Mortgage'],
  ['Hazard Insurance', ['hazard insurance', 'hazard and flood insurance'], 'Mortgage'],
  ['Flood Insurance', ['flood insurance', 'hazard and flood insurance'], 'Mortgage'],
  ['National Flood Insurance Program', ['National Flood Insurance Program', 'NFIP'], 'Mortgage', 'National Flood Insurance Program (NFIP)'],
  ['Force-Placed Insurance', ['force-placed insurance', 'lender-placed insurance', 'insurance placed by the lender'], 'Mortgage'],
  ['RESPA', ['RESPA', 'Real Estate Settlement Procedures Act'], 'Mortgage'],
  ['Regulation X', ['Regulation X', 'Reg X'], 'Mortgage'],
  ['TILA', ['TILA', 'Truth in Lending Act'], 'Mortgage'],
  ['Regulation Z', ['Regulation Z', 'Reg Z'], 'Mortgage'],
  ['FCRA', ['FCRA', 'Fair Credit Reporting Act'], 'Mortgage', 'Fair Credit Reporting Act (FCRA)'],
  ['Dodd-Frank', ['Dodd-Frank', 'Dodd Frank'], 'Mortgage'],
  ['CFPB', ['CFPB', 'Consumer Financial Protection Bureau'], 'Mortgage'],
  ['Fannie Mae', ['Fannie Mae', 'FNMA'], 'Mortgage'],
  ['Freddie Mac', ['Freddie Mac', 'FHLMC'], 'Mortgage'],
  ['Foreclosure Review', ['foreclosure review', 'foreclosure'], 'Mortgage'],
  ['Loss Mitigation', ['loss mitigation'], 'Mortgage'],
  ['Qualified Written Requests', ['qualified written requests', 'QWR'], 'Mortgage', 'Qualified Written Requests (QWR)'],
  ['Payment Histories', ['payment histories', 'payment history'], 'Mortgage'],
  ['Loan Documents', ['loan documents', 'loan documentation'], 'Mortgage'],
  ['Investor Requirements', ['investor requirements', 'investor guidelines'], 'Mortgage'],
  ['FileNet', ['FileNet'], 'Technology'],
  ['LPS', ['LPS'], 'Technology'],
  ['MERS', ['MERS'], 'Technology'],
  ['AS/400', ['AS/400', 'AS400'], 'Technology'],
  ['QuickBooks', ['QuickBooks'], 'Finance'],
  // Missing tools and responsibilities stay in the review panel until source evidence is added.
  ['Agile', ['Agile', 'Scrum'], 'Business'],
  ['SDLC', ['SDLC', 'software development life cycle'], 'Technology'],
  ['Jira', ['Jira'], 'Technology'],
  ['Confluence', ['Confluence'], 'Technology'],
  ['Power BI', ['Power BI'], 'Data'],
  ['Tableau', ['Tableau'], 'Data'],
  ['Power Query', ['Power Query'], 'Data'],
  ['VBA', ['VBA'], 'Technology'],
  ['SAP', ['SAP'], 'Technology'],
  ['Oracle', ['Oracle'], 'Technology'],
  ['Aderant', ['Aderant'], 'Finance'],
  ['Elite 3E', ['Elite 3E', '3E'], 'Finance'],
  ['BillBlast', ['BillBlast'], 'Finance'],
  ['LEDES', ['LEDES'], 'Finance'],
  ['Electronic Billing', ['electronic billing', 'eBilling', 'e-billing'], 'Finance'],
  ['Encompass', ['Encompass'], 'Mortgage'],
  ['TRID', ['TRID'], 'Mortgage'],
  ['Closing Disclosure', ['Closing Disclosure'], 'Mortgage'],
  ['Loan Estimate', ['Loan Estimate'], 'Mortgage'],
  ['GRC', ['GRC', 'governance risk and compliance'], 'Risk'],
  ['SOX', ['SOX', 'Sarbanes-Oxley'], 'Risk'],
  ['SOC 2', ['SOC 2', 'SOC2'], 'Risk'],
  ['NIST', ['NIST'], 'Risk'],
  ['ISO 27001', ['ISO 27001'], 'Risk'],
  ['KYC', ['KYC', 'know your customer'], 'Risk'],
  ['Conflicts Checks', ['conflicts checks', 'conflict checks', 'conflicts of interest'], 'Risk'],
  ['Client Intake', ['client intake', 'business intake', 'matter intake'], 'Business'],
  ['AWS', ['AWS', 'Amazon Web Services'], 'Technology'],
  ['Splunk', ['Splunk'], 'Technology'],
  ['Dynatrace', ['Dynatrace'], 'Technology'],
  ['APIs', ['APIs', 'API', 'REST APIs'], 'Technology'],
  ['Git', ['Git', 'GitHub'], 'Technology'],
  ['Kubernetes', ['Kubernetes'], 'Technology'],
  ['Docker', ['Docker'], 'Technology'],
  ['React', ['React', 'React.js'], 'Technology'],
  ['CISSP', ['CISSP'], 'Certification'],
  ['PMP', ['PMP'], 'Certification'],
  ['CPA', ['CPA'], 'Certification']
].map(([name, aliases, group, expanded]) => ({name, aliases, group, expanded: expanded || name}));

export function normalize(s) {
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/c#/g, 'csharp').replace(/\+/g, 'plus').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
export function hasPhrase(text, phrase) {
  return (' ' + normalize(text) + ' ').includes(' ' + normalize(phrase) + ' ');
}
export function masterText(master) {
  return [master.name, master.phone, master.email, master.linkedin, master.summary, master.competencies.join(' | '), ...master.roles.flatMap(r => [...roleHeaderFields(r).map(field=>r[field]), ...r.bullets]), ...master.skills.map(s => s.items.join(', ')), ...master.education.flatMap(e => [e.school, e.qualification, e.dates])].join('\n');
}
export function resumeText(resume) {
  return [resume.name.toUpperCase(), [resume.phone, resume.email, resume.linkedin].filter(Boolean).join(' | '), '', 'PROFESSIONAL SUMMARY', resume.summary, '', 'CORE COMPETENCIES', resume.competencies.join(' | '), '', 'PROFESSIONAL EXPERIENCE', ...resume.roles.flatMap(r => [...roleHeaderFields(r).map(field=>r[field]), ...r.bullets.map(b => '- ' + b), '']), 'TECHNICAL SKILLS', ...resume.skills.map(s => `${s.group}: ${s.items.join(', ')}`), '', 'EDUCATION', ...resume.education.flatMap(e => [e.school, e.dates, e.qualification, ''])].join('\n');
}
const ignoredPhrases = new Set(['the role', 'this role', 'the position', 'this position', 'the team', 'our team', 'the company', 'our company', 'an equal opportunity employer', 'equal opportunity', 'united states', 'us', 'u s', 'the firm', 'firm approved', 'attention to detail', 'full time', 'part time', 'remote', 'hybrid', 'on site', 'on the job', 'all rights reserved', 'about us', 'apply now', 'job description', 'preferred qualifications', 'required qualifications', 'ats', 'hr', 'eeoc', 'eeo', 'eoe', 'pto', 'usd', 'est', 'et', 'pm', 'am']);
function candidatePhrases(jd, existing) {
  const candidates = new Map();
  const add = (str, origin) => {
    str = str.replace(/^[\s:•*\-]+|[\s,;:.)]+$/g, '').trim();
    const n = normalize(str);
    if (!n || ignoredPhrases.has(n) || str.length < 2 || str.length > 48 || /\d+\s*(years|months)|salary|benefits|vacation|insurance|equal opportunity|work authorization/i.test(str)) return;
    if (existing.some(k => k.aliases.some(a => hasPhrase(str, a) || hasPhrase(a, str))) || candidates.has(n)) return;
    candidates.set(n, {name: str, aliases: [str], expanded: str, group: 'Other', custom: true, origin});
  };
  // Capture unfamiliar named platforms/acronyms and short skills explicitly listed by the employer.
  for (const m of jd.matchAll(/\b(?:[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+|[A-Z][A-Z0-9]{1,7})(?:[ /-][A-Z][A-Z0-9]{1,7})?\b/g)) add(m[0], 'Named term');
  for (const m of jd.matchAll(/(?:experience (?:with|in|using)|proficiency (?:with|in)|proficient (?:with|in)|knowledge of|familiarity with|skills? (?:include|:)|tools? (?:include|:)|systems? (?:include|:))\s+([^\n.;]+)/gi)) {
    for (const part of m[1].split(/,|\band\b|\bor\b|\//i)) {
      const phrase = part.replace(/^(?:hands-on|advanced|strong|demonstrated|working|proven)\s+/i, '').replace(/\s+(?:is|are|will|must|to|for|including|such as)\s+.*$/i, '').trim();
      if (phrase.split(/\s+/).length <= 4) add(phrase, 'Stated skill');
    }
  }
  return [...candidates.values()].slice(0, 20);
}
function affirmativeMention(text,aliases){
  return String(text||'').split(/[\n;.!?]+|\b(?:but|however)\b/i).some(clause=>{
    if(!aliases.some(a=>hasPhrase(clause,a)))return false;
    const denied=/\b(?:no|without|lack(?:s|ing)?)\b.{0,50}\b(?:experience|knowledge|proficiency|skills?|certification)\b|\bnot\s+(?:experienced|proficient|skilled|certified|familiar)|\b(?:do|does)\s+not\s+(?:know|use)|\b(?:interested in|hope to learn|planning to learn|currently learning|aspiring to|seeking experience)\b/i;
    return !denied.test(clause);
  });
}
function qualificationSources(master){
  return [master.summary,...master.competencies,...master.roles.flatMap(r=>[r.title,...r.bullets]),...master.skills.flatMap(s=>s.items),...master.education.map(e=>e.qualification)];
}
export function auditEmploymentHistory(resume,master){
  const expected=master.roles||[],actual=resume.roles||[];
  const retained=expected.filter((role,i)=>actual[i]&&['title','employer','dates'].every(key=>actual[i][key]===role[key])).length;
  return {expected:expected.length,retained,complete:retained===expected.length&&actual.length===expected.length};
}
export function extractKeywords(jd, master, extra = '') {
  const corpus = masterText(master);
  const found = CATALOG.filter(k => k.aliases.some(a => hasPhrase(jd, a)));
  const manual = extra.split(/[,\n;]/).map(s => s.trim()).filter(Boolean).slice(0, 20).filter(name => !found.some(k => k.aliases.some(a => normalize(a) === normalize(name)))).map(name => ({name, aliases: [name], expanded: name, group: 'Selected', custom: true}));
  const all = [...found, ...candidatePhrases(jd, found), ...manual];
  const unique = [...new Map(all.map(k => [normalize(k.name), k])).values()];
  return unique.map(k => {
    const matched = k.aliases.filter(a => hasPhrase(jd, a));
    const evidence = master.roles.flatMap((r, i) => r.bullets.map((b, j) => ({role: r.title, employer: r.employer, roleIndex: i, bulletIndex: j, text: b}))).filter(b => affirmativeMention(b.text,k.aliases));
    const exactAlready = matched.some(a => hasPhrase(corpus, a));
    const supported = qualificationSources(master).some(text=>affirmativeMention(text,k.aliases));
    const terms = matched.length ? matched : [k.name];
    return {...k, jobTerms: terms, inJobDescription:matched.length>0, supported, exactAlready, evidence, frequency: terms.reduce((n, a) => n + Math.max(1, normalize(jd).split(normalize(a)).length - 1), 0)};
  }).sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));
}
const replacements = [
  {key: 'User Acceptance Testing', from: /\buser acceptance testing\b/gi, to: 'user acceptance testing (UAT)'},
  {key: 'Quality Assurance', from: /\bquality assurance\b/gi, to: 'quality assurance (QA)'},
  {key: 'Work in Process', from: /\bwork in process\b/gi, to: 'work in process (WIP)'},
  {key: 'Accounts Receivable', from: /\baccounts receivable\b/gi, to: 'accounts receivable (AR)'},
  {key: 'Root Cause Analysis', from: /\broot cause analysis\b/gi, to: 'root cause analysis (RCA)'},
  {key: 'National Flood Insurance Program', from: /\bNational Flood Insurance Program\b/g, to: 'National Flood Insurance Program (NFIP)'},
  {key: 'Qualified Written Requests', from: /\bqualified written requests\b/gi, to: 'qualified written requests (QWRs)'},
  {key: 'Force-Placed Insurance', from: /\binsurance placed by the lender\b/gi, to: 'force-placed insurance'},
  {key: 'Requirements Analysis', from: /\brequirements definition\b/gi, to: 'requirements analysis'},
  {key: 'Data Analysis', from: /\bAnalyzed large datasets\b/g, to: 'Performed data analysis on large datasets'},
  {key: 'Data Modeling', from: /\bbuilt data models, reports, and management insights\b/g, to: 'performed data modeling and developed reports and management insights'},
  {key: 'Microsoft Excel', from: /\badvanced Excel\b/g, to: 'advanced Microsoft Excel'},
  {key: 'Incident Resolution', from: /\bto resolve incidents, evaluate enhancements, and improve\b/g, to: 'on incident resolution, the evaluation of enhancements, and improvements to'},
  {key: 'Process Improvement', from: /\bimproved workflows and financial controls\b/g, to: 'supported process improvement and strengthened financial controls'},
  {key: 'Reconciliation', from: /\bReconciled loan payment histories\b/g, to: 'Performed reconciliation of loan payment histories'},
  {key: 'FCRA', from: /\bFair Credit Reporting Act requirements\b/g, to: 'Fair Credit Reporting Act (FCRA) requirements'}
];
function rewriteBullet(text, keywords) {
  let next = text;
  for (const r of replacements) {
    const kw = keywords.find(k => k.name === r.key && k.supported);
    if (!kw) continue;
    // Existing abbreviations are retained once, never stacked.
    if (r.to.includes('(') && /\b(?:UAT|QA|WIP|AR|RCA|NFIP|QWRs|FCRA)\b/.test(next)) {
      if (r.to.match(/\(([^)]+)\)/)?.[1] && hasPhrase(next, r.to.match(/\(([^)]+)\)/)[1])) continue;
    }
    const replacement=next.replace(r.from,r.to);
    // Preserve the employer's exact wording when a canonical synonym would remove it.
    if(kw.jobTerms.some(t=>hasPhrase(next,t))&&!kw.jobTerms.some(t=>hasPhrase(replacement,t)))continue;
    next = replacement;
  }
  return next.replace('Performed data analysis on large datasets and performed data modeling and developed reports and management insights', 'Performed data analysis and data modeling on large datasets, developing reports and management insights').replace('Analyzed large datasets and performed data modeling and developed reports and management insights','Analyzed large datasets and performed data modeling, developing reports and management insights');
}
function scoreText(text, keywords) {
  return keywords.reduce((s, k) => s + (k.aliases.some(a => hasPhrase(text, a)) ? Math.min(4, 1 + k.frequency * 0.4) : 0), 0);
}
function createSummary(master, keywords) {
  const backed = keywords.filter(k => k.supported);
  if (!backed.length || !master.summary.trim()) return master.summary;
  // Use the uploaded summary's tenure only; never attribute a total tenure to a specific tool.
  const tenure = master.summary.match(/(?:more than|over|approximately)?\s*\d+\+?\s*years?\s+of\s+experience/i)?.[0];
  const top = backed.filter(k => k.group !== 'Certification').slice(0, 5).map(k => k.expanded);
  if (!top.length) return master.summary;
  const details = top.slice(0, -1).join(', ') + (top.length > 1 ? ', and ' : '') + top[top.length-1];
  const ending = master.summary.match(/(?:Experienced partner|Experienced in|Known for)[^.]*\./)?.[0] || '';
  return `${tenure ? 'Professional with ' + tenure.trim().replace(/years?\s+of\s+experience/i, 'years of overall professional experience') + '. ' : ''}Relevant background includes ${details}. ${ending}`.trim();
}
function includesExactKeyword(text, k) {
  return k.jobTerms.length>0 && k.jobTerms.every(t => hasPhrase(text, t));
}
function auditText(text,keywords,original='') {
  const scored=keywords.filter(k=>k.inJobDescription!==false && k.jobTerms.length);
  const unique=new Map();
  for(const k of scored)for(const term of k.jobTerms) {
    const key=normalize(term),prior=unique.get(key);
    unique.set(key,{term,name:k.name,supported:!!k.supported||!!prior?.supported});
  }
  const phrases=[...unique.values()].map(p=>({...p,included:hasPhrase(text,p.term)}));
  const after=phrases.filter(p=>p.supported&&p.included).length;
  const before=phrases.filter(p=>p.supported&&hasPhrase(original,p.term)).length;
  const supported=phrases.filter(p=>p.supported).length,total=phrases.length;
  return {total,before,after,supported,target:WRITING_PROFILE.target,coverage:total?Math.floor(after/total*1000+1e-9)/10:0,score:total?Math.floor(after/total*100+1e-9)/10:0,targetMet:total>0&&after===total,possibleCoverage:total?Math.floor(supported/total*1000+1e-9)/10:0,targetPossible:total>0&&supported===total,termsNeeded:total-after,evidenceNeeded:total-supported,phrases,keywords:keywords.map(k=>({...k,included:includesExactKeyword(text,k),missingTerms:k.jobTerms.filter(t=>!hasPhrase(text,t)),scored:k.inJobDescription!==false}))};
}
export function auditResume(resume,keywords,master) {return auditText(resumeText(resume),keywords,masterText(master));}
export function auditCoverLetter(letter,keywords) {return auditText(letter.paragraphs.join(' '),keywords);}
export function reviewApplication(result,{reextract=false}={}) {
  if(reextract)result.keywords=extractKeywords(result.jd||'',result.master,result.extra||'');
  result.employmentAudit=auditEmploymentHistory(result.resume,result.master);
  result.audit=auditResume(result.resume,result.keywords,result.master);
  result.coverAudit=auditCoverLetter(result.coverLetter,result.keywords);
  result.review=writingReview(result.resume,result.coverLetter,result.englishCorrections?.length||0);
  return result;
}

const naturalTerm = k => k.custom || /Microsoft|Google|Excel|Python|Java|Salesforce|Azure|ServiceNow|Tableau|FileNet|QuickBooks|Fannie Mae|Freddie Mac|Dodd-Frank|Regulation [XZ]|National Flood Insurance Program|Fair Credit Reporting Act/.test(k.expanded) || (['Technology','Data','Certification'].includes(k.group)&&/[A-Z]{2}/.test(k.expanded)) ? k.expanded : k.expanded.replace(/\b[A-Z][a-z]+\b/g,s=>s.toLowerCase());
const proseList = items => items.length < 2 ? items[0] || '' : items.length === 2 ? items.join(' and ') : items.slice(0,-1).join(', ') + ', and ' + items[items.length-1];
const firstPerson = firstPersonBullet;
function preferredTerm(k) {
  if(k.jobTerms.some(t=>hasPhrase(k.expanded,t)))return k.expanded;
  if(k.jobTerms.some(t=>normalize(t)==='structured query language'))return 'Structured Query Language (SQL)';
  if(k.jobTerms.some(t=>normalize(t)==='work in progress'))return 'Work in Progress (WIP)';
  const phrase=k.jobTerms.find(t=>!actionVerb(t))||k.expanded;
  return phrase;
}
function termForProse(k) {
  const term=preferredTerm(k);
  return term===k.expanded?naturalTerm(k):term;
}
function optimizeResumeKeywords(resume,keywords,changes) {
  const missing=keywords.filter(k=>k.supported&&!includesExactKeyword(resumeText(resume),k));
  const additions=[];
  for(const k of missing) {
    const preferred=preferredTerm(k);
    if(!k.custom||preferred.split(/\s+/).length===1||!actionVerb(preferred))additions.push(preferred);
    for(const term of k.jobTerms)if(!hasPhrase(resumeText(resume)+' '+additions.join(' '),term)&&(!k.custom||term.split(/\s+/).length===1||!actionVerb(term)))additions.push(term);
  }
  if(additions.length){
    resume.skills.push({group:'Relevant expertise',items:[...new Set(additions)]});
    changes.push({section:'Relevant expertise',description:'Included supported employer wording that was missing after tailoring.',after:additions.join(', ')});
  }
}

export function createCoverLetter(result) {
  const {resume, keywords = [], title = '', company = '', createdAt = new Date().toISOString()} = result;
  const backed = keywords.filter(k=>k.supported);
  const roles = resume.roles.map((role,index)=>{
    const ranked = role.bullets.map((text,i)=>({text,index:i,score:scoreText(text,backed)})).sort((a,b)=>b.score-a.score||a.index-b.index);
    return {role,index,ranked,score:ranked.slice(0,2).reduce((n,b)=>n+b.score,0)+scoreText(role.title,backed)*2};
  }).filter(r=>r.ranked.length).sort((a,b)=>b.score-a.score||a.index-b.index);
  const terms = backed.filter(k=>k.group!=='Certification').slice(0,3).map(termForProse);
  const opening = `I am applying for ${title ? 'the ' + title + ' position' : 'the opportunity described in your posting'}${company ? ' at ' + company : ''}. ${terms.length ? 'My background includes ' + proseList(terms) + '.' : 'I would welcome the opportunity to discuss how my experience could contribute to your team.'}`;
  const evidence = [];
  const paragraphs = [opening];
  if (roles.length) {
    const primary = roles[0];
    const bullets = primary.ranked.slice(0,2).filter((b,i)=>i===0||b.score>0);
    if (bullets.length>1&&bullets.reduce((n,b)=>n+b.text.split(/\s+/).length,0)>115) bullets.pop();
    const context=primary.role.title&&primary.role.employer?`In my ${primary.role.title} role at ${primary.role.employer}, `:primary.role.employer?`At ${primary.role.employer}, `:primary.role.title?`In my ${primary.role.title} role, `:'';
    paragraphs.push(`${context}${firstPerson(bullets[0].text)}.${bullets[1] ? ' ' + firstPerson(bullets[1].text) + '.' : ''}`);
    evidence.push(...bullets.map(b=>({employer:primary.role.employer,title:primary.role.title,text:b.text})));
    const generalTerms=new Set(['Reporting','Internal Controls','Compliance','Technical Documentation','Training','Stakeholder Management']);
    const secondary = roles.slice(1).find(r=>{
      if(r.score<3||r.ranked[0]?.score<3)return false;
      const matched=backed.filter(k=>k.aliases.some(a=>hasPhrase(r.ranked[0].text,a)));
      return matched.length>=2&&matched.some(k=>!generalTerms.has(k.name));
    });
    if (secondary) {
      const bullet=secondary.ranked[0].text;
      paragraphs.push(`In a separate role at ${secondary.role.employer}, ${firstPerson(bullet)}.`);
      evidence.push({employer:secondary.role.employer,title:secondary.role.title,text:bullet});
    } else if (primary.ranked[2]?.score>0) {
      const bullet=primary.ranked[2].text;
      paragraphs.push(firstPerson(bullet).replace(/^I /,'I also ')+'.');
      evidence.push({employer:primary.role.employer,title:primary.role.title,text:bullet});
    }
  }
  // Add missing supported terms by subject, rather than an unrelated keyword dump.
  const groups=[['Technology','My technical skills include'],['Data','My analytical skills include'],['Testing','My testing experience includes'],['Finance','My financial operations experience includes'],['Mortgage','My mortgage operations experience includes'],['Risk','My work has also involved'],['Business','My experience also includes'],['Certification','My qualifications include'],['Other','My relevant skills include'],['Selected','My relevant skills include']];
  const core=paragraphs.join(' ');
  let additions=[];
  for(const k of backed) {
    if(includesExactKeyword(core+' '+additions.map(x=>x.proseTerm).join(' '),k))continue;
    const preferred=termForProse(k);
    if(!hasPhrase(core+' '+additions.map(x=>x.proseTerm).join(' '),preferred)&&(!k.custom||preferred.split(/\s+/).length===1||!actionVerb(preferred)))additions.push({...k,proseTerm:preferred});
    for(const term of k.jobTerms)if(!hasPhrase(core+' '+additions.map(x=>x.proseTerm).join(' '),term)&&(!k.custom||term.split(/\s+/).length===1||!actionVerb(term)))additions.push({...k,proseTerm:term});
  }
  const closing=`I would welcome the opportunity to discuss how this experience could support ${company || 'your team'}. Thank you for considering my application.`;
  const skillProse=items=>groups.flatMap(([group,prefix])=>{
    const terms=[...new Map(items.filter(k=>k.group===group).map(k=>[normalize(k.proseTerm),k.proseTerm])).values()],sentences=[];
    let chunk=[];
    for(const term of terms){
      if(chunk.length && (prefix+' '+proseList([...chunk,term])).split(/\s+/).length>38){sentences.push(prefix+' '+proseList(chunk)+'.');chunk=[];}
      chunk.push(term);
    }
    if(chunk.length)sentences.push(prefix+' '+proseList(chunk)+'.');
    return sentences;
  });
  const body=items=>[core,...skillProse(items),closing].join(' ');
  // Preserve accomplishment evidence. For a very broad posting, trim the lowest
  // priority supplemental terms only while every detected job phrase remains matched.
  for(const candidate of [...additions].reverse()){
    if(body(additions).split(/\s+/).length<=290)break;
    const reduced=additions.filter(k=>k!==candidate);
    if(auditText(body(reduced),keywords).targetMet)additions=reduced;
  }
  const skillSentences=skillProse(additions);
  for(let i=0;i<skillSentences.length;i+=2)paragraphs.push(skillSentences.slice(i,i+2).join(' '));
  paragraphs.push(closing);
  return polishCoverLetter({
    date: new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date(createdAt)),
    company, subject: title ? 'Application for ' + title : '', salutation:'Dear Hiring Manager,',
    paragraphs, closing:'Sincerely,', signature:resume.name, evidence, edited:false
  });
}

export function coverLetterText(letter,resume) {
  return [resume.name,[resume.phone,resume.email,resume.linkedin].filter(Boolean).join(' | '),'',letter.date,letter.company,...(letter.subject?[letter.subject]:[]),'',letter.salutation,'',...letter.paragraphs.flatMap(p=>[p,'']),letter.closing,letter.signature].filter(x=>x!==undefined).join('\n').replace(/\n{3,}/g,'\n\n');
}

export function tailorResume(master, jd, {title = '', company = '', length = 'balanced', extra = '', ats = 'general'} = {}) {
  if (jd.trim().length < 80 || jd.trim().split(/\s+/).length < 12) throw new Error('Paste a fuller job description (at least 80 characters and 12 words) so the app has enough detail to tailor your resume.');
  if (jd.length > 40000) throw new Error('Please keep the job description under 40,000 characters.');
  if (!masterText(master).trim()) throw new Error('Upload readable resume text before tailoring.');
  const keywords = extractKeywords(jd, master, extra);
  const backed = keywords.filter(k => k.supported);
  const changes = [];
  const resume = cloneData(master);
  resume.summary = createSummary(master, keywords);
  if (resume.summary !== master.summary) changes.push({section: 'Professional summary', description: 'Focused the summary on the strongest supported themes in this posting.', before: master.summary, after: resume.summary});
  const priority = backed.filter(k => k.group !== 'Certification').slice(0, 12).map(k => {
    if (k.custom) return k.name;
    const jobOnlyAlias = k.jobTerms.find(a => !hasPhrase(masterText(master), a));
    return jobOnlyAlias && !hasPhrase(k.expanded, jobOnlyAlias) ? jobOnlyAlias.replace(/\b[a-z]/g,c=>c.toUpperCase()) : k.expanded;
  });
  const remaining = master.competencies.filter(c => !priority.some(p => normalize(p).includes(normalize(c)) || normalize(c).includes(normalize(p))));
  resume.competencies = [...new Set([...priority, ...remaining])].slice(0, 14);
  if (priority.length) changes.push({section: 'Core competencies', description: 'Moved supported job keywords to the front of the skills section.', before: master.competencies.join(' | '), after: resume.competencies.join(' | ')});
  resume.roles = master.roles.map((role, roleIndex) => {
    const ranked = role.bullets.map((text, index) => ({text, index, score: scoreText(text, backed)})).sort((a, b) => b.score - a.score || a.index - b.index);
    const max = length === 'detailed' ? ranked.length : Math.min(ranked.length, roleIndex === 0 ? 4 : 3);
    const bullets = ranked.slice(0, max).map(b => {
      const next = rewriteBullet(b.text, keywords);
      if (next !== b.text) changes.push({section: `${role.employer} · ${role.title}`, description: 'Aligned wording with the posting using equivalent terms supported by this bullet.', before: b.text, after: next});
      return next;
    });
    if (bullets.length !== role.bullets.length || ranked.some((b, i) => b.index !== i)) changes.push({section: `${role.employer} · ${role.title}`, description: 'Prioritized the most relevant accomplishments while preserving the original employer, title, and dates.'});
    return {...role, bullets};
  });
  resume.skills = master.skills.map(s => ({...s, items: [...s.items].sort((a, b) => scoreText(b, backed) - scoreText(a, backed))})).sort((a, b) => scoreText(b.items.join(' '), backed) - scoreText(a.items.join(' '), backed));
  optimizeResumeKeywords(resume,keywords,changes);
  const polished=polishResume(resume);changes.push(...polished.corrections);
  if(!auditEmploymentHistory(polished.resume,master).complete)throw new Error('Every source job must be retained with its original title, company and dates. Please review the master resume.');
  const result = {resume:polished.resume,master:cloneData(master),jd,title:cleanEnglish(title),company:cleanEnglish(company),length,extra,ats,keywords,changes,englishCorrections:polished.corrections,writingProfile:WRITING_PROFILE.id,createdAt:new Date().toISOString()};
  result.coverLetter = createCoverLetter(result);
  return reviewApplication(result);
}

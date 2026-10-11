import {cloneData} from './browser.js';
// The user's complete verb bank. Select verbs for meaning, never to inflate responsibility.
export const ACTION_VERBS = {
  Leadership:'Accomplished Achieved Administered Analyzed Assigned Attained Chaired Consolidated Contracted Coordinated Delegated Developed Directed Earned Evaluated Executed Handled Headed Impacted Improved Increased Led Mastered Orchestrated Organized Oversaw Planned Predicted Prioritized Produced Proved Recommended Regulated Reorganized Reviewed Scheduled Spearheaded Strengthened Supervised Surpassed'.split(' '),
  Communication:'Addressed Arbitrated Arranged Authored Collaborated Convinced Corresponded Delivered Developed Directed Documented Drafted Edited Energized Enlisted Formulated Influenced Interpreted Lectured Liaised Mediated Moderated Negotiated Persuaded Presented Promoted Publicized Reconciled Recruited Reported Rewrote Spoke Suggested Synthesized Translated Verbalized Wrote'.split(' '),
  Research:'Clarified Collected Concluded Conducted Constructed Critiqued Derived Determined Diagnosed Discovered Evaluated Examined Extracted Formed Identified Inspected Interpreted Interviewed Investigated Modeled Organized Resolved Reviewed Summarized Surveyed Systematized Tested'.split(' '),
  Technical:'Assembled Built Calculated Computed Designed Devised Engineered Fabricated Installed Maintained Operated Optimized Overhauled Programmed Remodeled Repaired Solved Standardized Streamlined Upgraded'.split(' '),
  Teaching:[...'Adapted Advised Clarified Coached Communicated Coordinated Demystified Developed Enabled Encouraged Evaluated Explained Facilitated Guided Informed Instructed Persuaded'.split(' '),'Set Goals',...'Stimulated Studied Taught Trained'.split(' ')],
  Quantitative:'Administered Allocated Analyzed Appraised Audited Balanced Budgeted Calculated Computed Developed Forecasted Managed Marketed Maximized Minimized Planned Projected Researched'.split(' '),
  Creative:'Acted Composed Conceived Conceptualized Created Customized Designed Developed Directed Established Fashioned Founded Illustrated Initiated Instituted Integrated Introduced Invented Originated Performed Planned Published Redesigned Revised Revitalized Shaped Visualized'.split(' '),
  Helping:'Assessed Assisted Clarified Coached Counseled Demonstrated Diagnosed Educated Enhanced Expedited Facilitated Familiarized Guided Motivated Participated Proposed Provided Referred Rehabilitated Represented Served Supported'.split(' '),
  Organizational:'Approved Accelerated Added Arranged Broadened Cataloged Centralized Changed Classified Collected Compiled Completed Controlled Defined Dispatched Executed Expanded Gained Gathered Generated Implemented Inspected Launched Monitored Operated Organized Prepared Processed Purchased Recorded Reduced Reinforced Retrieved Screened Selected Simplified Sold Specified Steered Structured Systematized Tabulated Unified Updated Utilized Validated Verified'.split(' ')
};
export const WRITING_PROFILE = {
  id:'senior-hr-english-v3',
  perspective:'Hiring manager and HR professional with over 20 years of experience',
  target:100,
  standards:['Lead with relevant qualifications and evidence.','Start accomplishments with accurate action verbs.','Preserve original responsibilities, dates, qualifications, and metrics.','Use consistent English punctuation and clear sentences.','Use supported employer keywords naturally in both documents.']
};
const IRREGULAR = {Led:'Lead',Oversaw:'Oversee',Wrote:'Write',Rewrote:'Rewrite',Built:'Build',Earned:'Earn',Taught:'Teach',Spoke:'Speak',Proved:'Prove',Sold:'Sell',Planned:'Plan',Programmed:'Program',Referred:'Refer',Controlled:'Control',Set:'Set'};
const SPECIAL = {Managed:'Manage',Produced:'Produce',Analyzed:'Analyze',Maintained:'Maintain',Supported:'Support',Performed:'Perform',Resolved:'Resolve',Reviewed:'Review',Validated:'Validate',Executed:'Execute',Monitored:'Monitor',Completed:'Complete',Documented:'Document',Advised:'Advise',Delivered:'Deliver',Coordinated:'Coordinate',Investigated:'Investigate',Reconciled:'Reconcile',Organized:'Organize',Utilized:'Utilize',Applied:'Apply',Forecasted:'Forecast',Provided:'Provide',Developed:'Develop',Prepared:'Prepare',Trained:'Train',Created:'Create',Improved:'Improve',Streamlined:'Streamline',Standardized:'Standardize',Evaluated:'Evaluate',Administered:'Administer',Worked:'Work',Assisted:'Assist'};
for(const stem of 'Achieve Handle Increase Schedule Supervise Arrange Convince Influence Liaise Persuade Promote Conclude Critique Determine Diagnose Examine Assemble Compute Devise Upgrade Enable Guide Appraise Balance Compose Institute Introduce Revise Shape Enhance Expedite Propose Serve Change Compile Complete Define Purchase Reduce Reinforce Retrieve'.split(' '))SPECIAL[stem+'d']=stem;
const uniqueVerbs=[...new Set(Object.values(ACTION_VERBS).flat())];
const present = verb => SPECIAL[verb] || IRREGULAR[verb] || (/ied$/.test(verb)?verb.slice(0,-3)+'y':/ated$|ized$|ived$|olved$|oved$|lined$|aged$|ared$|ured$/.test(verb)?verb.slice(0,-1):verb.replace(/ed$/,''));
const openings = uniqueVerbs.flatMap(verb=>[{verb,form:verb},{verb,form:verb==='Set Goals'?'Set goals':present(verb)}]).sort((a,b)=>b.form.length-a.form.length);
export function actionVerb(text) {
  const body=String(text).trim().replace(/^I\s+(?:also\s+)?/i,'');
  return openings.find(v=>body.toLowerCase().startsWith(v.form.toLowerCase()+' ') || body.toLowerCase()===v.form.toLowerCase())?.verb || null;
}
export function cleanEnglish(value,terminal=false) {
  let s=String(value).normalize('NFC').trim().replace(/[\t\n\r ]+/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1').replace(/([,;:!?])(?=[A-Za-z])/g,'$1 ')
    .replace(/\b(the|and|to|of|in|with|for)\s+\1\b/gi,'$1')
    .replace(/\b(?:Bachelors|Bachelor's) of (Science|Arts)\b/g,'Bachelor of $1')
    .replace(/\b(?:Masters|Master's) of (Science|Arts)\b/g,'Master of $1')
    .replace(/\bin accordance to\b/gi,'in accordance with')
    .replace(/\bresponsible of\b/gi,'responsible for')
    .replace(/\bproficient of\b/gi,'proficient in')
    .replace(/\banalyzation\b/gi,'analysis');
  if(s && terminal){s=s.replace(/\.{2,}$/,'.');if(!/[.!?]$/.test(s))s+='.';}
  return s;
}
export function polishBullet(text,dates='') {
  let s=cleanEnglish(text).replace(/^[•*-]\s+/,'').replace(/^I\s+/i,'');
  const isCurrent=/\bpresent\b|\bcurrent\b/i.test(dates),wasGerund=/^(?:Was )?Responsible for (?:managing|maintaining|preparing)\b/i.test(s);
  // Equivalent responsibility, without changing support into leadership.
  s=s.replace(/^(?:Was )?[Rr]esponsible for managing\b/,'Managed').replace(/^(?:Was )?[Rr]esponsible for maintaining\b/,'Maintained').replace(/^(?:Was )?[Rr]esponsible for preparing\b/,'Prepared').replace(/^Worked with\b/,'Collaborated with');
  if(wasGerund){
    const parallel={managing:'Managed',maintaining:'Maintained',preparing:'Prepared',reviewing:'Reviewed',processing:'Processed',coordinating:'Coordinated',analyzing:'Analyzed',reporting:'Reported',validating:'Validated',resolving:'Resolved'};
    s=s.replace(/,?\s+and\s+(managing|maintaining|preparing|reviewing|processing|coordinating|analyzing|reporting|validating|resolving)\b/gi,(_,g)=>' and '+(isCurrent?present(parallel[g.toLowerCase()]):parallel[g.toLowerCase()]).toLowerCase());
  }
  const applied=s.match(/^Applied controls (.+) when evaluating (.+?)[.]?$/);
  if(applied)s='Evaluated '+applied[2].replace(/[.]$/,'')+' against controls '+applied[1]+'.';
  const verb=actionVerb(s);
  if(verb){
    const first=openings.find(v=>v.verb===verb&&s.toLowerCase().startsWith(v.form.toLowerCase()+' '));
    if(first)s=(isCurrent?(verb==='Set Goals'?'Set goals':present(verb)):verb==='Set Goals'?'Set goals':verb)+s.slice(first.form.length);
  }
  return cleanEnglish(s,true);
}
export function polishResume(source) {
  const resume=cloneData(source),corrections=[];
  const change=(before,after,section)=>{if(before!==after)corrections.push({section,description:'Edited English punctuation, sentence structure, or an equivalent action verb without adding a claim.',before,after});return after;};
  resume.summary=change(resume.summary,cleanEnglish(resume.summary,true),'Professional summary');
  resume.competencies=resume.competencies.map(c=>cleanEnglish(c));
  resume.roles=resume.roles.map(r=>({...r,bullets:r.bullets.map(b=>change(b,polishBullet(b,r.dates),r.employer+' · '+r.title))}));
  resume.education=resume.education.map(e=>({...e,qualification:change(e.qualification,cleanEnglish(e.qualification),'Education')}));
  return {resume,corrections};
}
export function polishCoverLetter(source) {
  const letter=cloneData(source);
  letter.paragraphs=letter.paragraphs.map(p=>cleanEnglish(p,true));
  if(/^Dear\b/i.test(letter.salutation))letter.salutation=cleanEnglish(letter.salutation).replace(/[,.;:!?]+$/,'')+',';
  if(/^(Sincerely|Kind regards|Best regards|Regards|Respectfully)[,.;:!?]?$/i.test(letter.closing.trim()))letter.closing=letter.closing.trim().replace(/[,.;:!?]+$/,'')+',';
  return letter;
}
export function firstPersonBullet(bullet) {
  const text=cleanEnglish(bullet).replace(/[.\s]+$/,''),clauses=[];
  let start=0;
  // Keep sentence punctuation without regex lookbehind (older Safari parsers).
  for(const match of text.matchAll(/;\s*|([.!?])\s+(?=[A-Z])/g)) {
    clauses.push(text.slice(start,match.index+(match[1]?1:0)));
    start=match.index+match[0].length;
  }
  clauses.push(text.slice(start));
  return clauses.map(c=>/^I\s/i.test(c)?c:'I '+c.replace(/^([A-Z])([a-z])/,(_,a,b)=>a.toLowerCase()+b)).map((c,i)=>i<clauses.length-1&&!/[.!?]$/.test(c)?c+'.':c).join(' ');
}
function inspect(text,label,{action=false,sentence=true}={}) {
  const issues=[];
  if(/\b(the|and|to|of|in|with|for)\s+\1\b/i.test(text))issues.push({location:label,message:'Remove the repeated word.'});
  if(/\s+[,.;:!?]|[,;:!?][A-Za-z]| {2,}/.test(text))issues.push({location:label,message:'Review spacing around punctuation.'});
  if(sentence && !/[.!?]$/.test(text.trim()))issues.push({location:label,message:'Add sentence-ending punctuation.'});
  if(action && !actionVerb(text))issues.push({location:label,message:'Start with an accurate action verb from your verb bank.'});
  if(text.split(/[.!?]\s+|;\s+/).some(s=>s.trim().split(/\s+/).length>50))issues.push({location:label,message:'Consider shortening this sentence for easier reading.'});
  if(/\b(?:Bachelors|Bachelor's) of (?:Science|Arts)\b|\bin accordance to\b|\bresponsible of\b|\bproficient of\b/i.test(text))issues.push({location:label,message:'Review the degree wording or preposition.'});
  return issues;
}
export function writingReview(resume,letter,correctionCount=0) {
  const bullets=resume.roles.flatMap(r=>r.bullets.map((text,i)=>({text,label:r.employer+' · '+r.title+' · bullet '+(i+1)})));
  const used=[...new Set(bullets.map(b=>actionVerb(b.text)).filter(Boolean))];
  const resumeIssues=[...inspect(resume.summary,'Professional summary'),...bullets.flatMap(b=>inspect(b.text,b.label,{action:true})),...resume.education.flatMap(e=>inspect(e.qualification,e.school,{sentence:false}))];
  const coverIssues=letter.paragraphs.flatMap((p,i)=>inspect(p,'Cover letter · paragraph '+(i+1)));
  const categories=Object.entries(ACTION_VERBS).map(([name,verbs])=>({name,used:verbs.filter(v=>used.includes(v)),verbs}));
  return {profile:WRITING_PROFILE,correctionCount,resumeIssues,coverIssues,actionBullets:bullets.filter(b=>actionVerb(b.text)).length,totalBullets:bullets.length,usedVerbs:used,categories,coverWords:letter.paragraphs.join(' ').trim().split(/\s+/).length,bankCount:uniqueVerbs.length};
}

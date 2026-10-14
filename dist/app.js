import {resumeFormat} from './formatting.js';
import {PrivateVault,VAULT_KEY} from './privacy.js';
import {createBlankMaster,roleHeaderFields} from './resume.js';
import {tailorResume, auditResume, resumeText, createCoverLetter, coverLetterText,reviewApplication} from './engine.js';
import {WRITING_PROFILE,polishResume,polishCoverLetter} from './writing.js';
import {createDownloadPayload,createExportBlob,configureSaveLink,configureShareButton,configurePrivateHandoff,isEmbedded} from './downloads.js';
import {initializeDialogs,openDialog,closeDialog,notify,fieldError,clearFieldError,showFieldError,focusElement} from './accessibility.js';
import {cloneData,trackViewport} from './browser.js';
import {ATS_PLATFORMS,ATS_TEMPLATE_RULES,getATSProfile,reviewATS,reviewATSFile} from './ats.js';
import {extractResumeText,parseResumeText} from './imports.js';

const $ = id => document.getElementById(id);
const escape = str => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = cloneData;
const MASTER_KEY = 'lw-resume-studio-master-v1', HISTORY_KEY = 'lw-resume-studio-history-v1';
// Retire the previous draft cache without touching the master or saved versions.
try {localStorage.removeItem('lw-resume-studio-draft-v1');} catch {}
let storageUnavailable=false;
const privateVault=new PrivateVault();let privateUnlocked=false;
const initiallyProtected=privateVault.exists();
function readStored(key, fallback) {
  if(initiallyProtected)return fallback;
  let saved;try{saved=localStorage.getItem(key);}catch{storageUnavailable=true;return fallback;}
  try{const value=JSON.parse(saved);return value??fallback;}catch{return fallback;}
}
function validMaster(m) {return m && typeof m.name === 'string' && typeof m.summary === 'string' && Array.isArray(m.roles) && m.roles.length && m.roles.every(r => r && typeof r.title === 'string' && typeof r.employer === 'string' && typeof r.dates === 'string' && Array.isArray(r.bullets) && r.bullets.every(b => typeof b === 'string')) && Array.isArray(m.skills) && m.skills.every(s => s && typeof s.group === 'string' && Array.isArray(s.items) && s.items.every(i => typeof i === 'string')) && Array.isArray(m.competencies) && m.competencies.every(c => typeof c === 'string') && Array.isArray(m.education) && m.education.every(e => e && typeof e.school === 'string' && typeof e.qualification === 'string' && typeof e.dates === 'string');}
const storedMaster=readStored(MASTER_KEY,null);
let history = readStored(HISTORY_KEY, []);
if (!Array.isArray(history)) history = [];
history = history.filter(v => v && validMaster(v.resume) && validMaster(v.master) && Array.isArray(v.keywords)).slice(0, 10);
// Recover only this browser's own saved source; never bundle a personal default.
const explicitlyBlank=storedMaster?.source==='Blank master resume'&&storedMaster.name===''&&Array.isArray(storedMaster.roles)&&storedMaster.roles.length===0;
let master=validMaster(storedMaster)?storedMaster:explicitlyBlank?createBlankMaster():clone(history.find(v=>validMaster(v.master))?.master||createBlankMaster());
let masterImportEpoch=0,masterImportController;
function masterReady() {return validMaster(master)&&master.name.trim()&&master.summary.trim()&&master.competencies.length>0&&master.roles.every(r=>r.employer.trim()&&r.title.trim()&&r.dates.trim()&&r.bullets.length);}
let historyDeletionFailed = false;
let current = null, activeTab = 'resume', workspaceEpoch = 0;
const pendingExportMarkup = new Map();
function toast(text) {notify(document,text);}
function showStorageNotice() {
  storageUnavailable=true;$('storage-note').hidden=false;
  $('storage-note').textContent='Browser storage is unavailable. Your edits and saved versions stay available only while this tab is open. Download copies before closing it.';
}
function storeValue(key,value) {
  if(privateVault.exists()){
    if(!privateUnlocked){toast('Unlock your protected workspace before saving.');return false;}
    return privateVault.write({master:key===MASTER_KEY?value:master,history:key===HISTORY_KEY?value:history}).then(()=>true).catch(()=>{showStorageNotice();toast('Protected data could not be saved. Download a copy before closing this tab.');return false;});
  }
  try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{showStorageNotice();toast('Browser storage is unavailable. This version works until the tab closes; download a copy to keep it.');return false;}
}
function showError(id, error) {showFieldError(document,id,error);}
function clearError(id) {clearFieldError(document,id);}
initializeDialogs(document);
trackViewport();
// Preserve a recovered browser-owned source independently of saved applications.
if(!validMaster(storedMaster)&&!explicitlyBlank&&validMaster(master))storeValue(MASTER_KEY,master);
$('ats-platform').innerHTML=ATS_PLATFORMS.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');
function dateLabel(value) {return new Date(value).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
function saveVersion(result) {
  result.id ||= globalThis.crypto?.randomUUID?.() || Date.now().toString(36);
  history = [clone(result), ...history.filter(v => v.id !== result.id)].slice(0, 10);
  storeValue(HISTORY_KEY, history); updateHistoryCount();
}
function updateHistoryCount() {$('history-count').textContent = history.length;}
function ensureCoverLetter(version) {
  const c=version.coverLetter;
  if (!c || !Array.isArray(c.paragraphs) || !c.paragraphs.length || !c.paragraphs.every(p=>typeof p==='string') || !['date','salutation','closing','signature'].every(k=>typeof c[k]==='string')) version.coverLetter=createCoverLetter(version);
  return version.coverLetter;
}
function updateExportChoice() {
  const label=$('export-document').value==='cover'?'cover letter':'resume';
  $('export-caption').textContent=current ? 'Choose a format, then save your file.' : 'Tailor your resume to enable downloads.';
  $('copy-resume').setAttribute('title','Copy '+label+' text');
  $('copy-resume').setAttribute('aria-label','Copy '+label+' text');
  for (const [format,name] of [['pdf','PDF'],['docx','Word .docx'],['txt','plain text']]) $('download-'+format).setAttribute('aria-label','Prepare '+label+' '+name+' download');
  $('edit-output').setAttribute('title','Edit tailored '+(activeTab==='cover'?'cover letter':'resume'));
  $('edit-output').setAttribute('aria-label','Edit tailored '+(activeTab==='cover'?'cover letter':'resume'));
}
function setTab(name) {
  activeTab = name;
  for (const tab of ['resume', 'cover', 'keywords', 'writing', 'ats', 'changes']) {
    $('tab-' + tab).classList.toggle('active', tab === name);
    $('tab-' + tab).setAttribute('aria-selected', String(tab === name));
    $('tab-' + tab).tabIndex = tab === name ? 0 : -1;
    $(tab + '-panel').hidden = tab !== name;
    $(tab + '-panel').tabIndex = tab === name ? 0 : -1;
  }
  if (name==='resume'||name==='cover') $('export-document').value=name;
  updateExportChoice();
}
function renderDocument(resume) {
  const style=resumeFormat(resume);
  const contact = [resume.phone, resume.email, resume.linkedin].filter(Boolean).map(escape).join(' | ');
  $('resume-document').innerHTML = `<h2 class="resume-name">${escape(resume.name.toUpperCase())}</h2><div class="resume-contact">${contact}</div><section class="resume-section"><h3>${escape(style.labels.summary)}</h3><p>${escape(resume.summary)}</p></section><section class="resume-section"><h3>${escape(style.labels.competencies)}</h3><p class="resume-competencies">${resume.competencies.map(escape).join(' | ')}</p></section><section class="resume-section"><h3>${escape(style.labels.roles)}</h3>${resume.roles.map(r => `<div class="resume-role">${roleHeaderFields(r).map(field=>`<div class="${field==='dates'?'role-dates':'employer'}">${escape(r[field])}</div>`).join('')}<ul>${r.bullets.map(b => `<li>${escape(b)}</li>`).join('')}</ul></div>`).join('')}</section><section class="resume-section"><h3>${escape(style.labels.skills)}</h3>${resume.skills.map(s => `<div class="skill-line"><strong>${escape(s.group)}:</strong> ${s.items.map(escape).join(', ')}</div>`).join('')}</section><section class="resume-section"><h3>${escape(style.labels.education)}</h3>${resume.education.map(e => `<div class="resume-education"><div class="role-heading"><span>${escape(e.school)}</span><span>${escape(e.dates)}</span></div><p>${escape(e.qualification)}</p></div>`).join('')}</section>`;
  const paper=$('resume-document'),markup=paper.innerHTML,blocks=[...markup.matchAll(/<section class="resume-section">[\s\S]*?<\/section>/g)].map(m=>m[0]),keys=['summary','competencies','roles','skills','education'];
  if(blocks.length===5)paper.innerHTML=markup.slice(0,markup.indexOf('<section'))+style.sectionOrder.map(key=>blocks[keys.indexOf(key)]).join('');
  paper.setAttribute('style',`--resume-font:${style.font};--resume-body:${style.bodySize*4/3}px;--resume-name:${style.nameSize*4/3}px;--resume-heading:${style.headingSize*4/3}px;--resume-leading:${style.lineHeight};--resume-ink:#${style.color};--resume-heading-ink:#${style.headingColor};--resume-align:${style.nameAlign};--resume-gap:${style.paragraphAfter*4/3}px;`);

}
function renderCoverLetter() {
  if (!current) {$('cover-document').innerHTML='';$('cover-notice').textContent='A matching cover letter is generated with every tailored resume.';return;}
  const letter=ensureCoverLetter(current),resume=current.resume;
  const contact=[resume.phone,resume.email,resume.linkedin].filter(Boolean).map(escape).join(' | ');
  $('cover-notice').textContent=`${letter.edited?'Your edited cover letter':'Tailored from the same job description and resume'} · Review before sending.`;
  $('cover-document').innerHTML=`<h2 class="resume-name">${escape(resume.name.toUpperCase())}</h2><div class="resume-contact">${contact}</div><div class="letter-meta"><p>${escape(letter.date)}</p>${letter.company?`<p>${escape(letter.company)}</p>`:''}${letter.subject?`<p class="letter-subject">${escape(letter.subject)}</p>`:''}</div><p class="letter-greeting">${escape(letter.salutation)}</p><div class="letter-body">${letter.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</div><p class="letter-signoff">${escape(letter.closing)}<br>${escape(letter.signature)}</p>`;
}
function keywordChip(k, cls = '') {return `<span class="keyword-chip ${cls}" title="${escape(k.jobTerms.join(', '))}"><span aria-hidden="true">${cls === 'gap' ? '!' : cls === 'missing' ? '○' : '✓'}</span>${escape(k.name)}</span>`;}
function renderKeywords() {
  if (!current) {$('keywords-panel').innerHTML = '<p class="analysis-empty">Add a job description to see supported keywords and gaps.</p>'; return;}
  const a=current.audit,c=current.coverAudit,gaps=a.keywords.filter(k=>!k.supported&&k.scored);
  const card=(label,a)=>`<div class="keyword-score"><strong>${label}</strong><span class="score-value">${a.total?a.score.toFixed(1):'—'}<small>/ 10</small></span><p>${a.total?a.after+' of '+a.total+' detected phrases · '+a.coverage+'%':'No job keywords detected'}</p><span class="target-status ${a.targetMet?'met':''}">${a.total?(a.targetMet?'10/10 target met':'Below the 10/10 target'):'Add specific requirements to the posting'}</span></div>`;
  const evidence = a.keywords.filter(k => k.supported).map(k => {
    const best = k.evidence[0];
    return `<div class="evidence-item"><strong>${escape(k.name)}</strong><small>${best ? escape(best.employer + ' · ' + best.role) : 'Supported in your master resume’s summary, competencies, skills, education, or job titles'}</small>${best ? `<p>${escape(best.text)}</p>` : ''}</div>`;
  }).join('');
  const rows=a.keywords.map(k=>{
    const cover=c.keywords.find(x=>x.name===k.name);
    const status=x=>`${x?.supported&&x.included?'✓ Included':x?.included?'Check claim':'Missing'}${x?.missingTerms?.length?`<small>${escape(x.missingTerms.join(', '))}</small>`:''}`;
    return `<tr><th scope="row">${escape(k.name)}<small>Job phrases: ${escape(k.jobTerms.join(', '))}</small>${!k.scored?'<small>Additional keyword; excluded from job match score</small>':''}</th><td>${status(k)}</td><td>${status(cover)}</td><td>${k.supported?'Supported':'Needs evidence'}</td></tr>`;
  }).join('');
  const targetNote=!a.total?'The score requires specific job keywords.':a.targetMet&&c.targetMet?'Both documents include 100% of the detected job phrases, backed by your master resume.':!a.targetPossible?`Your current master resume supports at most ${a.possibleCoverage}% of the detected phrases. ${a.evidenceNeeded} job phrase${a.evidenceNeeded===1?' needs':'s need'} accurate source evidence before a 10/10 match is possible.`:'Review the missing phrases below. A manually edited document may need supported wording restored.';
  $('keywords-panel').innerHTML=`<div class="keyword-scores">${card('Resume',a)}${card('Cover letter',c)}</div><p class="target-note">${targetNote}</p><p class="analysis-note">10/10 means every unique job phrase detected by the app appears in the document and is supported by your master resume. Matches ignore case and punctuation. Cover letter scores use its body. The app uses a keyword catalog and stated-skill detection; add any relevant phrases it missed. Additional terms absent from the posting do not affect the score. Employers may use other criteria, screening questions, and scoring rules.</p><div class="keyword-table-wrap" tabindex="0" role="region" aria-label="Scrollable keyword comparison"><table class="keyword-table"><caption>Keyword matches and source evidence</caption><thead><tr><th scope="col">Keyword</th><th scope="col">Resume</th><th scope="col">Cover letter</th><th scope="col">Source</th></tr></thead><tbody>${rows}</tbody></table></div><h3 class="analysis-heading">Needs your confirmation <span>${gaps.length} keyword groups</span></h3><div class="keyword-list">${gaps.map(k=>keywordChip(k,'gap')).join('')||'<p class="analysis-note">No unsupported job terms detected. Review the full posting for other requirements.</p>'}</div>${gaps.length?'<p class="gap-note">If you have these qualifications, add accurate evidence to your master resume and tailor again. Unsupported experience is never added just to raise a score.</p>':''}<h3 class="analysis-heading">Where the evidence comes from</h3>${evidence||'<p class="analysis-note">Source evidence will appear here for matched terms.</p>'}`;
}
function renderATS() {
  const {profile,checks,issues}=reviewATS(current,$('ats-platform').value);
  $('ats-panel').innerHTML=`<div class="writing-perspective"><span class="eyebrow">ATS FORMAT REVIEW</span><h3>${escape(profile.name)}</h3><p>${escape(profile.note)}</p></div>${current?`<h3 class="analysis-heading">Resume content checks</h3><p class="analysis-note">${issues?`${issues} check${issues===1?' needs':'s need'} review.`:'All listed content checks are ready.'} These checks review your documents, not the employer’s ATS.</p><ul class="ats-checks">${checks.map(c=>`<li><strong>${c.ok?'✓ Ready':'! Needs review'}</strong><span>${escape(c.label)}<small>${escape(c.detail)}</small></span></li>`).join('')}</ul>`:'<p class="analysis-empty">Tailor your documents to check their content.</p>'}<h3 class="analysis-heading">Export format</h3><ul class="writing-standards">${ATS_TEMPLATE_RULES.map(r=>`<li>${escape(r)}</li>`).join('')}</ul><p class="analysis-note">Choose Word or a text-based PDF when the application accepts it. Plain text is also available for copying into forms. File size and format checks appear when you prepare a download.</p>${profile.sources.length?`<h3 class="analysis-heading">Platform guidance</h3><ul class="ats-sources">${profile.sources.map(([label,url])=>`<li><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}<span class="sr-only"> (opens in a new tab)</span></a></li>`).join('')}</ul>`:''}<p class="gap-note">The app is not connected to these 46 systems and cannot guarantee acceptance, ranking, or an interview. Most platforms use the shared format guidance above; specific guidance is shown where verified. Review the fields filled after upload and answer screening questions accurately.</p>`;
}
function renderWriting() {
  if(!current){$('writing-panel').innerHTML='<p class="analysis-empty">Tailor your documents to review English, action verbs, and the hiring perspective.</p>';return;}
  const r=current.review,issues=[...r.resumeIssues,...r.coverIssues];
  $('writing-panel').innerHTML=`<div class="writing-perspective"><span class="eyebrow">WRITING PERSPECTIVE</span><h3>${escape(WRITING_PROFILE.perspective)}</h3><p>Prioritize relevance, clear accomplishments, accurate responsibilities, and concise English.</p></div><div class="writing-stats"><div><strong>${r.actionBullets}/${r.totalBullets}</strong><span>Bullets with action verbs</span></div><div><strong>${r.correctionCount}</strong><span>Resume language edits</span></div><div><strong>${r.coverWords}</strong><span>Cover letter words</span></div></div><h3 class="analysis-heading">English and readability checks</h3><p class="analysis-note">Checks punctuation, repeated words, known wording errors, action-verb openings, and long sentences. These are automated checks; they cannot certify every grammar or factual detail.</p>${issues.length?issues.map(i=>`<div class="writing-issue"><strong>${escape(i.location)}</strong><p>${escape(i.message)}</p></div>`).join(''):'<p class="writing-pass">✓ No issues found by these checks.</p>'}<h3 class="analysis-heading">Action verbs used</h3><div class="keyword-list">${r.usedVerbs.map(v=>`<span class="keyword-chip">${escape(v)}</span>`).join('')}</div><details class="verb-bank"><summary>Your full action verb bank · ${r.bankCount} distinct verbs</summary>${r.categories.map(c=>`<h4>${escape(c.name)}</h4><p>${c.verbs.map(escape).join(' · ')}</p>`).join('')}</details><h3 class="analysis-heading">Writing standards</h3><ul class="writing-standards">${WRITING_PROFILE.standards.map(s=>`<li>${escape(s)}</li>`).join('')}</ul>`;
}
function renderChanges() {
  if (!current) {$('changes-panel').innerHTML = '<p class="analysis-empty">Tailor a resume to compare the changes with your source.</p>'; return;}
  $('changes-panel').innerHTML = `<p class="analysis-note">${current.changes.length} changes to focus this application. Employers, original job titles, dates, education, and existing metrics are carried from your master resume.</p>${current.changes.map(c => `<div class="change-item"><h3>${escape(c.section)}</h3><p>${escape(c.description)}</p>${c.before !== undefined ? `<div class="change-comparison"><div class="change-before"><b>Before</b>${escape(c.before)}</div><div class="change-after"><b>After</b>${escape(c.after)}</div></div>` : ''}</div>`).join('') || '<p class="analysis-note">No content changes were needed for the detected keywords.</p>'}`;
}
function refreshView() {
  if(current){ensureCoverLetter(current);reviewApplication(current);}
  if(current)renderDocument(current.resume);else $('resume-document').innerHTML='';
  renderCoverLetter(); renderKeywords(); renderWriting(); renderATS(); renderChanges();
  const ready=!!masterReady();
  $('master-detail').textContent = ready?`${master.roles.length} role${master.roles.length===1?'':'s'} · saved in this browser`:'Add your resume to begin.';
  $('master-name').textContent = ready?'Master resume loaded':'No master resume added';
  $('edit-master-inline').textContent=ready?'Manage':'Upload resume';
  $('source-summary').textContent=ready?'Your master resume is ready. Tailor a fresh version for each application.':'Add your master resume to tailor a fresh version for each application.';
  $('profile-name').textContent=master.name.trim()||'Your workspace';
  $('profile-initials').textContent=master.name.trim()?master.name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase():'LR';
  $('tailor-button').disabled=!ready;
  $('version-label').textContent = current ? 'TAILORED VERSION' : 'READY TO TAILOR';
  $('match-strip').hidden = !current;
  $('keyword-count').textContent = current ? current.audit.total : '';
  $('preview-notice').textContent = current ? [current.title || 'Tailored resume', current.company, 'Review the wording before you apply.'].filter(Boolean).join(' · ') : 'Add a job description to create your resume and cover letter.';
  if (current) {
    const a=current.audit,c=current.coverAudit;
    $('match-title').textContent = a.total?`Resume ${a.score.toFixed(1)}/10 · Cover letter ${c.score.toFixed(1)}/10 keyword match`:'No job keywords detected';
    $('match-subtitle').textContent = a.targetMet&&c.targetMet?'Your 10/10 target is met in both documents.':a.evidenceNeeded?`${a.evidenceNeeded} job phrase${a.evidenceNeeded===1?' needs':'s need'} source evidence to reach 10/10.`:'100% target · Review the missing keywords and writing checks.';
  } else {$('match-title').textContent='';$('match-subtitle').textContent='';}
  for (const id of ['edit-output', 'export-document', 'copy-resume', 'download-pdf', 'download-docx', 'download-txt']) $(id).disabled = !current;
  setTab(activeTab); updateHistoryCount();
}
function draft() {return {jd:$('job-description').value,title:$('job-title').value,company:$('company').value,length:$('length').value,extra:$('extra-keywords').value,ats:$('ats-platform').value};}
function updateCount() {$('char-count').textContent = $('job-description').value.length.toLocaleString() + ' / 40,000';}
for (const id of ['job-description','job-title','company','length','extra-keywords']) $(id).addEventListener('input', () => {updateCount(); clearError('form-error');});
$('ats-platform').addEventListener('change',()=>{if(current){current.ats=getATSProfile($('ats-platform').value).id;saveVersion(current);}renderATS();});
$('tailor-form').addEventListener('submit', async event => {
  if ($('tailor-button').disabled) {event.preventDefault();return;}
  event.preventDefault(); clearError('form-error'); const button = $('tailor-button'), epoch = workspaceEpoch;
  button.disabled = true; button.querySelector('span').textContent = 'Matching your experience…';
  $('tailor-form').setAttribute('aria-busy','true');
  $('output-panel').setAttribute('aria-busy','true');
  toast('Creating your tailored resume and cover letter. Please wait.');
  try {
    await new Promise(resolve => setTimeout(resolve, 120));
    if(epoch!==workspaceEpoch)return;
    const values = draft();
    current = tailorResume(master, values.jd, values);
    saveVersion(current); activeTab = 'resume'; refreshView();
    focusElement($('output-heading'));
    toast(`Your resume and matching cover letter are ready to review. Resume keyword match: ${current.audit.score} out of 10. Cover letter keyword match: ${current.coverAudit.score} out of 10.`);
  } catch (error) {showError('form-error',Object.assign(error,{fieldId:'job-description'}));toast('The documents were not created. Review the job description error.');}
  finally {if(epoch===workspaceEpoch){button.disabled = !masterReady(); button.querySelector('span').textContent = 'Tailor resume + cover letter';$('tailor-form').setAttribute('aria-busy','false');$('output-panel').setAttribute('aria-busy','false');}}
});
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
document.querySelector('.review-tabs').addEventListener('keydown', e => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key) || !e.target.matches('[data-tab]')) return;
  e.preventDefault(); const tabs = ['resume','cover','keywords','writing','ats','changes']; let i = tabs.indexOf(activeTab);
  i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  setTab(tabs[i]); $('tab-' + tabs[i]).focus();
});
$('view-keywords').addEventListener('click', () => {setTab('keywords');focusElement($('keywords-panel'));});
$('export-document').addEventListener('change',()=>{setTab($('export-document').value);});
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(document,b.dataset.close)));
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => {if (event.target === dialog) {const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(document,dialog.id);}});
$('open-help').addEventListener('click', event => openDialog(document,'help-dialog',event.currentTarget));
for (const [form,error] of [['output-form','output-error'],['cover-form','cover-error']]) $(form).addEventListener('input',()=>clearError(error));

function editorField(label, name, value, multiline = false, hint = '', context = '') {
  const purpose={'m-name':['text','name'],'m-email':['email','email'],'m-phone':['tel','tel'],'m-linkedin':['url','url']}[name]||['text','off'];
  const required=/^(?:m-(?:name|employer-\d+|dates-\d+|title-\d+|school-\d+|edates-\d+|qualification-\d+)|[mo]-(?:summary|competencies|bullets-\d+)|c-(?:date|salutation|closing|signature))$/.test(name);
  const requirement=required?' required':'';
  const descriptions=[context,hint?name+'-hint':''].filter(Boolean).join(' '),description=descriptions?` aria-describedby="${descriptions}"`:'';
  return `<div class="field"><label for="${name}">${escape(label)} <span>${required?'required':'optional'}</span></label>${multiline ? `<textarea id="${name}" name="${name}" maxlength="16000"${description}${requirement}>${escape(value)}</textarea>` : `<input id="${name}" name="${name}" type="${purpose[0]}" autocomplete="${purpose[1]}" value="${escape(value)}" maxlength="250"${description}${requirement}>`}${hint ? `<small id="${name}-hint">${escape(hint)}</small>` : ''}</div>`;
}
function buildEditor(resume,prefix){
  const roles=resume.roles.map((r,i)=>`<details class="role-editor" ${i===0?'open':''}><summary id="${prefix}role-context-${i}">${escape([r.title,r.employer].join(' · '))}</summary><div>${editorField('Accomplishment bullets',prefix+'bullets-'+i,r.bullets.join('\n'),true,'One complete bullet per line. No bullet symbol is needed.',prefix+'role-context-'+i)}</div></details>`).join('');
  return `<div class="editor-section"><h3>Professional summary</h3>${editorField('Summary',prefix+'summary',resume.summary,true)}</div><div class="editor-section"><h3>Core competencies</h3>${editorField('Competencies',prefix+'competencies',resume.competencies.join('\n'),true,'One competency per line.')}</div><div class="editor-section"><h3>Experience</h3>${roles}</div>`;
}
function lines(text) {return String(text).split('\n').map(s => s.replace(/^\s*[•*-]\s+/, '').trim()).filter(Boolean);}
function collectEditor(resume,prefix,form){
  const data=new FormData(form),value=key=>String(data.get(prefix+key)||'').trim(),next=clone(resume);
  next.summary=value('summary');next.competencies=lines(value('competencies'));
  next.roles=resume.roles.map((r,i)=>({...r,bullets:lines(value('bullets-'+i))}));
  if(!next.summary)throw fieldError('Enter a professional summary.',prefix+'summary');
  if(!next.competencies.length)throw fieldError('Enter at least one competency.',prefix+'competencies');
  for(const [i,role] of next.roles.entries())if(!role.bullets.length)throw fieldError(`Enter at least one accomplishment for ${role.title} at ${role.employer}.`,prefix+'bullets-'+i);
  return next;
}
function showImportedText(){
  const text=master.importedText||resumeText(master);
  $('master-import-preview').hidden=!master.name;$('master-import-text').value=master.name?text:'';
}
function cancelMasterImport(){
  masterImportEpoch++;masterImportController?.abort();masterImportController=undefined;
  $('master-upload').value='';$('master-upload').disabled=false;
  $('master-import').setAttribute('aria-busy','false');$('restore-master').disabled=!master.name;
}
function openMaster(event){
  if(privateVault.exists()&&!privateUnlocked){openPrivacy();return;}
  cancelMasterImport();$('master-import-status').textContent='';clearError('master-import-error');
  $('master-heading').textContent='Master resume';showImportedText();
  openDialog(document,'master-dialog',event.currentTarget);
}
// Clear the native picker before opening it so selecting the same file emits change.
$('master-upload').addEventListener('click',()=>{if(!$('master-upload').disabled)$('master-upload').value='';});
$('master-upload').addEventListener('change',async()=>{
  const file=$('master-upload').files?.[0];if(!file)return;
  cancelMasterImport();clearError('master-import-error');
  const epoch=masterImportEpoch,controller=new AbortController();masterImportController=controller;
  $('master-upload').disabled=true;$('restore-master').disabled=false;$('master-import').setAttribute('aria-busy','true');
  $('master-import-status').textContent='Reading and saving your resume in this browser…';
  try{
    const fileName=String(file.name).normalize('NFKC').trim().toLowerCase();
    const priorNames=[...(Array.isArray(master.uploadedFileNames)?master.uploadedFileNames:[]),master.importedFileName].filter(n=>typeof n==='string');
    if(priorNames.some(n=>n.normalize('NFKC').trim().toLowerCase()===fileName))throw new Error('This filename has already been used. Rename your file with a unique filename, then upload it again. Your existing master resume has not changed.');
    let formatting;const text=await extractResumeText(file,{signal:controller.signal,onFormatting:style=>{formatting=style;}});
    if(epoch!==masterImportEpoch||controller.signal.aborted||!$('master-dialog').open)return;
    const uploaded=parseResumeText(text);uploaded.formatting=formatting;uploaded.importedFileName=String(file.name).slice(0,250);uploaded.uploadedFileNames=[...new Set([...priorNames,uploaded.importedFileName])];
    if(!validMaster(uploaded)||!uploaded.name.trim()||!uploaded.summary.trim()||!uploaded.competencies.length||!uploaded.roles.every(r=>r.employer.trim()&&r.title.trim()&&r.dates.trim()&&r.bullets.length))throw new Error('The file needs a recognizable name, professional summary, skills, and job headings with role, company, years and accomplishments. Revise the source file and upload it again.');
    const saved=await storeValue(MASTER_KEY,uploaded);
    if(epoch!==masterImportEpoch||controller.signal.aborted||!$('master-dialog').open)return;
    master=uploaded;refreshView();showImportedText();
    $('master-import-status').textContent=saved?'Master resume uploaded and saved. You can tailor documents now. '+(formatting?.layoutNote||''):'Master resume is ready in this tab. Browser storage could not save it; keep your source file and download documents before closing this tab.';
    focusElement($('restore-master'));
  }catch(error){
    if(epoch===masterImportEpoch&&!controller.signal.aborted){$('master-upload').disabled=false;$('master-import-status').textContent='Your saved master resume has not changed.';showError('master-import-error',fieldError(error.message||'The resume could not be uploaded. Try a text-based file.','master-upload'));}
  }finally{
    if(epoch===masterImportEpoch){masterImportController=undefined;$('master-upload').value='';$('master-upload').disabled=false;$('master-import').setAttribute('aria-busy','false');$('restore-master').disabled=!master.name;}
  }
});
$('master-dialog').addEventListener('close',()=>{cancelMasterImport();$('master-import-text').value='';$('master-import-preview').hidden=true;});
for(const id of ['open-master','source-edit','edit-master-inline'])$(id).addEventListener('click',openMaster);
$('restore-master').addEventListener('click', async () => {
  if(!confirm('Clear this browser’s master resume and remove its prior information from the current workspace? Saved application versions remain available.'))return;
  cancelMasterImport();
  master=createBlankMaster();const cleared=await storeValue(MASTER_KEY,master);resetWorkspace();toast(cleared?'Your master resume is now blank. Saved application versions remain available.':'Your master resume is blank in this tab. Browser storage could not be updated, so the previous master may return after reopening.');
});

$('edit-output').addEventListener('click', event => {
  if (!current) return;
  if (activeTab==='cover') {
    const letter=ensureCoverLetter(current);
    $('cover-editor').innerHTML=editorField('Date','c-date',letter.date)+editorField('Company','c-company',letter.company||'')+editorField('Subject','c-subject',letter.subject||'')+editorField('Greeting','c-salutation',letter.salutation)+'<p id="cover-paragraph-guide" class="dialog-intro">Keep at least one paragraph. Blank paragraphs are omitted from the letter.</p>'+letter.paragraphs.map((p,i)=>editorField('Paragraph '+(i+1),'c-paragraph-'+i,p,true,'','cover-paragraph-guide')).join('')+editorField('Closing','c-closing',letter.closing)+editorField('Signature','c-signature',letter.signature);
    clearError('cover-error');openDialog(document,'cover-edit-dialog',event.currentTarget);return;
  }
  $('output-editor').innerHTML = buildEditor(current.resume,'o-'); clearError('output-error'); openDialog(document,'edit-dialog',event.currentTarget);
});
$('output-form').addEventListener('submit', event => {
  event.preventDefault(); clearError('output-error'); if (!current) return;
  try {
    const polished=polishResume(collectEditor(current.resume,'o-',event.currentTarget)),updated=polished.resume;
    const oldText = resumeText(current.resume), newText = resumeText(updated);
    if (oldText !== newText) {
      current.changes.push({section:'Your manual edits',description:'You edited this version. Confirm that every added claim is accurate.',before:oldText,after:newText});
      current.resume = updated; current.audit = auditResume(updated,current.keywords,current.master); current.edited = true;
      if (!current.coverLetter?.edited) current.coverLetter=createCoverLetter(current);
      current.englishCorrections=[...(current.englishCorrections||[]),...polished.corrections];reviewApplication(current);
      saveVersion(current);
    }
    closeDialog(document,'edit-dialog'); refreshView(); toast('Version saved and keyword coverage updated.');
  } catch(error) {showError('output-error',error);}
});

$('cover-form').addEventListener('submit',event=>{
  event.preventDefault();clearError('cover-error');if(!current)return;
  try {
    const data=new FormData(event.currentTarget),value=key=>String(data.get('c-'+key)||'').trim();
    const prior=ensureCoverLetter(current),next={...prior};
    for(const key of ['date','company','subject','salutation','closing','signature'])next[key]=value(key);
    next.paragraphs=prior.paragraphs.map((_,i)=>value('paragraph-'+i)).filter(Boolean);
    for (const [key,label] of [['date','date'],['salutation','greeting'],['closing','closing'],['signature','signature']]) if(!next[key])throw fieldError('Enter a '+label+' for your cover letter.','c-'+key);
    if(!next.paragraphs.length)throw fieldError('Enter at least one cover letter paragraph.','c-paragraph-0');
    next.edited=true;current.coverLetter=polishCoverLetter(next);reviewApplication(current);saveVersion(current);closeDialog(document,'cover-edit-dialog');refreshView();toast('Your cover letter has been saved and keyword match updated.');
  }catch(error){showError('cover-error',error);}
});

function renderHistory() {
  $('history-list').innerHTML = history.length ? history.map((v,i) => `<div class="history-item"><div><strong>${escape(v.title || 'Tailored application')}</strong><small>${escape([v.company,dateLabel(v.createdAt)].filter(Boolean).join(' · '))}</small><small>Resume + cover letter · ${v.audit?.after ?? 0} / ${v.audit?.total ?? 0} detected job terms${v.edited ? ' · Edited' : ''}</small></div><button class="secondary-button" data-open-version="${i}" aria-label="Open ${escape(v.title || 'tailored application')}${v.company ? ' at ' + escape(v.company) : ''}, ${escape(dateLabel(v.createdAt))}">Open</button></div>`).join('') : '<p class="analysis-empty">Your tailored applications will appear here.</p>';
  $('clear-history').disabled = !history.length && !historyDeletionFailed;
}
$('open-history').addEventListener('click', event => {renderHistory(); openDialog(document,'history-dialog',event.currentTarget);});
$('history-list').addEventListener('click', event => {
  const button = event.target.closest('[data-open-version]'); if (!button) return;
  const saved = history[Number(button.dataset.openVersion)]; if (!saved) return;
  current = clone(saved);
  if(!current.coverLetter){ensureCoverLetter(current);saveVersion(current);}
  $('job-description').value = current.jd; $('job-title').value = current.title; $('company').value = current.company; $('length').value = current.length || 'balanced'; $('extra-keywords').value = current.extra || '';
  $('ats-platform').value=getATSProfile(current.ats).id;
  reviewApplication(current,{reextract:true}); updateCount(); activeTab = 'resume'; refreshView(); closeDialog(document,'history-dialog',{returnTo:$('output-heading')}); toast('Saved version opened.');
});
function removeStoredVersions() {
  if(privateVault.exists())return storeValue(HISTORY_KEY,[]);
  try {localStorage.removeItem(HISTORY_KEY);return true;} catch {}
  // An empty replacement also deletes document contents if removal is restricted.
  try {localStorage.setItem(HISTORY_KEY,'[]');return true;} catch {showStorageNotice();return false;}
}
$('clear-history').addEventListener('click', async () => {
  const deleted = await removeStoredVersions();
  history = []; historyDeletionFailed = !deleted;
  resetWorkspace({keepHistoryOpen:true});renderHistory();focusElement($('history-heading'));
  toast(deleted?'All saved resumes and cover letters have been deleted.':'The resumes and cover letters were removed from this tab, but deletion from browser storage could not be confirmed. Try Clear saved versions again or clear this app’s data in your browser settings.');
});
// Other open app tabs must discard their copies when this browser history is cleared.
globalThis.addEventListener?.('storage', event => {
  if(event.key===VAULT_KEY){lockPrivacy(false);toast('Protected data changed in another tab. Unlock again to reload it.');return;}
  if(event.key!==HISTORY_KEY && event.key!==null)return;
  if(event.storageArea && event.storageArea!==globalThis.localStorage)return;
  if(event.key===HISTORY_KEY) {
    try {const saved=JSON.parse(event.newValue);if(saved!==null && (!Array.isArray(saved)||saved.length))return;} catch {return;}
  }
  history=[];historyDeletionFailed=false;resetWorkspace({keepHistoryOpen:true});renderHistory();
  if($('history-dialog').open)focusElement($('history-heading'));
  toast('Saved resumes and cover letters were deleted in another tab.');
});
let releaseDownload;
async function exportSelected(format) {
  if(!current)return;
  const version=clone(current),kind=$('export-document').value==='cover'?'cover':'resume',epoch=workspaceEpoch;
  const button=$('download-'+format),prior=button.innerHTML;
  if (button.disabled) return;
  pendingExportMarkup.set(button,prior);
  button.disabled=true;button.textContent='Preparing…';
  button.setAttribute('aria-busy','true');toast('Preparing your '+kind.replace('cover','cover letter')+' download. Please wait.');
  try {
    const payload=createDownloadPayload(version,kind,format);
    const blob=await createExportBlob(payload);
    if(epoch!==workspaceEpoch)return;
    releaseDownload?.();
    const releaseSave=configureSaveLink($('save-file'),$('save-status'),blob,payload);
    const releaseShare=configureShareButton($('save-share'),$('save-status'),blob,payload);
    const releaseHandoff=configurePrivateHandoff($('save-browser'),payload,$('save-status'));
    releaseDownload=()=>{releaseSave();releaseShare();releaseHandoff();};
    const embedded=isEmbedded();
    $('save-file').className=embedded?'secondary-button':'dark-button';
    $('save-browser').className=embedded?'dark-button':'secondary-button';
    $('save-file').textContent=embedded?'Download in this window':$('save-file').textContent;
    $('save-filename').textContent=payload.name;
    $('save-ats-note').textContent=reviewATSFile(payload,blob).note;
    $('save-heading').textContent=kind==='cover'?'Save your cover letter':'Save your resume';
    $('save-status').textContent=embedded?'Open the download page in a browser tab, then save your file. Your current document will carry over.':'Your file is ready. Choose where to save it below.';
    openDialog(document,'save-dialog',button);
  } catch(error) {if(epoch===workspaceEpoch)toast(error.message||'The document could not be prepared. Please try again.');}
  finally {if(epoch===workspaceEpoch){pendingExportMarkup.delete(button);button.innerHTML=prior;button.disabled=!current;button.setAttribute('aria-busy','false');}}
}
for(const format of ['docx','pdf','txt'])$('download-'+format).addEventListener('click',()=>exportSelected(format));
$('copy-resume').addEventListener('click', async event => {
  if (!current) return;
  const cover=$('export-document').value==='cover',text=cover?coverLetterText(current.coverLetter,current.resume):resumeText(current.resume),epoch=workspaceEpoch;
  try {
    if(typeof globalThis.navigator?.clipboard?.writeText!=='function')throw new Error('Manual copy needed');
    await globalThis.navigator.clipboard.writeText(text);if(epoch===workspaceEpoch)toast(cover?'Cover letter text copied.':'Resume text copied.');
  }catch {
    if(epoch!==workspaceEpoch)return;
    $('copy-heading').textContent=cover?'Copy cover letter text':'Copy resume text';$('copy-text').value=text;
    openDialog(document,'copy-dialog',event.currentTarget);
  }
});
$('select-copy-text').addEventListener('click',()=>{
  const field=$('copy-text');focusElement(field);field.select();field.setSelectionRange(0,field.value.length);
  toast('All document text is selected. Use your device’s Copy command.');
});
if(storageUnavailable)showStorageNotice();

function resetWorkspace({keepHistoryOpen=false}={}) {
  cancelMasterImport();$('master-import-text').value='';$('master-import-preview').hidden=true;$('master-import-status').textContent='';clearError('master-import-error');
  workspaceEpoch++;current=null;activeTab='resume';
  for(const id of ['job-description','job-title','company','extra-keywords'])$(id).value='';
  $('length').value='balanced';$('export-document').value='resume';$('ats-platform').value='general';
  document.querySelector('.options').open=false;
  for(const id of ['form-error','output-error','cover-error'])clearError(id);
  for(const dialog of document.querySelectorAll('dialog[open]'))if(!keepHistoryOpen || dialog.id!=='history-dialog')closeDialog(document,dialog.id);
  for(const id of ['output-editor','cover-editor'])$(id).innerHTML='';
  $('copy-text').value='';$('save-filename').textContent='';$('save-status').textContent='';$('save-ats-note').textContent='';
  releaseDownload?.();releaseDownload=undefined;
  for(const id of ['save-file','save-browser'])$(id).removeAttribute('href');
  for(const [button,markup] of pendingExportMarkup){button.innerHTML=markup;button.setAttribute('aria-busy','false');}
  pendingExportMarkup.clear();
  $('tailor-button').disabled=false;$('tailor-button').querySelector('span').textContent='Tailor resume + cover letter';
  $('tailor-form').setAttribute('aria-busy','false');$('output-panel').setAttribute('aria-busy','false');
  $('toast').textContent='';updateCount();refreshView();
}
resetWorkspace();
// Also clear browser-restored form values and back/forward cache snapshots.
globalThis.addEventListener?.('pageshow',resetWorkspace);

function openPrivacy(){
  clearError('privacy-error');$('privacy-password').value='';$('privacy-confirm').value='';
  const exists=privateVault.exists();$('privacy-confirm').hidden=exists;$('privacy-confirm-label').hidden=exists;
  $('privacy-submit').textContent=exists?'Unlock private workspace':'Protect saved data';$('privacy-lock').hidden=!privateUnlocked;
  $('privacy-state').textContent=exists?(privateUnlocked?'Your saved master and versions are encrypted. This tab is unlocked.':'Your saved data is encrypted and locked. Enter your passphrase to use it.'):'Saved data currently belongs to this browser profile. Protect it with a passphrase before sharing this device.';
  openDialog(document,'privacy-dialog',$('open-privacy'));
}
async function lockPrivacy(wait=true){
  if(wait){try{await privateVault.flush();}catch{}}
  privateVault.lock();privateUnlocked=false;master=createBlankMaster();history=[];resetWorkspace();refreshView();
  try{sessionStorage.removeItem('lw-resume-studio-export-v1');for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('lw-resume-studio-transfer-'))sessionStorage.removeItem(key);}}catch{}
  toast('Private workspace locked. Unlock it with your passphrase to restore saved data.');
}
$('open-privacy').addEventListener('click',openPrivacy);
$('privacy-lock').addEventListener('click',()=>lockPrivacy());
$('privacy-dialog').addEventListener('close',()=>{$('privacy-password').value='';$('privacy-confirm').value='';});
$('privacy-form').addEventListener('submit',async event=>{
  event.preventDefault();clearError('privacy-error');const password=$('privacy-password').value,exists=privateVault.exists();
  if(!exists&&password!==$('privacy-confirm').value){showError('privacy-error',fieldError('The passphrases do not match.','privacy-confirm'));return;}
  $('privacy-submit').disabled=true;$('privacy-form').setAttribute('aria-busy','true');
  try{
    if(exists){const data=await privateVault.unlock(password);master=validMaster(data.master)?data.master:createBlankMaster();history=data.history.filter(v=>v&&validMaster(v.resume)&&validMaster(v.master)&&Array.isArray(v.keywords)).slice(0,10);}
    else await privateVault.create(password,{master,history});
    // Also retry cleanup after an interrupted protection setup.
    for(const key of [MASTER_KEY,HISTORY_KEY,'lw-resume-studio-draft-v1'])localStorage.removeItem(key);
    if([MASTER_KEY,HISTORY_KEY].some(key=>localStorage.getItem(key)!==null))throw new Error('Legacy data could not be deleted. Clear this app’s browser data before using password protection on a shared device.');
    privateUnlocked=true;closeDialog(document,'privacy-dialog');resetWorkspace();refreshView();toast('Private workspace unlocked. Your saved data is available in this tab.');
  }catch(error){privateVault.lock();privateUnlocked=false;showError('privacy-error',fieldError(error.message,'privacy-password'));}
  finally{$('privacy-password').value='';$('privacy-confirm').value='';$('privacy-submit').disabled=false;$('privacy-form').setAttribute('aria-busy','false');}
});
if(initiallyProtected)toast('Your private workspace is locked. Choose Privacy and password to unlock it.');

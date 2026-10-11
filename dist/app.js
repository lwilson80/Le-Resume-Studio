import {createBlankMaster} from './resume.js';
import {tailorResume, auditResume, resumeText, createCoverLetter, coverLetterText,reviewApplication} from './engine.js';
import {WRITING_PROFILE,polishResume,polishCoverLetter} from './writing.js';
import {createDownloadPayload,createExportBlob,configureSaveLink,configureShareButton,downloadPageUrl,isEmbedded} from './downloads.js';
import {initializeDialogs,openDialog,closeDialog,notify,fieldError,clearFieldError,showFieldError,focusElement} from './accessibility.js';
import {cloneData,trackViewport} from './browser.js';
import {ATS_PLATFORMS,ATS_TEMPLATE_RULES,getATSProfile,reviewATS,reviewATSFile} from './ats.js';

const $ = id => document.getElementById(id);
const escape = str => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = cloneData;
const MASTER_KEY = 'lw-resume-studio-master-v1', HISTORY_KEY = 'lw-resume-studio-history-v1';
// Retire the previous draft cache without touching the master or saved versions.
try {localStorage.removeItem('lw-resume-studio-draft-v1');} catch {}
let storageUnavailable=false;
function readStored(key, fallback) {
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
let masterDraft=null;
function masterReady() {return validMaster(master)&&master.name.trim()&&master.summary.trim()&&master.competencies.length>0&&master.roles.every(r=>r.employer.trim()&&r.title.trim()&&r.dates.trim()&&r.bullets.length);}
let historyDeletionFailed = false;
let current = null, activeTab = 'resume', workspaceEpoch = 0;
const pendingExportMarkup = new Map();
function toast(text) {notify(document,text);}
function showStorageNotice() {
  storageUnavailable=true;$('storage-note').hidden=false;
  $('storage-note').textContent='Browser storage is unavailable. Your edits and saved versions stay available only while this tab is open. Download copies before closing it.';
}
function storeValue(key, value) {try {localStorage.setItem(key, JSON.stringify(value)); return true;} catch {showStorageNotice();toast('Browser storage is unavailable. This version works until the tab closes; download a copy to keep it.'); return false;}}
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
  const contact = [resume.phone, resume.email, resume.linkedin].filter(Boolean).map(escape).join(' | ');
  $('resume-document').innerHTML = `<h2 class="resume-name">${escape(resume.name.toUpperCase())}</h2><div class="resume-contact">${contact}</div><section class="resume-section"><h3>PROFESSIONAL SUMMARY</h3><p>${escape(resume.summary)}</p></section><section class="resume-section"><h3>CORE COMPETENCIES</h3><p class="resume-competencies">${resume.competencies.map(escape).join(' | ')}</p></section><section class="resume-section"><h3>PROFESSIONAL EXPERIENCE</h3>${resume.roles.map(r => `<div class="resume-role"><div class="employer">${escape(r.employer)}</div><div class="role-heading"><span>${escape(r.title)}</span><span>${escape(r.dates)}</span></div><ul>${r.bullets.map(b => `<li>${escape(b)}</li>`).join('')}</ul></div>`).join('')}</section><section class="resume-section"><h3>TECHNICAL SKILLS</h3>${resume.skills.map(s => `<div class="skill-line"><strong>${escape(s.group)}:</strong> ${s.items.map(escape).join(', ')}</div>`).join('')}</section><section class="resume-section"><h3>EDUCATION</h3>${resume.education.map(e => `<div class="resume-education"><div class="role-heading"><span>${escape(e.school)}</span><span>${escape(e.dates)}</span></div><p>${escape(e.qualification)}</p></div>`).join('')}</section>`;
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
  $('edit-master-inline').textContent=ready?'Edit':'Add resume';
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
for (const [form,error] of [['master-form','master-error'],['output-form','output-error'],['cover-form','cover-error']]) $(form).addEventListener('input',()=>clearError(error));

function editorField(label, name, value, multiline = false, hint = '', context = '') {
  const purpose={'m-name':['text','name'],'m-email':['email','email'],'m-phone':['tel','tel'],'m-linkedin':['url','url']}[name]||['text','off'];
  const required=/^(?:m-(?:name|employer-\d+|dates-\d+|title-\d+|school-\d+|edates-\d+|qualification-\d+)|[mo]-(?:summary|competencies|bullets-\d+)|c-(?:date|salutation|closing|signature))$/.test(name);
  const requirement=required?' required':'';
  const descriptions=[context,hint?name+'-hint':''].filter(Boolean).join(' '),description=descriptions?` aria-describedby="${descriptions}"`:'';
  return `<div class="field"><label for="${name}">${escape(label)} <span>${required?'required':'optional'}</span></label>${multiline ? `<textarea id="${name}" name="${name}" maxlength="16000"${description}${requirement}>${escape(value)}</textarea>` : `<input id="${name}" name="${name}" type="${purpose[0]}" autocomplete="${purpose[1]}" value="${escape(value)}" maxlength="250"${description}${requirement}>`}${hint ? `<small id="${name}-hint">${escape(hint)}</small>` : ''}</div>`;
}
function buildEditor(resume, prefix, full) {
  const entryButton=(action,index,label,disabled=false)=>`<button type="button" class="secondary-button" data-master-action="${action}" data-index="${index}"${disabled?' disabled':''}>${escape(label)}</button>`;
  const roles=resume.roles.map((r,i)=>`<details class="role-editor" ${i===0?'open':''}><summary id="${prefix}role-context-${i}">${escape([r.employer,r.title].filter(Boolean).join(' · ')||'Role '+(i+1))}</summary><div>${full?`<div class="field-row">${editorField('Employer',prefix+'employer-'+i,r.employer,false,'',prefix+'role-context-'+i)}${editorField('Dates',prefix+'dates-'+i,r.dates,false,'',prefix+'role-context-'+i)}</div>${editorField('Original job title',prefix+'title-'+i,r.title,false,'',prefix+'role-context-'+i)}`:''}${editorField('Accomplishment bullets',prefix+'bullets-'+i,r.bullets.join('\n'),true,'One complete bullet per line. No bullet symbol is needed.',prefix+'role-context-'+i)}${full?entryButton('remove-role',i,'Remove role '+(i+1),resume.roles.length===1):''}</div></details>`).join('');
  const skills=full?`<div class="editor-section"><h3>Technical skills</h3>${resume.skills.map((s,i)=>`<div class="role-editor">${editorField('Skill group '+(i+1),prefix+'skill-group-'+i,s.group)}${editorField('Skills in group '+(i+1),prefix+'skills-'+i,s.items.join(', '),false,'Separate skills with commas.')}${entryButton('remove-skill',i,'Remove skill group '+(i+1))}</div>`).join('')}<button type="button" id="master-add-skill" class="secondary-button" data-master-action="add-skill">Add skill group</button></div>`:'';
  const education=full?`<div class="editor-section"><h3>Education</h3>${resume.education.map((e,i)=>`<div class="role-editor"><h4 id="${prefix}education-context-${i}">${escape(e.school||'Education '+(i+1))}</h4><div class="field-row">${editorField('School',prefix+'school-'+i,e.school,false,'',prefix+'education-context-'+i)}${editorField('Date or status',prefix+'edates-'+i,e.dates,false,'',prefix+'education-context-'+i)}</div>${editorField('Degree or certificate',prefix+'qualification-'+i,e.qualification,false,'',prefix+'education-context-'+i)}${entryButton('remove-education',i,'Remove education '+(i+1))}</div>`).join('')}<button type="button" id="master-add-education" class="secondary-button" data-master-action="add-education">Add education</button></div>`:'';
  return `${full?`<div class="editor-section"><h3>Contact details</h3><div class="field-row">${editorField('Full name',prefix+'name',resume.name)}${editorField('Email',prefix+'email',resume.email)}</div><div class="field-row">${editorField('Phone',prefix+'phone',resume.phone)}${editorField('LinkedIn URL',prefix+'linkedin',resume.linkedin)}</div></div>`:''}<div class="editor-section"><h3>Professional summary</h3>${editorField('Summary',prefix+'summary',resume.summary,true)}</div><div class="editor-section"><h3>Core competencies</h3>${editorField('Competencies',prefix+'competencies',resume.competencies.join('\n'),true,'One competency per line.')}</div><div class="editor-section"><h3>Experience</h3>${roles}${full?'<button type="button" id="master-add-role" class="secondary-button" data-master-action="add-role">Add role</button>':''}</div>${skills}${education}`;
}
function lines(text) {return String(text).split('\n').map(s => s.replace(/^\s*[•*-]\s+/, '').trim()).filter(Boolean);}
function collectEditor(resume, prefix, full, form, validate=true) {
  const data = new FormData(form), value = key => String(data.get(prefix + key) || '').trim();
  const next = clone(resume);
  if (full) for (const key of ['name','email','phone','linkedin']) next[key] = value(key);
  next.summary = value('summary'); next.competencies = lines(value('competencies'));
  next.roles = resume.roles.map((r,i) => ({...r, ...(full ? {employer:value('employer-'+i),title:value('title-'+i),dates:value('dates-'+i)} : {}), bullets:lines(value('bullets-'+i))}));
  if (full) {
    next.skills = resume.skills.map((s,i) => ({...s,group:value('skill-group-'+i)||s.group||'Skills',items:value('skills-'+i).split(',').map(s => s.trim()).filter(Boolean)}));
    next.education = resume.education.map((e,i) => ({school:value('school-'+i),dates:value('edates-'+i),qualification:value('qualification-'+i)}));
  }
  if(!validate)return next;
  next.skills=next.skills.filter(s=>s.items.length);
  if (!next.name) throw fieldError('Enter your full name.',prefix+'name');
  if (!next.summary) throw fieldError('Enter a professional summary.',prefix+'summary');
  if (!next.competencies.length) throw fieldError('Enter at least one competency, with one competency per line.',prefix+'competencies');
  if (!next.roles.length) throw fieldError('Add at least one role.',full?'master-add-role':prefix+'summary');
  for (const [i,role] of next.roles.entries()) {
    for (const key of ['employer','title','dates']) if (!role[key]) throw fieldError(`Enter the ${key} for role ${i+1}.`,prefix+key+'-'+i);
    if (!role.bullets.length) throw fieldError(`Enter at least one accomplishment for ${role.title} at ${role.employer}.`,prefix+'bullets-'+i);
  }
  for (const [i,education] of next.education.entries()) for (const [key,field] of [['school','school'],['qualification','qualification'],['dates','edates']]) if (!education[key]) throw fieldError(`Enter the ${key==='dates'?'date or status':key} for education entry ${i+1}.`,prefix+field+'-'+i);
  return next;
}
function blankRole(){return {employer:'',title:'',dates:'',bullets:[]};}
function renderMasterDraft() {$('master-editor').innerHTML=buildEditor(masterDraft,'m-',true);}
function openMaster(event) {
  masterDraft=clone(master);if(!masterDraft.roles.length)masterDraft.roles.push(blankRole());
  $('master-heading').textContent=masterReady()?'Edit your master resume':'Add your master resume';
  $('restore-master').disabled=!masterReady();renderMasterDraft();clearError('master-error');
  openDialog(document,'master-dialog',event.currentTarget);
}
$('master-editor').addEventListener('click',event=>{
  const button=event.target.closest('[data-master-action]');if(!button||button.disabled||!masterDraft)return;
  masterDraft=collectEditor(masterDraft,'m-',true,$('master-form'),false);
  const action=button.dataset.masterAction,index=Number(button.dataset.index);let focusId;
  const types={role:['roles',blankRole,'employer',30],skill:['skills',()=>({group:'',items:[]}),'skill-group',20],education:['education',()=>({school:'',qualification:'',dates:''}),'school',20]};
  const [operation,type]=action.split('-'),config=types[type];if(!config)return;
  const [key,empty,field,limit]=config;
  if(operation==='add'){
    if(masterDraft[key].length>=limit){toast('You have reached the '+limit+' entry limit for '+type+'.');return;}
    masterDraft[key].push(empty());focusId='m-'+field+'-'+(masterDraft[key].length-1);
  }else if(operation==='remove'&&Number.isInteger(index)&&index>=0&&index<masterDraft[key].length){
    if(key==='roles'&&masterDraft.roles.length===1)return;
    masterDraft[key].splice(index,1);focusId='master-add-'+type;
  }else return;
  renderMasterDraft();clearError('master-error');const fieldElement=$(focusId);
  const details=fieldElement?.closest('details');if(details)details.open=true;focusElement(fieldElement);
});
for (const id of ['open-master','source-edit','edit-master-inline']) $(id).addEventListener('click', openMaster);
$('master-form').addEventListener('submit', event => {
  event.preventDefault(); clearError('master-error');
  try {master = collectEditor(masterDraft,'m-',true,event.currentTarget); master.source = 'Edited master resume'; const saved=storeValue(MASTER_KEY,master); closeDialog(document,'master-dialog'); refreshView(); toast(saved?'Master resume saved. Tailor again to use your updated experience.':'Master resume is ready in this tab. Browser storage is unavailable; download your documents before closing it.');}
  catch(error) {showError('master-error',error);}
});
$('restore-master').addEventListener('click', () => {
  if(!confirm('Clear this browser’s master resume and current workspace? Saved application versions remain available.'))return;
  master=createBlankMaster();const cleared=storeValue(MASTER_KEY,master);resetWorkspace();toast(cleared?'Your master resume is now blank. Saved application versions remain available.':'Your master resume is blank in this tab. Browser storage could not be updated, so the previous master may return after reopening.');
});

$('edit-output').addEventListener('click', event => {
  if (!current) return;
  if (activeTab==='cover') {
    const letter=ensureCoverLetter(current);
    $('cover-editor').innerHTML=editorField('Date','c-date',letter.date)+editorField('Company','c-company',letter.company||'')+editorField('Subject','c-subject',letter.subject||'')+editorField('Greeting','c-salutation',letter.salutation)+'<p id="cover-paragraph-guide" class="dialog-intro">Keep at least one paragraph. Blank paragraphs are omitted from the letter.</p>'+letter.paragraphs.map((p,i)=>editorField('Paragraph '+(i+1),'c-paragraph-'+i,p,true,'','cover-paragraph-guide')).join('')+editorField('Closing','c-closing',letter.closing)+editorField('Signature','c-signature',letter.signature);
    clearError('cover-error');openDialog(document,'cover-edit-dialog',event.currentTarget);return;
  }
  $('output-editor').innerHTML = buildEditor(current.resume,'o-',false); clearError('output-error'); openDialog(document,'edit-dialog',event.currentTarget);
});
$('output-form').addEventListener('submit', event => {
  event.preventDefault(); clearError('output-error'); if (!current) return;
  try {
    const polished=polishResume(collectEditor(current.resume,'o-',false,event.currentTarget)),updated=polished.resume;
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
  try {localStorage.removeItem(HISTORY_KEY);return true;} catch {}
  // An empty replacement also deletes document contents if removal is restricted.
  try {localStorage.setItem(HISTORY_KEY,'[]');return true;} catch {showStorageNotice();return false;}
}
$('clear-history').addEventListener('click', () => {
  const deleted = removeStoredVersions();
  history = []; historyDeletionFailed = !deleted;
  resetWorkspace({keepHistoryOpen:true});renderHistory();focusElement($('history-heading'));
  toast(deleted?'All saved resumes and cover letters have been deleted.':'The resumes and cover letters were removed from this tab, but deletion from browser storage could not be confirmed. Try Clear saved versions again or clear this app’s data in your browser settings.');
});
// Other open app tabs must discard their copies when this browser history is cleared.
globalThis.addEventListener?.('storage', event => {
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
    const payload=createDownloadPayload(version,kind,format),pageUrl=downloadPageUrl(payload);
    const blob=await createExportBlob(payload);
    if(epoch!==workspaceEpoch)return;
    releaseDownload?.();
    const releaseSave=configureSaveLink($('save-file'),$('save-status'),blob,payload);
    const releaseShare=configureShareButton($('save-share'),$('save-status'),blob,payload);
    releaseDownload=()=>{releaseSave();releaseShare();};
    $('save-browser').href=pageUrl;
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
  workspaceEpoch++;current=null;activeTab='resume';masterDraft=null;
  for(const id of ['job-description','job-title','company','extra-keywords'])$(id).value='';
  $('length').value='balanced';$('export-document').value='resume';$('ats-platform').value='general';
  document.querySelector('.options').open=false;
  for(const id of ['form-error','master-error','output-error','cover-error'])clearError(id);
  for(const dialog of document.querySelectorAll('dialog[open]'))if(!keepHistoryOpen || dialog.id!=='history-dialog')closeDialog(document,dialog.id);
  for(const id of ['master-editor','output-editor','cover-editor'])$(id).innerHTML='';
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

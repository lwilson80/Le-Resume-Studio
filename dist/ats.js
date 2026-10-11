import {resumeText,coverLetterText} from './engine.js';

// Names supplied by the user. Listing a system does not certify its live parser.
const names=['ADP Workforce Now','ApplicantAI','Applied','Apploi','Ashby','Asure','BambooHR','Brassring','Breezy HR','Bullhorn','Career puck','Cezanne','Cornerstone','Deel','Fountain','Frontline','Getro','Greenhouse','HireBridge','HRM Direct by Clear Company','iCims','JazzHR','JobAps','Juggle Hire','Lever (acquired by Employ)','Loxo','Manatal','Oracle','Pageup','Paycor','PeopleGuru','Pinpoint','Sage People','SAP SuccessFactors','SmartRecruiters','TalentLyft','TalentReef','Talexio','TeamTailor','TrackerRMS','TriNet Zenefits','UltiPro','Vista PDS','Workable','Workday','Zoho'];
const common='Use the file type and size limit shown by the employer’s application form. After uploading, review your name, contact details, work history, education, and skills in the fields it fills.';
const guidance={
  Greenhouse:{maxResumeBytes:2500000,note:'Greenhouse documents a 2.5 MB resume parsing limit and warns against columns, images, tables, and contact details in headers or text boxes.',sources:[['Greenhouse resume parsing guidance','https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse']]},
  Workable:{maxResumeBytes:5000000,resumeFormats:['docx','pdf'],note:'Workable’s resume field accepts DOCX and PDF among its supported types, with a 5 MB limit. Plain text is useful for copying, but TXT is not in its documented resume-upload list.',sources:[['Workable file formats and limits','https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form']]},
  Workday:{note:'Workday HiredScore documents DOCX, PDF, and TXT resume attachments. This is related product guidance; the employer’s Workday application form determines its own upload options.',sources:[['Workday HiredScore candidate profiles','https://doc.workday.com/hiredscore/en-us/workday-hiredscore/recruiter-productivity-/concept--candidate-profiles.html']]},
  'SAP SuccessFactors':{resumeFormats:['docx','pdf','txt'],note:'SAP’s candidate profile documentation includes DOCX, PDF, and TXT among resume and cover letter upload formats. Confirm the options in the employer’s form.',sources:[['SAP candidate profile guidance','https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/candidate-profile-in-sap-successfactors']]}
};
export const ATS_PLATFORMS=[{id:'general',name:'General ATS format',note:common,sources:[]},...names.map(name=>({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),name,note:common,sources:[],...guidance[name]}))];
export const ATS_TEMPLATE_RULES=['Single column with standard section headings.','Name and contact details in the document body.','Plain text paragraphs and bullets, with no tables, text boxes, photos, or hidden keywords.','Employer, job title, and employment dates on separate lines.','Readable Arial in Word and embedded fonts with selectable text in PDF.'];
export function getATSProfile(id) {return ATS_PLATFORMS.find(p=>p.id===id)||ATS_PLATFORMS[0];}

export function reviewATS(version,id=version?.ats) {
  const profile=getATSProfile(id);if(!version)return {profile,checks:[],issues:0};
  const r=version.resume,nonempty=s=>typeof s==='string'&&s.trim().length>0;
  const checks=[
    {id:'name',ok:nonempty(r.name),label:'Applicant name',detail:'A full name appears before the resume sections.'},
    {id:'contact',ok:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email||'')&&/[0-9]{3}/.test(r.phone||''),label:'Contact details',detail:'Include a readable email address and phone number in the main text.'},
    {id:'experience',ok:r.roles.length>0&&r.roles.every(role=>nonempty(role.employer)&&nonempty(role.title)&&/\b(?:19|20)\d{2}\b/.test(role.dates)&&role.bullets.length>0),label:'Employment history',detail:'Each role needs an employer, full job title, dates, and accomplishments.'},
    {id:'education',ok:r.education.length>0&&r.education.every(e=>nonempty(e.school)&&nonempty(e.qualification)),label:'Education',detail:'School and qualification appear in a separate Education section.'},
    {id:'keywords',ok:version.audit?.targetMet===true,label:'10/10 resume keyword target',detail:version.audit?.total?`${version.audit.after} of ${version.audit.total} detected job phrases are included with source evidence.`:'Add specific skills and responsibilities to the job description.'},
    {id:'placeholders',ok:!/(?:\[(?:your |insert |name|company|date)|lorem ipsum)/i.test(resumeText(r)),label:'Completed wording',detail:'Review placeholders and confirm every statement is accurate.'}
  ];
  return {profile,checks,issues:checks.filter(c=>!c.ok).length};
}
export function reviewATSFile(payload,blob) {
  const profile=getATSProfile(payload.ats),warnings=[],size=blob.size;
  if(payload.kind==='resume'&&profile.resumeFormats&&!profile.resumeFormats.includes(payload.format))warnings.push(`${profile.name}: choose Word or PDF for the resume upload. Use this plain text file for copying into a form.`);
  if(payload.kind==='resume'&&profile.maxResumeBytes&&size>profile.maxResumeBytes)warnings.push(`${profile.name}: this file exceeds its documented ${profile.maxResumeBytes/1000000} MB resume limit. Try Word or reduce the document before uploading.`);
  const text=payload.kind==='cover'?coverLetterText(payload.letter,payload.resume):resumeText(payload.resume);
  const plain=text.normalize('NFKD').replace(/[\u0300-\u036f\u2018\u2019\u201c\u201d\u2013\u2014\u2022]/g,'');
  if(payload.format==='pdf'&&/[^\x20-\x7e\n\r\t]/.test(plain))warnings.push('Some characters are outside this PDF font’s character set. Use Word or plain text to preserve them.');
  return {profile,size,warnings,note:`${profile.name} · ${(size/1000).toFixed(1)} KB. ${warnings.length?warnings.join(' '):'Check the employer’s upload instructions and review the fields after upload.'}`};
}

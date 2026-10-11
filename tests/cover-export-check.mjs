import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume,coverLetterText} from '../dist/engine.js';
import {createCoverDocx,createCoverPdf} from '../dist/exports.js';
const require=createRequire(import.meta.url),modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const api=name=>require(require.resolve(name,{paths:[modules]}));
const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
const output='/workspace/scratch/356b0cd894e6/cover-letter-qa';await fs.mkdir(output,{recursive:true});
const examples=[
  ['business','Business Applications Analyst','Example Technology Company','A Business Applications Analyst supports user acceptance testing, requirements analysis, root cause analysis, SQL, Salesforce, technical documentation and stakeholder management. Build reports and manage application enhancements. Jira experience is preferred.'],
  ['billing','Billing Analyst','Example Professional Services Firm','The Billing Analyst manages WIP, AR, billing recommendations, realization, utilization and month-end close. Prepare reports and advise partners on engagement economics. BillBlast and LEDES experience is required.'],
  ['mortgage','Mortgage Closer','Example Home Loans Company','A Mortgage Closer reviews title commitments, HUD-1 Settlement Statements, hazard and flood insurance and loan funding. Coordinate escrow disbursements and meet investor requirements and RESPA regulations. Encompass and Closing Disclosure experience is required.']
];
for(const [name,title,company,jd] of examples){
  const version=tailorResume(MASTER_RESUME,jd,{title,company});
  const word=await createCoverDocx(version.coverLetter,version.resume,api('docx'));
  await fs.writeFile(output+'/'+name+'.docx',Buffer.from(await word.arrayBuffer()));
  await fs.writeFile(output+'/'+name+'.pdf',await createCoverPdf(version.coverLetter,version.resume,api('pdf-lib'),fonts));
  await fs.writeFile(output+'/'+name+'.json',JSON.stringify(version,null,2));
  await fs.writeFile(output+'/'+name+'.txt',coverLetterText(version.coverLetter,version.resume));
  console.log(name,version.coverLetter.paragraphs.join(' ').split(/\s+/).length,'words; cover letter exports generated');
}

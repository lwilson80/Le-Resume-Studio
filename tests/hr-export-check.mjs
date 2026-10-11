// Internal export layout QA. Run with the primary artifact runtime.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume,CATALOG,hasPhrase,masterText} from '../dist/engine.js';
import {createDownloadPayload,createExportBlob,encodeDownloadPayload,decodeDownloadPayload} from '../dist/downloads.js';
const require=createRequire(import.meta.url),modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const api=name=>require(require.resolve(name,{paths:[modules]}));
const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
const dependencies={docx:api('docx'),pdf:api('pdf-lib'),fonts};
const supported=CATALOG.filter(k=>k.aliases.some(a=>hasPhrase(masterText(MASTER_RESUME),a))).map(k=>k.aliases[0]);
const samples=[
 ['business','Business Applications Analyst','We need a Business Applications Analyst with SQL, Salesforce, UAT, requirements analysis, root cause analysis, data modeling, advanced Excel, incident resolution, technical documentation and stakeholder management. Support application enhancements and reporting.'],
 ['billing','Billing Analyst','Our Billing Analyst manages WIP, billing recommendations, accounts receivable, AR, realization, utilization, budgets, forecasts, revenue recognition, profitability, reporting, engagement economics and month-end close. Maintain internal controls and financial operations.'],
 ['mortgage','Mortgage Closer','A Mortgage Closer manages loan funding, reviews title commitments, HUD-1 Settlement Statements, hazard insurance and flood insurance, coordinates escrow disbursements and meets investor requirements. Ensure RESPA and Regulation Z compliance.'],
 ['risk','Risk Analyst','A Risk Analyst supports operational risk, compliance monitoring, internal controls, risk management, reporting and quality assurance. Document findings, maintain audit documentation and provide technical documentation and training.'],
 ['wide','Operations Analyst','We seek an experienced operations analyst with the following skills: '+supported.join(', ')+'. Work with stakeholders to support accurate reporting, resolve exceptions, document requirements and improve regulated operations.']
];
const output='/workspace/scratch/356b0cd894e6/hr-export-qa';await fs.mkdir(output,{recursive:true});
for(const [name,title,jd] of samples){
 const result=tailorResume(MASTER_RESUME,jd,{title,company:'Example Company'});
 for(const kind of name==='business'||name==='wide'?['resume','cover']:['cover']){
  for(const format of ['docx','pdf']){
   const payload=decodeDownloadPayload('#document='+encodeDownloadPayload(createDownloadPayload(result,kind,format)));
   const blob=await createExportBlob(payload,dependencies);
   const bytes=Buffer.from(await blob.arrayBuffer());
   if(kind==='cover'&&format==='pdf')assert.equal((await dependencies.pdf.PDFDocument.load(bytes)).getPageCount(),1,name+' sample cover fits one page');
   await fs.writeFile(output+'/'+name+'-'+kind+'.'+format,bytes);
  }
 }
 await fs.writeFile(output+'/'+name+'.json',JSON.stringify(result,null,2));
 console.log(name,'resume',result.audit.coverage+'%','cover',result.coverAudit.coverage+'%',result.review.coverWords,'cover words');
}

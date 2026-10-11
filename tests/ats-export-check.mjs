// Internal artifact QA using the same vendored libraries as the browser app.
// Render the results with the documents skill and Poppler; do not ship QA samples.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume,CATALOG,hasPhrase,masterText} from '../dist/engine.js';
import {createDownloadPayload,createExportBlob,encodeDownloadPayload,decodeDownloadPayload} from '../dist/downloads.js';
import {reviewATSFile} from '../dist/ats.js';

const output=process.argv[2];
assert.ok(output&&path.isAbsolute(output),'Provide an absolute scratch output directory.');
await fs.mkdir(output,{recursive:true});
for(const name of ['docx.js','pdf-lib.min.js'])vm.runInThisContext(await fs.readFile(new URL('../dist/vendor/'+name,import.meta.url),'utf8'));
const fonts=await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n=>fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
const dependencies={docx:globalThis.docx,pdf:globalThis.PDFLib,fonts};
const supported=CATALOG.filter(k=>k.aliases.some(a=>hasPhrase(masterText(MASTER_RESUME),a))).map(k=>k.aliases[0]);
const samples=[
  ['business','Business Applications Analyst','We need a Business Applications Analyst with SQL, Structured Query Language, Salesforce, UAT, user acceptance testing, requirements analysis, root cause analysis, data modeling, advanced Excel, incident resolution, technical documentation and stakeholder management. Support application enhancements and reporting.'],
  ['wide','Operations Analyst','We seek an experienced operations analyst with the following skills: '+supported.join(', ')+'. Work with stakeholders to support accurate reporting, resolve exceptions, document requirements and improve regulated operations.']
];
for(const [name,title,jd] of samples){
  const result=tailorResume(MASTER_RESUME,jd,{title,company:'Example Company',ats:'greenhouse'});
  assert.equal(result.audit.score,10);assert.equal(result.coverAudit.score,10);
  for(const kind of ['resume','cover'])for(const format of ['docx','pdf']){
    const payload=decodeDownloadPayload('#document='+encodeDownloadPayload(createDownloadPayload(result,kind,format)));
    const blob=await createExportBlob(payload,dependencies);
    assert.equal(reviewATSFile(payload,blob).warnings.length,0);
    await fs.writeFile(path.join(output,`${name}-${kind}.${format}`),Buffer.from(await blob.arrayBuffer()));
    if(format==='pdf')console.log(name,kind,'PDF pages:',(await dependencies.pdf.PDFDocument.load(await blob.arrayBuffer())).getPageCount());
  }
  await fs.writeFile(path.join(output,name+'.json'),JSON.stringify(result,null,2));
  console.log(name,result.audit.total,'resume phrases',result.coverAudit.total,'cover phrases',result.review.coverWords,'cover words');
}

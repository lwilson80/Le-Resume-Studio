import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {MASTER_RESUME} from './fixtures/master-resume.js';
import {tailorResume} from '../dist/engine.js';
import {createDocx,createPdf} from '../dist/exports.js';

const require = createRequire(import.meta.url);
const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const api = name => require(require.resolve(name,{paths:[modules]}));
const output = '/workspace/scratch/356b0cd894e6/resume-qa';
await fs.mkdir(output,{recursive:true});
const fonts = await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(n => fs.readFile(new URL('../dist/vendor/'+n+'.cff',import.meta.url))));
const samples = {
  business:'We need a Business Applications Analyst with SQL, Salesforce, UAT, requirements analysis, data analysis, root cause analysis, advanced Excel, technical documentation, and stakeholder management. Support application enhancements and improve workflows. Jira and Agile experience preferred.',
  billing:'Our Billing Analyst manages WIP, AR, billing recommendations, realization, utilization, month-end close, forecasts and reporting. Work closely with partners on engagement economics and accounts receivable. Experience with BillBlast and LEDES is required.',
  mortgage:'The Mortgage Closer reviews title commitments, HUD-1 settlement statements, hazard and flood insurance, escrow disbursements and loan funding. Meet investor requirements and RESPA compliance. Experience with Encompass, TRID and Closing Disclosure is required.'
};
for (const [name,jd] of Object.entries(samples)) {
  const tailored = tailorResume(MASTER_RESUME,jd,{length:name==='mortgage'?'detailed':'balanced'});
  const blob = await createDocx(tailored.resume,api('docx'));
  await fs.writeFile(output+'/'+name+'.docx',Buffer.from(await blob.arrayBuffer()));
  await fs.writeFile(output+'/'+name+'.pdf',await createPdf(tailored.resume,api('pdf-lib'),fonts));
  await fs.writeFile(output+'/'+name+'.json',JSON.stringify(tailored,null,2));
  console.log(name, 'exports generated;', tailored.audit.after+'/'+tailored.audit.total,'detected terms present');
}

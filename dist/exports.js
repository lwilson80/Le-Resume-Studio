import {resumeFormat} from './formatting.js';
import {roleHeaderFields} from './resume.js';
const ascii = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2022/g, '-').replace(/[^\x20-\x7e\n]/g, '?');

export async function createDocx(resume, api = globalThis.docx) {
  if (!api) throw new Error('The Word export library did not load. Refresh the app and try again.');
  const {Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat} = api;
  const style=resumeFormat(resume),bodyHalf=Math.round(style.bodySize*2),nameHalf=Math.round(style.nameSize*2),headingHalf=Math.round(style.headingSize*2);
  const run = (text, options = {}) => new TextRun({text, font: style.font, size: bodyHalf, color:style.color, ...options});
  const p = (children, options = {}) => new Paragraph({children: typeof children === 'string' ? [run(children)] : children, spacing: {after: style.paragraphAfter*20, line:Math.round(style.lineHeight*240)}, ...options});
  const sectionMarkers=new Set(),defaultLabels={ 'PROFESSIONAL SUMMARY':'summary','CORE COMPETENCIES':'competencies','PROFESSIONAL EXPERIENCE':'roles','TECHNICAL SKILLS':'skills','EDUCATION':'education'};
  const heading = text => {const value=p([run(style.labels[defaultLabels[text]]||text,{bold:true,size:headingHalf,color:style.headingColor,underline:style.headingUnderline?{}:undefined})],{style:'Heading1',spacing:{before:150,after:85},keepNext:true});sectionMarkers.add(value);return value;};
  const children = [
    p([run(resume.name.toUpperCase(), {bold: true, size: nameHalf})], {style:'Title', alignment:style.nameAlign==='left'?AlignmentType.LEFT:AlignmentType.CENTER, spacing: {after: 90}, keepNext: true}),
    p([run([resume.phone, resume.email, resume.linkedin].filter(Boolean).join(' | '), {size:bodyHalf})], {alignment:style.nameAlign==='left'?AlignmentType.LEFT:AlignmentType.CENTER, spacing: {after: 120}}),
    heading('PROFESSIONAL SUMMARY'), p(resume.summary),
    heading('CORE COMPETENCIES'), p(resume.competencies.join(' | ')),
    heading('PROFESSIONAL EXPERIENCE')
  ];
  for (const role of resume.roles) {
    for(const [i,field] of roleHeaderFields(role).entries())children.push(p([run(role[field],{bold:field!=='dates'})],{keepNext:true,spacing:{before:i===0?125:0,after:i===2?75:35}}));
    for (const bullet of role.bullets) children.push(p(bullet, {numbering: {reference: 'resume-bullets', level: 0}, spacing: {after:style.paragraphAfter*20,line:Math.round(style.lineHeight*240)}, keepLines: true}));
  }
  children.push(heading('TECHNICAL SKILLS'));
  for (const skill of resume.skills) children.push(p([run(skill.group + ': ', {bold: true}), run(skill.items.join(', '))]));
  children.push(heading('EDUCATION'));
  for (const education of resume.education) {
    children.push(p([run(education.school, {bold: true})], {keepNext: true, spacing: {before: 90, after: 40}}));
    children.push(p(education.dates, {keepNext: true, spacing: {after: 40}}));
    children.push(p(education.qualification));
  }
  const labels=['summary','competencies','roles','skills','education'];
  // Heading positions are known while building: split by the actual heading paragraph objects.
  const built=children.slice(0,2),blocks={};let sectionIndex=-1;
  for(const paragraph of children.slice(2)){if(sectionMarkers.has(paragraph))sectionIndex++;if(sectionIndex>=0)(blocks[labels[sectionIndex]]||=[]).push(paragraph);}
  children.splice(0,children.length,...built,...style.sectionOrder.flatMap(key=>blocks[key]||[]));
  const document = new Document({
    creator: resume.name, title: resume.name + ' - Resume', description: 'Professional resume',
    styles: {default: {document: {run: {font: style.font, size:bodyHalf,color:style.color}, paragraph: {spacing: {line:Math.round(style.lineHeight*240)}}}}, paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',next:'Normal',run:{font:style.font,size:nameHalf,bold:true,color:'000000'},paragraph:{spacing:{after:90}}},{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',run:{font:style.font,size:headingHalf,bold:true,color:'000000'},paragraph:{outlineLevel:0,keepNext:true}}]},
    numbering: {config: [{reference: 'resume-bullets', levels: [{level: 0, format: LevelFormat.BULLET, text:style.bullet, alignment: AlignmentType.LEFT, style: {paragraph: {indent: {left: 225, hanging: 160}}}}]}]},
    sections: [{properties: {page: {size: {width:Math.round(style.pageWidth*20),height:Math.round(style.pageHeight*20)},margin:{top:Math.round(style.margin*20),bottom:Math.round(style.margin*20),left:Math.round(style.margin*20),right:Math.round(style.margin*20)}}}, children}]
  });
  return Packer.toBlob(document);
}

export async function createPdf(resume, api = globalThis.PDFLib, fontPrograms) {
  if (!api) throw new Error('The PDF export library did not load. Refresh the app and try again.');
  const {PDFDocument, StandardFonts, PDFName, rgb} = api;
  const document = await PDFDocument.create();
  document.setTitle(resume.name + ' - Resume');
  document.setAuthor(resume.name);
  document.setSubject('Professional resume');
  const style=resumeFormat(resume),family=/Times|Cambria|Georgia|Garamond|Baskerville/i.test(style.font)?'serif':/Courier|mono/i.test(style.font)?'mono':'sans';
  const font=await document.embedFont(family==='serif'?StandardFonts.TimesRoman:family==='mono'?StandardFonts.Courier:StandardFonts.Helvetica);
  const bold=await document.embedFont(family==='serif'?StandardFonts.TimesRomanBold:family==='mono'?StandardFonts.CourierBold:StandardFonts.HelveticaBold);
  const width=style.pageWidth,height=style.pageHeight,margin=style.margin,contentWidth=width-margin*2;
  const colorOf=hex=>rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);
  const textColor=colorOf(style.color),headingColor=colorOf(style.headingColor);
  let page, y;
  const newPage = () => { page = document.addPage([width, height]); y = height - margin; };
  newPage();
  const wrap = (text, size, selectedFont, maxWidth) => {
    const paragraphs = ascii(text).split('\n');
    return paragraphs.flatMap(paragraph => {
      const lines = [], words = paragraph.split(/\s+/).filter(Boolean); let line = '';
      for (let word of words) {
        if (selectedFont.widthOfTextAtSize(word, size) > maxWidth) {
          if (line) {lines.push(line); line = '';}
          let piece = '';
          for (const char of word) {if (selectedFont.widthOfTextAtSize(piece + char, size) > maxWidth) {lines.push(piece); piece = char;} else piece += char;}
          word = piece;
        }
        if (line && selectedFont.widthOfTextAtSize(line + ' ' + word, size) > maxWidth) {lines.push(line); line = word;}
        else line += (line ? ' ' : '') + word;
      }
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    });
  };
  const ensure = h => {if (y - h < margin) newPage();};
  const textBlock = (text, {size = style.bodySize, weight = false, indent = 0, after = 5, center = false, bullet = false, color = textColor, keepTogether = false} = {}) => {
    const selectedFont = weight ? bold : font;
    const lines = wrap(text, size, selectedFont, contentWidth - indent);
    const lineHeight = size * style.lineHeight;
    if (keepTogether && lines.length * lineHeight < height - margin * 2) ensure(lines.length * lineHeight);
    for (let i = 0; i < lines.length; i++) {
      ensure(lineHeight);
      const x = center ? (width - selectedFont.widthOfTextAtSize(lines[i], size)) / 2 : margin + indent;
      page.drawText(lines[i], {x, y: y - size, size, font: selectedFont, color});
      if (bullet && i === 0) page.drawText('-', {x: margin + 2, y: y - size, size, font, color});
      y -= lineHeight;
    }
    y -= after;
  };
  const heading = label => {
    ensure(48); y -= 6;
    const keys={'PROFESSIONAL SUMMARY':'summary','CORE COMPETENCIES':'competencies','PROFESSIONAL EXPERIENCE':'roles','TECHNICAL SKILLS':'skills','EDUCATION':'education'};
    textBlock(style.labels[keys[label]]||label,{size:style.headingSize,weight:true,after:7,color:headingColor});
  };
  textBlock(resume.name.toUpperCase(), {size:style.nameSize,weight:true,center:style.nameAlign==='center', after: 7, color: headingColor});
  textBlock([resume.phone, resume.email, resume.linkedin].filter(Boolean).join(' | '), {size:style.bodySize,center:style.nameAlign==='center', after: 9});
  const sections={summary:()=>{heading('PROFESSIONAL SUMMARY');textBlock(resume.summary,{keepTogether:true});},competencies:()=>{heading('CORE COMPETENCIES');textBlock(resume.competencies.join(' | '),{keepTogether:true});},
roles:()=>{
  heading('PROFESSIONAL EXPERIENCE');
  for (const role of resume.roles) {
    const headingLines = wrap(role.employer,style.bodySize,bold,contentWidth).length + wrap(role.title,style.bodySize,bold,contentWidth).length + wrap(role.dates,style.bodySize,font,contentWidth).length;
    const firstBulletLines = wrap(role.bullets[0] || '', style.bodySize, font, contentWidth - 12).length;
    ensure(15 + (headingLines + firstBulletLines) * style.bodySize * style.lineHeight);
    y -= 3;
    for(const field of roleHeaderFields(role))textBlock(role[field],{weight:field!=='dates',after:field==='dates'?6:3});
    for (const bullet of role.bullets) textBlock(bullet, {indent: 12, bullet: true, after: 3, keepTogether: true});
  }
},
skills:()=>{
  heading('TECHNICAL SKILLS');
  for (const skill of resume.skills) textBlock(skill.group + ': ' + skill.items.join(', '), {after: 5, keepTogether: true});
},
education:()=>{
  heading('EDUCATION');
  for (const education of resume.education) {
    const educationHeight = (wrap(education.school,style.bodySize,bold,contentWidth).length + wrap(education.dates,style.bodySize,font,contentWidth).length + wrap(education.qualification,style.bodySize,font,contentWidth).length) * style.bodySize * style.lineHeight + 14;
    ensure(educationHeight);
    textBlock(education.school, {weight: true, after: 3});
    textBlock(education.dates, {after: 3});
    textBlock(education.qualification, {after: 8});
  }
},
  };for(const key of style.sectionOrder)sections[key]();
  await embedPdfFonts(document,[font,bold],api,fontPrograms,family);
  return document.save();
}

async function embedPdfFonts(document,fonts,api,fontPrograms,family='sans') {
  const {PDFName}=api;
  // Embed matching Type 1 font programs so spacing stays consistent across PDF viewers.
  // ASCII exports use the matching WinAnsi metrics already provided by the standard-font API.
  const sources=family==='serif'?['pdfjs/standard_fonts/FoxitSerif.pfb','pdfjs/standard_fonts/FoxitSerifBold.pfb']:family==='mono'?['pdfjs/standard_fonts/FoxitFixed.pfb','pdfjs/standard_fonts/FoxitFixedBold.pfb']:['NimbusSans-Regular.cff','NimbusSans-Bold.cff'];
  const programs=(Array.isArray(fontPrograms)?fontPrograms:fontPrograms?.[family])||await Promise.all(sources.map(async name=>{const response=await fetch(new URL('./vendor/'+name,import.meta.url));if(!response.ok)throw new Error('A PDF font could not load. Refresh the app and try again.');return new Uint8Array(await response.arrayBuffer());}));
  for (const [i, selectedFont] of fonts.entries()) {
    await selectedFont.embed();
    let name=i?'NimbusSans-Bold':'NimbusSans-Regular',fontFile,descriptor;
    const bytes=new Uint8Array(programs[i]);
    if(family!=='sans'){
      // PDF.js standard-font .pfb assets contain CFF programs, despite their suffix.
      if(bytes[0]!==1)throw new Error('The matching PDF font program is invalid.');
      const header=bytes[2],offSize=bytes[header+2];
      const readOffset=at=>{let n=0;for(let k=0;k<offSize;k++)n=n*256+bytes[at+k];return n;};
      const first=readOffset(header+3),last=readOffset(header+3+offSize),data=header+3+2*offSize;
      name=new TextDecoder().decode(bytes.slice(data+first-1,data+last-1));
    }
    fontFile=document.context.register(document.context.flateStream(bytes,{Subtype:'Type1C'}));
    descriptor=document.context.register(document.context.obj({Type:'FontDescriptor',FontName:name,Flags:family==='serif'?34:family==='mono'?33:32,FontBBox:[-210,-307,1100,1100],ItalicAngle:0,Ascent:800,Descent:-220,CapHeight:700,StemV:i?120:80,FontFile3:fontFile}));
    const dict = document.context.lookup(selectedFont.ref);
    const widths = Array.from({length:95},(_,n) => selectedFont.widthOfTextAtSize(String.fromCharCode(n+32),1000));
    dict.set(PDFName.of('BaseFont'),PDFName.of(name));
    dict.set(PDFName.of('FontDescriptor'),descriptor);
    dict.set(PDFName.of('FirstChar'),document.context.obj(32));
    dict.set(PDFName.of('LastChar'),document.context.obj(126));
    dict.set(PDFName.of('Widths'),document.context.obj(widths));
  }
}

export async function createCoverDocx(letter,resume,api=globalThis.docx) {
  if(!api)throw new Error('The Word export library did not load. Refresh the app and try again.');
  const {Document,Packer,Paragraph,TextRun,AlignmentType}=api;
  const run=(text,options={})=>new TextRun({text,font:'Arial',size:22,color:'000000',...options});
  const p=(text,options={})=>new Paragraph({children:[run(text)],spacing:{after:180,line:280},...options});
  const children=[
    new Paragraph({style:'Title',children:[run(resume.name.toUpperCase(),{bold:true,size:34})],alignment:AlignmentType.CENTER,spacing:{after:100},keepNext:true}),
    new Paragraph({children:[run([resume.phone,resume.email,resume.linkedin].filter(Boolean).join(' | '),{size:21})],alignment:AlignmentType.CENTER,spacing:{after:300}}),
    p(letter.date,{spacing:{after:160},keepNext:true})
  ];
  if(letter.company)children.push(p(letter.company,{spacing:{after:160},keepNext:true}));
  if(letter.subject)children.push(new Paragraph({children:[run(letter.subject,{bold:true})],spacing:{after:240},keepNext:true}));
  children.push(p(letter.salutation,{keepNext:true}));
  for(const [index,paragraph] of letter.paragraphs.entries())children.push(new Paragraph({children:paragraph.split('\n').flatMap((line,i)=>[new TextRun({text:line,font:'Arial',size:22,color:'000000',...(i?{break:1}:{})})]),spacing:{after:190,line:280},keepLines:true,keepNext:index===letter.paragraphs.length-1}));
  children.push(p(letter.closing,{spacing:{before:80,after:100},keepNext:true}));
  children.push(p(letter.signature));
  const document=new Document({creator:resume.name,title:resume.name+' - Cover Letter',description:'Tailored cover letter',styles:{default:{document:{run:{font:'Arial',size:22,color:'000000'},paragraph:{spacing:{line:280}}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',next:'Normal',run:{font:'Arial',size:34,bold:true,color:'000000'},paragraph:{spacing:{after:100}}}]},sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:950,bottom:950,left:950,right:950}}},children}]});
  return Packer.toBlob(document);
}

export async function createCoverPdf(letter,resume,api=globalThis.PDFLib,fontPrograms) {
  if(!api)throw new Error('The PDF export library did not load. Refresh the app and try again.');
  const {PDFDocument,StandardFonts,rgb}=api;
  const document=await PDFDocument.create();document.setTitle(resume.name+' - Cover Letter');document.setAuthor(resume.name);document.setSubject('Tailored cover letter');
  const font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
  const width=612,height=792,margin=48,contentWidth=width-margin*2;let page,y;
  const newPage=()=>{page=document.addPage([width,height]);y=height-margin;};newPage();
  const wrap=(text,size,f)=>ascii(text).split('\n').flatMap(paragraph=>{
    const lines=[];let line='';
    for(let word of paragraph.split(/\s+/).filter(Boolean)){
      if(f.widthOfTextAtSize(word,size)>contentWidth){
        if(line){lines.push(line);line='';}let fragment='';
        for(const c of word){if(f.widthOfTextAtSize(fragment+c,size)>contentWidth){lines.push(fragment);fragment=c;}else fragment+=c;}word=fragment;
      }
      if(line&&f.widthOfTextAtSize(line+' '+word,size)>contentWidth){lines.push(line);line=word;}else line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);return lines.length?lines:[''];
  });
  const block=(text,{size=11,weight=false,center=false,after=12,keep=true}={})=>{
    const f=weight?bold:font,lines=wrap(text,size,f),lineHeight=size*1.2;
    if(keep&&lines.length*lineHeight<height-margin*2&&y-lines.length*lineHeight<margin)newPage();
    for(const line of lines){if(y-lineHeight<margin)newPage();const x=center?(width-f.widthOfTextAtSize(line,size))/2:margin;page.drawText(line,{x,y:y-size,size,font:f,color:rgb(0,0,0)});y-=lineHeight;}y-=after;
  };
  block(resume.name.toUpperCase(),{size:18,weight:true,center:true,after:7});
  block([resume.phone,resume.email,resume.linkedin].filter(Boolean).join(' | '),{size:10.5,center:true,after:24});
  block(letter.date,{after:10});
  if(letter.company)block(letter.company,{after:10});
  if(letter.subject)block(letter.subject,{weight:true,after:18});
  block(letter.salutation,{after:14});
  const signoffHeight=(wrap(letter.closing,11,font).length+wrap(letter.signature,11,font).length)*11*1.2+8;
  for(const [index,paragraph] of letter.paragraphs.entries()){
    if(index===letter.paragraphs.length-1){
      const closingHeight=wrap(paragraph,11,font).length*11*1.2+10+signoffHeight;
      if(closingHeight<height-margin*2&&y-closingHeight<margin)newPage();
    }
    block(paragraph,{after:10});
  }
  if(y-signoffHeight<margin)newPage();
  block(letter.closing,{after:8});block(letter.signature,{after:0});
  await embedPdfFonts(document,[font,bold],api,fontPrograms);
  return document.save();
}

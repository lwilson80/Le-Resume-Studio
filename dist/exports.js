const ascii = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2022/g, '-').replace(/[^\x20-\x7e\n]/g, '?');

export async function createDocx(resume, api = globalThis.docx) {
  if (!api) throw new Error('The Word export library did not load. Refresh the app and try again.');
  const {Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat} = api;
  const run = (text, options = {}) => new TextRun({text, font: 'Arial', size: 22, color:'000000', ...options});
  const p = (children, options = {}) => new Paragraph({children: typeof children === 'string' ? [run(children)] : children, spacing: {after: 70, line: 264}, ...options});
  const heading = text => p([run(text, {bold: true, size: 22})], {style:'Heading1',spacing: {before: 150, after: 85}, keepNext: true});
  const children = [
    p([run(resume.name.toUpperCase(), {bold: true, size: 34})], {style:'Title', alignment: AlignmentType.CENTER, spacing: {after: 90}, keepNext: true}),
    p([run([resume.phone, resume.email, resume.linkedin].filter(Boolean).join(' | '), {size: 21})], {alignment: AlignmentType.CENTER, spacing: {after: 120}}),
    heading('PROFESSIONAL SUMMARY'), p(resume.summary),
    heading('CORE COMPETENCIES'), p(resume.competencies.join(' | ')),
    heading('PROFESSIONAL EXPERIENCE')
  ];
  for (const role of resume.roles) {
    children.push(p([run(role.employer, {bold: true})], {keepNext: true, spacing: {before: 125, after: 35}}));
    children.push(p([run(role.title, {bold: true})], {keepNext: true, spacing: {after: 35}}));
    children.push(p(role.dates, {keepNext: true, spacing: {after: 75}}));
    for (const bullet of role.bullets) children.push(p(bullet, {numbering: {reference: 'resume-bullets', level: 0}, spacing: {after: 55, line: 264}, keepLines: true}));
  }
  children.push(heading('TECHNICAL SKILLS'));
  for (const skill of resume.skills) children.push(p([run(skill.group + ': ', {bold: true}), run(skill.items.join(', '))]));
  children.push(heading('EDUCATION'));
  for (const education of resume.education) {
    children.push(p([run(education.school, {bold: true})], {keepNext: true, spacing: {before: 90, after: 40}}));
    children.push(p(education.dates, {keepNext: true, spacing: {after: 40}}));
    children.push(p(education.qualification));
  }
  const document = new Document({
    creator: resume.name, title: resume.name + ' - Resume', description: 'Professional resume',
    styles: {default: {document: {run: {font: 'Arial', size: 22, color:'000000'}, paragraph: {spacing: {line: 264}}}}, paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',next:'Normal',run:{font:'Arial',size:34,bold:true,color:'000000'},paragraph:{spacing:{after:90}}},{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',run:{font:'Arial',size:22,bold:true,color:'000000'},paragraph:{outlineLevel:0,keepNext:true}}]},
    numbering: {config: [{reference: 'resume-bullets', levels: [{level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: {paragraph: {indent: {left: 225, hanging: 160}}}}]}]},
    sections: [{properties: {page: {size: {width: 12240, height: 15840}, margin: {top: 800, bottom: 800, left: 850, right: 850}}}, children}]
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
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = 612, height = 792, margin = 43, contentWidth = width - margin * 2;
  const textColor = rgb(0,0,0), headingColor = rgb(0,0,0);
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
  const textBlock = (text, {size = 11, weight = false, indent = 0, after = 5, center = false, bullet = false, color = textColor, keepTogether = false} = {}) => {
    const selectedFont = weight ? bold : font;
    const lines = wrap(text, size, selectedFont, contentWidth - indent);
    const lineHeight = size * 1.18;
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
    textBlock(label, {size: 11, weight: true, after: 7, color: headingColor});
  };
  textBlock(resume.name.toUpperCase(), {size: 18, weight: true, center: true, after: 7, color: headingColor});
  textBlock([resume.phone, resume.email, resume.linkedin].filter(Boolean).join(' | '), {size: 10.5, center: true, after: 9});
  heading('PROFESSIONAL SUMMARY'); textBlock(resume.summary, {keepTogether: true});
  heading('CORE COMPETENCIES'); textBlock(resume.competencies.join(' | '), {keepTogether: true});
  heading('PROFESSIONAL EXPERIENCE');
  for (const role of resume.roles) {
    const headingLines = wrap(role.employer,11,bold,contentWidth).length + wrap(role.title,11,bold,contentWidth).length + wrap(role.dates,11,font,contentWidth).length;
    const firstBulletLines = wrap(role.bullets[0] || '', 11, font, contentWidth - 12).length;
    ensure(15 + (headingLines + firstBulletLines) * 11 * 1.18);
    y -= 3;
    textBlock(role.employer, {weight: true, after: 3});
    textBlock(role.title, {weight: true, after: 3});
    textBlock(role.dates, {after: 6});
    for (const bullet of role.bullets) textBlock(bullet, {indent: 12, bullet: true, after: 3, keepTogether: true});
  }
  heading('TECHNICAL SKILLS');
  for (const skill of resume.skills) textBlock(skill.group + ': ' + skill.items.join(', '), {after: 5, keepTogether: true});
  heading('EDUCATION');
  for (const education of resume.education) {
    const educationHeight = (wrap(education.school,11,bold,contentWidth).length + wrap(education.dates,11,font,contentWidth).length + wrap(education.qualification,11,font,contentWidth).length) * 11 * 1.18 + 14;
    ensure(educationHeight);
    textBlock(education.school, {weight: true, after: 3});
    textBlock(education.dates, {after: 3});
    textBlock(education.qualification, {after: 8});
  }
  await embedPdfFonts(document,[font,bold],api,fontPrograms);
  return document.save();
}

async function embedPdfFonts(document,fonts,api,fontPrograms) {
  const {PDFName}=api;
  // Embed matching Type 1 font programs so spacing stays consistent across PDF viewers.
  // ASCII exports use the matching WinAnsi metrics already provided by the standard-font API.
  const programs = fontPrograms || await Promise.all(['NimbusSans-Regular','NimbusSans-Bold'].map(async name => {
    const response = await fetch(new URL('./vendor/' + name + '.cff', import.meta.url));
    if (!response.ok) throw new Error('A PDF font could not load. Refresh the app and try again.');
    return new Uint8Array(await response.arrayBuffer());
  }));
  for (const [i, selectedFont] of fonts.entries()) {
    await selectedFont.embed();
    const name = i ? 'NimbusSans-Bold' : 'NimbusSans-Regular';
    const fontFile = document.context.register(document.context.flateStream(programs[i],{Subtype:'Type1C'}));
    const descriptor = document.context.register(document.context.obj({Type:'FontDescriptor',FontName:name,Flags:32,FontBBox:i?[-188,-307,1069,1070]:[-210,-299,1032,1075],ItalicAngle:0,Ascent:718,Descent:-207,CapHeight:718,StemV:i?120:80,FontFile3:fontFile}));
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

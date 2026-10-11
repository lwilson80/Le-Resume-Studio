// A small source parser for semantic checks and handler adapters, not a browser.
const voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
export function parseHtml(source) {
  const root={tag:'#document',attrs:{},children:[]},stack=[root],nodes=[];
  for(const match of source.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g)) {
    const token=match[0];
    if(token.startsWith('<!'))continue;
    if(token.startsWith('</')) {
      const tag=token.match(/^<\/\s*([^\s>]+)/)[1].toLowerCase();
      if(stack.at(-1)?.tag!==tag)throw new Error('Unbalanced HTML near '+tag);
      stack.pop();continue;
    }
    if(token.startsWith('<')) {
      const tag=token.match(/^<\s*([^\s/>]+)/)[1].toLowerCase(),attrs={};
      const rest=token.slice(token.indexOf(tag)+tag.length,-1);
      for(const a of rest.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[a[1]]=a[2]??a[3]??a[4]??'';
      const node={tag,attrs,children:[],parent:stack.at(-1)};
      stack.at(-1).children.push(node);nodes.push(node);
      if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push(node);
    }else stack.at(-1).children.push(token);
  }
  if(stack.length!==1)throw new Error('Unclosed HTML element '+stack.at(-1).tag);
  return {root,nodes};
}
export function sourceText(node) {
  return node.children.map(c=>typeof c==='string'?c:sourceText(c)).join(' ').replace(/\s+/g,' ').trim();
}

// New visitors start with no applicant data. Browser-saved masters are loaded by app.js.
export function createBlankMaster() {
  return {name:'',phone:'',email:'',linkedin:'',source:'Blank master resume',summary:'',competencies:[],skills:[],roles:[],education:[]};
}

// Uploaded headings preserve field order; manually entered resumes use role/company/years.
export function roleHeaderFields(role) {
  const order=role.headerOrder;
  return Array.isArray(order)&&order.length===3&&new Set(order).size===3&&order.every(field=>['title','employer','dates'].includes(field))?order:['title','employer','dates'];
}

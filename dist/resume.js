// New visitors start with no applicant data. Browser-saved masters are loaded by app.js.
export function createBlankMaster() {
  return {name:'',phone:'',email:'',linkedin:'',source:'Blank master resume',summary:'',competencies:[],skills:[],roles:[],education:[]};
}

export const VAULT_KEY='le-resume-studio-private-vault-v1';
const encode=bytes=>btoa(Array.from(new Uint8Array(bytes),b=>String.fromCharCode(b)).join(''));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export class PrivateVault {
  constructor(storage,crypto=globalThis.crypto){try{this.storage=storage||globalThis.localStorage;}catch{this.storage=null;}this.crypto=crypto;this.queue=Promise.resolve();this.epoch=0;}
  exists(){try{return !!this.storage.getItem(VAULT_KEY);}catch{return false;}}
  async derive(password,salt){
    if(!this.crypto?.subtle)throw new Error('Password protection requires a secure browser connection with Web Crypto.');
    if(typeof password!=='string'||password.length<12)throw new Error('Use a passphrase of at least 12 characters.');
    const material=await this.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    return this.crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async create(password,data){
    if(this.exists())throw new Error('A protected workspace already exists. Unlock it with its passphrase.');
    if(!this.crypto?.subtle)throw new Error('Password protection requires a secure browser connection with Web Crypto.');
    const salt=this.crypto.getRandomValues(new Uint8Array(16));const key=await this.derive(password,salt);
    this.key=key;this.salt=salt;try{await this.write(data);}catch(error){this.lock();throw error;}
  }
  async unlock(password){
    let record;try{record=JSON.parse(this.storage.getItem(VAULT_KEY));}catch{}
    if(!record||record.schema!==1||record.iterations!==600000)throw new Error('The protected workspace cannot be read.');
    const salt=decode(record.salt),key=await this.derive(password,salt);
    try{
      const bytes=await this.crypto.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv),additionalData:new TextEncoder().encode('Le Resume Studio vault v1')},key,decode(record.ciphertext));
      const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||!Array.isArray(data.history)||!data.master)throw new Error('Invalid workspace');
      this.key=key;this.salt=salt;return data;
    }catch{throw new Error('The passphrase is incorrect, or the protected data has changed.');}
  }
  write(data){
    const snapshot=JSON.stringify(data),epoch=this.epoch,key=this.key,salt=this.salt;
    const operation=this.queue.catch(()=>{}).then(async()=>{
      if(!key||epoch!==this.epoch)throw new Error('Your protected workspace is locked.');
      const iv=this.crypto.getRandomValues(new Uint8Array(12));
      const bytes=await this.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('Le Resume Studio vault v1')},key,new TextEncoder().encode(snapshot));
      if(epoch!==this.epoch)throw new Error('Your protected workspace was locked before saving.');
      this.storage.setItem(VAULT_KEY,JSON.stringify({schema:1,iterations:600000,salt:encode(salt),iv:encode(iv),ciphertext:encode(bytes)}));
    });this.queue=operation;return operation;
  }
  async flush(){await this.queue;}
  lock(){this.epoch++;this.key=undefined;this.salt=undefined;}
}

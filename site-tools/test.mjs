import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {encrypt,decrypt} from './crypto.mjs';
import {build} from './build.mjs';
const source=fs.readFileSync(process.argv[2],'utf8'),password=process.env.DASHBOARD_PASSWORD;
const {html,bundle}=build(source,password);
assert.equal(decrypt(bundle,password),source);
assert.throws(()=>decrypt(bundle,'invalid-test-password'));
const tampered={...bundle,ciphertext:Buffer.from('invalid').toString('base64')};assert.throws(()=>decrypt(tampered,password));
assert(!html.includes('dataflow-oss'));assert(!html.includes(password));assert(!source.includes(password));
assert(!html.includes('id="daily"'));assert(!html.includes('id="diaryCalendar"'));
const runtime=fs.readFileSync(new URL('./unlock.js',import.meta.url),'utf8');
function harness(saved,remember=true){
 let submit,written='',reloaded=false;const storage=new Map(saved?[['opendcai-crypto-key-v1',saved]]:[]);
 const elements={encryptedPayload:{textContent:JSON.stringify(bundle)},unlockForm:{addEventListener:(n,f)=>submit=f,querySelector:()=>({disabled:false})},unlockPassword:{value:'',focus(){}},unlockError:{textContent:''},rememberUnlock:{checked:remember},unlockStatusText:{},relockContent:{}};
 const context={crypto:webcrypto,TextEncoder,Uint8Array,Blob,DecompressionStream,Response,atob,btoa,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:id=>elements[id],createElement:()=>({style:{},contentDocument:{getElementById:id=>elements[id]},contentWindow:{scrollTo(){}}}),body:{style:{},replaceChildren(frame){written=frame.srcdoc;frame.onload();}}},window:{scrollY:0,scrollTo(){}},location:{reload:()=>reloaded=true}};
 vm.runInNewContext(runtime,context);
 return {elements,storage,submit:()=>submit({preventDefault(){}}),get written(){return written},get reloaded(){return reloaded}};
}
let h=harness();h.elements.unlockPassword.value='wrong';await h.submit();assert.equal(h.written,'');assert(h.elements.unlockError.textContent.includes('口令不正确'));
for(const remember of [true,false]){
 h=harness(null,remember);h.elements.unlockPassword.value=password;await h.submit();assert.equal(h.written,source);
 const stored=h.storage.get('opendcai-crypto-key-v1');assert.equal(Boolean(stored),remember);
 if(stored){assert(!stored.includes(password));assert.equal(Buffer.from(JSON.parse(stored).key,'base64').length,32);const restored=harness(stored);for(let i=0;i<100&&!restored.written;i++)await new Promise(r=>setTimeout(r,10));assert.equal(restored.written,source);}
 h.elements.relockContent.onclick();assert.equal(h.storage.size,0);assert(h.reloaded);
}
console.log('PASS: AES-GCM authentication, tampering, exact original restoration, wrong password, remembered key, nonremembered unlock, relock, plaintext scan');

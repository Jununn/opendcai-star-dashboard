(function(){
 'use strict';
 const bundle=JSON.parse(document.getElementById('encryptedPayload').textContent);
 const storageKey='opendcai-crypto-key-v1';
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
 const form=document.getElementById('unlockForm'),input=document.getElementById('unlockPassword'),error=document.getElementById('unlockError');
 const remember=document.getElementById('rememberUnlock');
 try{localStorage.removeItem('opendcai-dashboard-unlocked-v1');}catch(e){}
 async function restore(raw,save){
  const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
  const compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(bundle.iv),additionalData:new TextEncoder().encode('opendcai-dashboard:v1')},key,decode(bundle.ciphertext));
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const html=await new Response(stream).text();
  let remembered=false;
  try{if(save){localStorage.setItem(storageKey,JSON.stringify({salt:bundle.salt,key:encode(raw)}));remembered=true;}else localStorage.removeItem(storageKey);}catch(e){}
  const position=window.scrollY;
  document.open();document.write(html);document.close();
  document.getElementById('unlockStatusText').textContent=remembered?'已解锁 · 此浏览器已记住':'已解锁 · 仅当前页面';
  document.getElementById('relockContent').onclick=()=>{try{localStorage.removeItem(storageKey);}catch(e){}location.reload();};
  window.scrollTo(0,position);
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;error.textContent='正在解密…';
  try{
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(input.value),'PBKDF2',false,['deriveBits']);input.value='';
   const raw=await crypto.subtle.deriveBits({name:'PBKDF2',salt:decode(bundle.salt),iterations:bundle.iterations,hash:'SHA-256'},material,256);
   await restore(raw,remember.checked);
  }catch(e){error.textContent='口令不正确，或加密内容无法验证，请重试。';input.focus();}finally{button.disabled=false;}
 });
 (async()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&saved.salt===bundle.salt)await restore(decode(saved.key),true);}catch(e){try{localStorage.removeItem(storageKey);}catch(e){}error.textContent='已保存的解锁状态失效，请重新输入口令。';}})();
})();

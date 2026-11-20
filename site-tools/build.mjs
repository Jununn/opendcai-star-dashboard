import fs from 'node:fs';
import {encrypt,decrypt} from './crypto.mjs';
export function build(source,password,previous){
 if(!password)throw Error('DASHBOARD_PASSWORD is required');
 const bundle=encrypt(source,password,previous?.salt);
 if(decrypt(bundle,password)!==source)throw Error('Encryption round trip failed');
 let publicHtml=source;
 const start=source.indexOf('<div id="protectedContent">'),end=source.indexOf('</main>',start);
 if(start<0||end<0)throw Error('Protected boundary missing');
 const gate='<section id="contentGate" class="panel"><h2>解锁详细看板</h2><p class="gate-note">输入口令后，查看运营动作与新增 Star 对照及后续所有内容。</p><form id="unlockForm" class="gate-form"><input id="unlockPassword" type="password" aria-label="解锁口令" placeholder="请输入口令" autocomplete="off" required><button type="submit">解锁内容</button><label class="gate-remember"><input id="rememberUnlock" type="checkbox" checked>在此浏览器记住解锁状态</label></form><p id="unlockError" class="gate-error" role="alert"></p></section>';
 publicHtml=source.slice(0,start)+gate+source.slice(source.indexOf('</main>'));
 publicHtml=publicHtml.replace(/const diaryActions=\[[\s\S]*?\];/,'const diaryActions=[];');
 publicHtml=publicHtml.replace('const $=id=>document.getElementById(id)||internalControls[id];','const $=id=>document.getElementById(id)||(internalControls[id]??={});');
 publicHtml=publicHtml.replace(/function renderDiary\(\)\{[\s\S]*?\n\$\('diaryPrev'\)/,"function renderDiary(){}\n$('diaryPrev')");
 const runtime=fs.readFileSync(new URL('./unlock.js',import.meta.url),'utf8');
 publicHtml=publicHtml.replace('</html>','<script id="encryptedPayload" type="application/json">'+JSON.stringify(bundle)+'</script><script>'+runtime+'</script></html>');
 if(publicHtml.includes(password)||publicHtml.includes('dataflow-oss')||publicHtml.includes('id="daily"')||publicHtml.includes('id="protectedContent"'))throw Error('Protected plaintext found in public output');
 for(const match of publicHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(match[0].includes('application/json'))continue;new Function(match[1]);}
 return {html:publicHtml,bundle};
}
if(process.argv[1]===new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')||process.argv[1]?.endsWith('build.mjs')){
 const source=fs.readFileSync(process.argv[2],'utf8');const target=process.argv[3]||'outputs';fs.mkdirSync(target,{recursive:true});
 const previous=fs.existsSync(target+'/protected.enc.json')?JSON.parse(fs.readFileSync(target+'/protected.enc.json','utf8')):undefined;
 const result=build(source,process.env.DASHBOARD_PASSWORD,previous);
 fs.writeFileSync(target+'/protected.enc.json',JSON.stringify(result.bundle));fs.writeFileSync(target+'/index.html',result.html);
}

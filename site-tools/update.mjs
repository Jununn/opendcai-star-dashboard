import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {decrypt} from './crypto.mjs';
import {build} from './build.mjs';
const password=process.env.DASHBOARD_PASSWORD;if(!password)throw Error('Missing password secret');
const bundle=JSON.parse(fs.readFileSync('protected.enc.json','utf8'));
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-private-'));
try{
 fs.writeFileSync(path.join(directory,'index.html'),decrypt(bundle,password),{mode:0o600});
 const refresh=spawnSync('python',[path.resolve('site-tools/refresh.py')],{cwd:directory,env:process.env,stdio:'inherit'});
 if(refresh.status!==0)throw Error('Refresh failed; refusing publication');
 const source=fs.readFileSync(path.join(directory,'index.html'),'utf8'),result=build(source,password,bundle);
 fs.writeFileSync('index.html',result.html);fs.writeFileSync('protected.enc.json',JSON.stringify(result.bundle));
}finally{fs.rmSync(directory,{recursive:true,force:true});}

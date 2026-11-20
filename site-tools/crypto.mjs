import {pbkdf2Sync,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
export const iterations=600000;
export function derive(password,salt){return pbkdf2Sync(password,Buffer.from(salt,'base64'),iterations,32,'sha256')}
export function encrypt(source,password,salt=randomBytes(16).toString('base64')){
 const iv=randomBytes(12),key=derive(password,salt),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from('opendcai-dashboard:v1'));
 const bytes=Buffer.concat([cipher.update(gzipSync(Buffer.from(source))),cipher.final(),cipher.getAuthTag()]);
 return {version:1,kdf:'PBKDF2-SHA256',iterations,salt,iv:iv.toString('base64'),ciphertext:bytes.toString('base64')};
}
export function decrypt(bundle,password){
 if(bundle.version!==1||bundle.iterations!==iterations)throw Error('Unsupported encrypted format');
 const bytes=Buffer.from(bundle.ciphertext,'base64'),decipher=createDecipheriv('aes-256-gcm',derive(password,bundle.salt),Buffer.from(bundle.iv,'base64'));
 decipher.setAAD(Buffer.from('opendcai-dashboard:v1'));decipher.setAuthTag(bytes.subarray(-16));
 return gunzipSync(Buffer.concat([decipher.update(bytes.subarray(0,-16)),decipher.final()])).toString('utf8');
}

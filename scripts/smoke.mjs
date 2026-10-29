import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','TEAM_EMAILS'])delete env[key];
const server=spawn(process.execPath,[fileURLToPath(import.meta.resolve('next/dist/bin/next')),'start','--hostname','127.0.0.1','--port','3187'],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
try{
let ready=false;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:3187/login',{signal:AbortSignal.timeout(1000)});if(r.status===200){assert.match(await r.text(),/Sign in to lunch/);ready=true;break;}}catch{}await delay(250);}
assert.ok(ready,'Production server did not respond: '+logs);
const home=await fetch('http://127.0.0.1:3187/');assert.equal(home.status,200);assert.match(await home.text(),/Midea/);
const api=await fetch('http://127.0.0.1:3187/api/pools');assert.equal(api.status,503);assert.match((await api.json()).error,/Setup is required/);
const csrf=await fetch('http://127.0.0.1:3187/api/auth/login',{method:'POST',headers:{origin:'https://evil.test','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
console.log('PASS: built homepage, sign-in page, missing-settings response, cross-origin login rejection.');
}finally{server.kill();}


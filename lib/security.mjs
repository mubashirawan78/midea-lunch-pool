export class HttpError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function safeReturnTo(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '/';
 try{const url=new URL(value,'https://local.test');return url.origin==='https://local.test'?url.pathname+url.search:'/';}catch{return '/';}
}
export function allowedEmail(email,list){return typeof email==='string'&&String(list||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());}
export function assertSameOrigin(req){if(req.headers.get('origin')!==new URL(req.url).origin)throw new HttpError('Invalid request origin.',403);}
export async function readJson(req){const body=await req.text();if(body.length>100000)throw new HttpError('Request too large.',413);try{return JSON.parse(body);}catch{throw new HttpError('Invalid request body.');}}
export function failure(e){if(e instanceof HttpError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});console.error('Request failed:',e instanceof Error?e.message:'Unknown error');return Response.json({error:'The service could not complete this request. Check the server configuration and try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}

import {change} from '../app/domain.mjs';
import {HttpError,assertSameOrigin,readJson,failure} from './security.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createPoolApi({authenticate,repository}){
 return {
 async GET(req){try{const user=await authenticate();const id=new URL(req.url).searchParams.get('id');if(id&&!uuid.test(id))throw new HttpError('Invalid invitation link.');const rows=id?await repository.find(id):await repository.list(user.id);return reply({user,pools:rows.map(r=>({...r.data,revision:r.revision})).sort((a,b)=>b.created.localeCompare(a.created))});}catch(e){return failure(e);}},
 async POST(req){try{
 assertSameOrigin(req);const user=await authenticate();const input=await readJson(req);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError('Invalid request body.');
 if(input.action==='create'){
 if(!String(input.restaurant||'').trim())throw new HttpError('Enter a restaurant name.');
 const deadline=String(input.deadline);if(!Number.isFinite(Date.parse(deadline))||Date.parse(deadline)<=Date.now())throw new HttpError('Choose a future joining deadline.');
 const p={id:crypto.randomUUID(),owner:user.id,organizer:user.name,restaurant:String(input.restaurant).trim().slice(0,100),created:new Date().toISOString(),deadline,status:'open',members:[],items:[],fee:'0',discount:'0',total:'0',mode:'items',instructions:'',shares:[]};
 await repository.insert(p);return reply({pool:{...p,revision:0}});
 }
 if(!uuid.test(String(input.id)))throw new HttpError('Invalid pool.');
 const [row]=await repository.find(input.id);if(!row)throw new HttpError('Pool not found.',404);
 if(row.revision!==input.revision)throw new HttpError('This pool changed. Refresh and try again.',409);
 let p;try{p=change(row.data,input.action,input,user);}catch(e){throw new HttpError(e instanceof Error?e.message:'Invalid action.');}
 if(!await repository.update(p,row.revision))throw new HttpError('Another update arrived. Refresh and retry.',409);
 return reply({pool:{...p,revision:row.revision+1}});
 }catch(e){return failure(e);}}
 };
}

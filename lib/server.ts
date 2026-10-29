import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {allowedEmail,HttpError} from './security.mjs';
function config(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!process.env.TEAM_EMAILS?.trim())throw new HttpError('Setup is required. Add the Supabase settings and team emails in Netlify.',503);
 return {url,key};
}
export async function authClient(){
 const {url,key}=config(),store=await cookies();
 return createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},cookies:{getAll(){return store.getAll();},setAll(values){for(const {name,value,options} of values)store.set(name,value,options);}}});
}
export async function authenticate(){
 const client=await authClient();const {data,error}=await client.auth.getUser();
 if(error||!data.user)throw new HttpError('Please sign in.',401);
 if(!allowedEmail(data.user.email,process.env.TEAM_EMAILS))throw new HttpError('This account is not on the Midea team access list.',403);
 return {id:data.user.id,name:String(data.user.user_metadata?.full_name||data.user.email?.split('@')[0]||'Team member').slice(0,80)};
}
function database(){const {url}=config();const key=process.env.SUPABASE_SECRET_KEY;if(!key)throw new HttpError('Database setup is required. Add SUPABASE_SECRET_KEY in Netlify.',503);return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
function check(error:unknown){if(error){console.error('Database operation failed',error);throw new HttpError('Unable to access lunch data. Check the Supabase setup and try again.',503);}}
export const repository={
 async find(id:string){const {data,error}=await database().from('lunch_pools').select('data,revision').eq('id',id);check(error);return data||[];},
 async list(userId:string){const {data,error}=await database().from('lunch_pools').select('data,revision').or(`owner.eq.${userId},member_ids.cs.{${userId}}`);check(error);return data||[];},
 async insert(p:any){const {error}=await database().from('lunch_pools').insert({id:p.id,owner:p.owner,member_ids:[],data:p,revision:0});check(error);},
 async update(p:any,revision:number){const {data,error}=await database().from('lunch_pools').update({data:p,member_ids:p.members.map((m:any)=>m.id),revision:revision+1}).eq('id',p.id).eq('revision',revision).select('id');check(error);return !!data?.length;}
};

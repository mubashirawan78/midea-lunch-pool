import {authClient} from '../../../../lib/server';
import {allowedEmail,assertSameOrigin,readJson,failure,HttpError,safeReturnTo} from '../../../../lib/security.mjs';
export const runtime='nodejs';
export async function POST(req:Request){try{
 assertSameOrigin(req);const input=await readJson(req);const client=await authClient();
 if(!input||typeof input.email!=='string'||typeof input.password!=='string'||input.password.length>1024)throw new HttpError('Enter your email and password.');
 const email=input.email.trim().toLowerCase();
 if(!allowedEmail(email,process.env.TEAM_EMAILS))throw new HttpError('Unable to sign in. Check your credentials or contact the organizer.',401);
 const {data,error}=await client.auth.signInWithPassword({email,password:input.password});
 if(error||!data.user)throw new HttpError('Unable to sign in. Check your credentials or contact the organizer.',401);
 return Response.json({returnTo:safeReturnTo(input.returnTo)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}}

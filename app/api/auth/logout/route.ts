import {authClient} from '../../../../lib/server';
import {assertSameOrigin,failure} from '../../../../lib/security.mjs';
export async function POST(req:Request){try{assertSameOrigin(req);const client=await authClient();const {error}=await client.auth.signOut();if(error)throw error;return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}

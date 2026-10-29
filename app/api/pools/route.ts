import {createPoolApi} from '../../../lib/pool-api.mjs';
import {authenticate,repository} from '../../../lib/server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const api=createPoolApi({authenticate,repository});
export const GET=api.GET;
export const POST=api.POST;

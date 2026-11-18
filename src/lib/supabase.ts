import {createClient,type SupabaseClient} from '@supabase/supabase-js';
type Json=string|number|boolean|null|{[key:string]:Json|undefined}|Json[];
type Row={id:string;owner_id:string;title:string;data:Json;updated_at:string};
type Database={public:{Tables:{trips:{Row:Row;Insert:Row;Update:Partial<Row>;Relationships:[]}};Views:Record<string,never>;Functions:Record<string,never>}};
let client:SupabaseClient<Database>|null=null;
export function getSupabase(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;return client??=createClient<Database>(url,key)}

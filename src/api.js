import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim(),key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configured=Boolean(url&&key&&import.meta.env.VITE_API_URL);
export const supabase=url&&key?createClient(url,key):null;
export async function api(path,options={}){
 if(!configured)throw new Error('Configura las tres variables VITE_* en Render y vuelve a compilar.');
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Inicia sesión para continuar.');
 const response=await fetch(import.meta.env.VITE_API_URL.replace(/\/$/,'')+'/api/admin'+path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`}});
 const result=await response.json();if(!response.ok){const error=new Error(result.error||'No se pudo completar la operación.');error.status=response.status;throw error;}return result;
}

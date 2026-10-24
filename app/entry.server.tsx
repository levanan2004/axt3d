import { renderToReadableStream } from 'react-dom/server';
import { ServerRouter,type EntryContext } from 'react-router';
export default async function handleRequest(request:Request,status:number,headers:Headers,context:EntryContext) {
 const body=await renderToReadableStream(<ServerRouter context={context} url={request.url}/>,{signal:request.signal,onError(error){console.error('SSR failed',error instanceof Error?error.message:'unknown');status=500;}});
 await body.allReady;
 const html=await new Response(body).text();
 headers.set('Content-Type','text/html; charset=utf-8');
 return new Response(import.meta.env.PROD?html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/g,''):html,{status,headers});
}

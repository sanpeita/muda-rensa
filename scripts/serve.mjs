import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.argv.includes('--dist')?'dist':'.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  let path=decodeURIComponent(url.pathname); if(path==='/')path='/index.html';
  // Serve only game assets; planning/private context is never a web resource.
  if(!/^\/(index\.html|src\/[a-z0-9.-]+\.(js|css)|vendor\/three\.(?:module|core)\.js|sw\.js|manifest\.webmanifest|icons\/[a-z0-9.-]+\.svg)$/.test(path)){res.writeHead(404);res.end('Not found');return;}
  let file=resolve(root,'.'+path);
  if(!process.argv.includes('--dist')&&path.startsWith('/vendor/'))file=resolve(root,'node_modules/three/build',path.split('/').at(-1));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>process.stdout.write('Muda Rensa: http://localhost:4173\n'));

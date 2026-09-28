const http=require('http'),fs=require('fs'),path=require('path');
const dir=__dirname;
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';
 const f=path.join(dir,path.normalize(p));if(!f.startsWith(dir)){r.writeHead(403);return r.end();}
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('404');}
 const t={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript'}[path.extname(f)]||'application/octet-stream';
 r.writeHead(200,{'Content-Type':t,'Cache-Control':'no-store'});r.end(d);});}).listen(4330,()=>console.log('ok 4330'));

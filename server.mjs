import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/domain.js':'domain.js','/cloud-store.js':'cloud-store.js','/cloud-auth.js':'cloud-auth.js','/firebase-config.js':'firebase-config.js','/CLOUD_SETUP.md':'CLOUD_SETUP.md','/assets/kiru-icon.svg':'assets/kiru-icon.svg','/assets/tokens.css':'assets/tokens.css'};
const types={md:'text/plain; charset=utf-8',svg:'image/svg+xml',html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);return res.end('No encontrado');}try{const data=await readFile(fileURLToPath(new URL(file,import.meta.url)));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(500);res.end('Error al leer la aplicación');}}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Facturación iniciada en puerto '+(process.env.PORT||3000)));

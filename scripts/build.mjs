import {mkdir,copyFile,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
const html=(await readFile('index.html','utf8')).replace('<!-- offline-build: inserted only in the release build -->','<meta name="offline-build" content="1"><link rel="manifest" href="/manifest.webmanifest">');
await writeFile('dist/index.html',html);
await cp('src','dist/src',{recursive:true});
await cp('public','dist',{recursive:true});
for(const file of ['three.module.js','three.core.js'])await copyFile('node_modules/three/build/'+file,'dist/vendor/'+file);
await copyFile('node_modules/three/LICENSE','dist/vendor/THREE-LICENSE.txt');
process.stdout.write('Built self-contained dist/ (no runtime CDN).\n');

import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await copyFile('index.html','dist/index.html');
await cp('src','dist/src',{recursive:true});
for(const file of ['three.module.js','three.core.js'])await copyFile('node_modules/three/build/'+file,'dist/vendor/'+file);
await copyFile('node_modules/three/LICENSE','dist/vendor/THREE-LICENSE.txt');
process.stdout.write('Built self-contained dist/ (no runtime CDN).\n');

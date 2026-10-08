const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const versions=JSON.parse(fs.readFileSync(path.join(root,'js/surum.js'),'utf8').match(/\/\*SURUMLER\*\/([\s\S]*?)\/\*SURUMLER\*\//)[1]);
const version=versions[0].surum;
const htmlPath=path.join(root,'index.html');
let html=fs.readFileSync(htmlPath,'utf8').replace(/((?:src|href)="(?:js\/[^"?]+\.js|css\/[^"?]+\.css))(?:\?v=[^"]+)?"/g, '$1?v='+version+'"');
html=html.replace(/<html\b([^>]*?)(?:\s+data-surum="[^"]*")?>/, `<html$1 data-surum="${version}">`); // açılış koruması kendi sürümünü bilsin
fs.writeFileSync(htmlPath,html);
// Bozuk ya da yarım bir dosya yayın listesine asla girmesin: bütünlük testi geçmezse release-manifest.json yazılmaz.
// Liste eski kalınca servis çalışanı bu dosyaları kurmaz (özet tutmaz), telefondaki Luna çalışan sürümde kalır.
const check=require('node:child_process').spawnSync(process.execPath,[path.join(root,'tests/release-integrity.test.cjs')],{stdio:'inherit'});
if(check.status!==0){console.error('Release '+version+' NOT built: release-manifest.json was left unchanged. Fix the problems above, then run this again.');process.exit(1);}
const files=['index.html','manifest.webmanifest','css/style.css',...fs.readdirSync(path.join(root,'js')).filter(x=>x.endsWith('.js')).map(x=>'js/'+x),'assets/meows/cat-voice.mp3','assets/meows/kitten.mp3','assets/meows/cat-meow.mp3'];
const manifest={version,files:Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]))};
fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Release '+version+': '+files.length+' code and recorded audio files checked and hashed');

// Lightweight Pterodactyl-friendly supervisor. Restarts the bot after crashes with backoff.
const fs=require('fs'); const path=require('path'); const {spawn}=require('child_process');
const root=__dirname; process.chdir(root); let failures=0,child,stopping=false;
if(!fs.existsSync(path.join(root,'src','index.js'))){console.error('[HABIBI supervisor] src/index.js missing - extract the project ZIP first');process.exit(1)}
function start(){const delay=failures===0?0:Math.min(30000,Math.max(3000,failures*3000));setTimeout(()=>{if(stopping)return;console.log('[HABIBI supervisor] starting src/index.js (attempt '+(failures+1)+')');child=spawn(process.execPath,[path.join(root,'src','index.js')],{stdio:'inherit',env:process.env,cwd:root});child.on('exit',(code,signal)=>{if(stopping)return;failures=code===0?0:failures+1;const wait=Math.min(30,Math.max(3,failures*3));console.error(`[HABIBI supervisor] child exited code=${code} signal=${signal||'-'}; restarting in ${wait}s`);if(failures>=15){console.error('[HABIBI supervisor] too many failures - exiting');process.exit(1)}start()});child.on('error',err=>{console.error('[HABIBI supervisor] spawn error:',err.message);failures++;start()})},delay)}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;if(child)try{child.kill(sig)}catch{}process.exit(0)});
start();

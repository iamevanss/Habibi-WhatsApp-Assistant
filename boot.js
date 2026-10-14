// boot.js - crash-resistant entry for Pterodactyl / Malv panels.
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const root = __dirname;
process.chdir(root);
function log(...args) { console.log('[HABIBI boot]', ...args); }
function fail(msg, code = 1) { console.error('[HABIBI boot] FATAL:', msg); process.exit(code); }
log('cwd =', process.cwd()); log('node =', process.version); log('platform =', process.platform, process.arch);
const required = ['package.json','src/index.js','src/config.js','src/logger.js','src/whatsapp/connection.js','src/whatsapp/sender.js','src/ai/client.js','src/ai/tools.js','src/core/router.js','supervisor.js'];
const missing = required.filter(f => !fs.existsSync(path.join(root, f)));
if (missing.length) { log('Missing files:', missing.join(', ')); log('Top-level contents:', fs.readdirSync(root).join(', ')); fail('Project files are incomplete. Re-upload the project ZIP and extract it into /home/container.'); }
const nodeModules = path.join(root, 'node_modules');
const baileysOk = fs.existsSync(path.join(nodeModules, '@pasqua-baileys', 'baileys'));
if (!baileysOk) { log('node_modules incomplete - running npm install (PUPPETEER_SKIP_DOWNLOAD=true)…'); try { execSync('npm install', {cwd:root,stdio:'inherit',env:{...process.env,PUPPETEER_SKIP_DOWNLOAD:'true',npm_config_fund:'false',npm_config_audit:'false'},timeout:600000}); } catch(e) { fail('npm install failed: '+(e.message||e)); } }
const entry = fs.existsSync(path.join(root,'supervisor.js')) ? path.join(root,'supervisor.js') : path.join(root,'src','index.js');
log('Starting',path.relative(root,entry));
const child = spawn(process.execPath,[entry],{cwd:root,stdio:'inherit',env:process.env});
child.on('error',err=>{console.error('[HABIBI boot] spawn error:',err.message);process.exit(1);});
child.on('exit',(code,signal)=>{console.error('[HABIBI boot] process exited code='+code+' signal='+(signal||'-'));process.exit(code&&code>0&&code<128?code:1);});
for(const sig of ['SIGINT','SIGTERM']) process.on(sig,()=>{try{child.kill(sig)}catch{}});

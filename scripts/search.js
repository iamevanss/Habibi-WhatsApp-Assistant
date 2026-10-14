#!/usr/bin/env node
// Node-only web search CLI. Usage: node scripts/search.js "latest Nigeria news"
const web=require('../src/features/websearch2');(async()=>{const query=process.argv.slice(2).join(' ').trim();if(!query){console.error('Usage: node scripts/search.js "your search query"');process.exit(1)}try{console.log(JSON.stringify({ok:true,query,results:await web.browse(query,5)},null,2))}catch(error){console.error(JSON.stringify({ok:false,error:error.message},null,2));process.exit(1)}})();

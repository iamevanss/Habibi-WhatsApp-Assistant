// Shared promisified child_process helpers.
const {execFile,exec}=require('child_process');const {promisify}=require('util');const execFileP=promisify(execFile);const execP=promisify(exec);module.exports={execFileP,execP};

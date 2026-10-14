// features/cryptoZip.js — password-protect zip archives + AES file encrypt/decrypt
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);
const logger = require('../logger');

const TMP = path.join(os.tmpdir(), 'broken-crypt');
fs.mkdirSync(TMP, { recursive: true });

function randomName(ext) {
  return path.join(TMP, `c_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

/** AES-256-GCM encrypt a buffer → binary blob (header + iv + tag + data) */
function encryptBuffer(buf, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  // magic BRKN1 | salt | iv | tag | ciphertext
  return Buffer.concat([Buffer.from('BRKN1'), salt, iv, tag, enc]);
}

function decryptBuffer(blob, password) {
  if (!Buffer.isBuffer(blob) || blob.length < 5 + 16 + 12 + 16) throw new Error('Invalid encrypted file');
  if (blob.slice(0, 5).toString() !== 'BRKN1') throw new Error('Not a Habibi encrypted file (missing BRKN1 header)');
  const salt = blob.slice(5, 21);
  const iv = blob.slice(21, 33);
  const tag = blob.slice(33, 49);
  const data = blob.slice(49);
  const key = crypto.scryptSync(String(password), salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Create a password-protected ZIP using system `zip -P` when available,
 * otherwise AES-encrypt the whole zip bytes into a .brkn package.
 */
async function zipWithPassword(files, password, outName = 'protected.zip') {
  // files: [{ name, buffer }]
  const work = fs.mkdtempSync(path.join(TMP, 'z_'));
  try {
    for (const f of files) {
      const dest = path.join(work, path.basename(f.name || 'file.bin'));
      fs.writeFileSync(dest, f.buffer);
    }
    const outZip = path.join(work, outName.endsWith('.zip') ? outName : `${outName}.zip`);
    try {
      // zip -r -P password out.zip .
      await execFileP('zip', ['-r', '-P', String(password), outZip, '.'], { cwd: work, timeout: 120000 });
      if (fs.existsSync(outZip) && fs.statSync(outZip).size > 0) {
        return { buffer: fs.readFileSync(outZip), fileName: path.basename(outZip), method: 'zip-password' };
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'system zip -P unavailable, using AES package');
    }
    // Fallback: plain zip via adm-zip then AES-wrap
    const AdmZip = require('adm-zip');
    const z = new AdmZip();
    for (const f of files) z.addFile(path.basename(f.name || 'file.bin'), f.buffer);
    const plain = z.toBuffer();
    const locked = encryptBuffer(plain, password);
    return { buffer: locked, fileName: (outName.replace(/\.zip$/i, '') || 'protected') + '.brkn', method: 'aes-brkn' };
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

/** Unlock password zip or .brkn package */
async function unlockWithPassword(buffer, password, originalName = 'archive.zip') {
  const name = String(originalName || '');
  // .brkn AES package
  if (name.endsWith('.brkn') || (buffer.slice(0, 5).toString() === 'BRKN1')) {
    const plain = decryptBuffer(buffer, password);
    return { buffer: plain, fileName: name.replace(/\.brkn$/i, '') || 'decrypted.zip', method: 'aes-brkn' };
  }
  // Try system unzip
  const work = fs.mkdtempSync(path.join(TMP, 'u_'));
  const inFile = path.join(work, 'in.zip');
  fs.writeFileSync(inFile, buffer);
  const outDir = path.join(work, 'out');
  fs.mkdirSync(outDir);
  try {
    await execFileP('unzip', ['-P', String(password), '-o', inFile, '-d', outDir], { timeout: 120000 });
    const AdmZip = require('adm-zip');
    const z = new AdmZip();
    const walk = (dir, base = '') => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        const rel = path.join(base, ent.name);
        if (ent.isDirectory()) walk(p, rel);
        else z.addFile(rel, fs.readFileSync(p));
      }
    };
    walk(outDir);
    const outBuf = z.toBuffer();
    return { buffer: outBuf, fileName: 'unlocked.zip', method: 'unzip-password' };
  } catch (e) {
    // try 7z
    try {
      await execFileP('7z', ['x', `-p${password}`, `-o${outDir}`, '-y', inFile], { timeout: 120000 });
      const AdmZip = require('adm-zip');
      const z = new AdmZip();
      const walk = (dir, base = '') => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, ent.name);
          const rel = path.join(base, ent.name);
          if (ent.isDirectory()) walk(p, rel);
          else z.addFile(rel, fs.readFileSync(p));
        }
      };
      walk(outDir);
      return { buffer: z.toBuffer(), fileName: 'unlocked.zip', method: '7z-password' };
    } catch (e2) {
      throw new Error(`Could not unlock archive (wrong password or zip/unzip/7z missing): ${e.message}`);
    }
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

/** Encrypt a single file buffer → .brkn */
function encryptFile(buffer, password, baseName = 'file') {
  const locked = encryptBuffer(buffer, password);
  return { buffer: locked, fileName: `${String(baseName).replace(/\.[^.]+$/, '') || 'file'}.brkn`, method: 'aes-brkn' };
}

/** Decrypt .brkn file */
function decryptFile(buffer, password, outName = 'decrypted.bin') {
  const plain = decryptBuffer(buffer, password);
  return { buffer: plain, fileName: outName, method: 'aes-brkn' };
}

module.exports = {
  encryptBuffer,
  decryptBuffer,
  zipWithPassword,
  unlockWithPassword,
  encryptFile,
  decryptFile,
};

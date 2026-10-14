'use strict';
// Small task registry for coordinating independent agent jobs.
const jobs = new Map();
function create({ id, task, owner = null, metadata = {} } = {}) {
  if (!task || !String(task).trim()) throw new Error('A task description is required.');
  const jobId = String(id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  if (jobs.has(jobId)) throw new Error(`Job already exists: ${jobId}`);
  const job = { id: jobId, task: String(task).trim(), owner, metadata, status: 'queued', createdAt: Date.now(), updatedAt: Date.now(), result: null, error: null };
  jobs.set(jobId, job); return { ...job };
}
function get(id) { const job = jobs.get(String(id)); return job ? { ...job } : null; }
function list({ status, owner } = {}) { return [...jobs.values()].filter(j => (!status || j.status === status) && (owner == null || j.owner === owner)).map(j => ({ ...j })); }
function update(id, patch = {}) {
  const job = jobs.get(String(id)); if (!job) return null;
  const allowed = ['status', 'result', 'error', 'metadata'];
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch, key)) job[key] = patch[key];
  job.updatedAt = Date.now(); return { ...job };
}
function remove(id) { return jobs.delete(String(id)); }
module.exports = { create, get, list, update, remove };

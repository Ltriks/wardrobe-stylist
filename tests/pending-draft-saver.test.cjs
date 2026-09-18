const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync('app/lib/pending-draft-saver.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
new Function('exports', compiled)(loaded.exports);
const { createPendingDraftSaver } = loaded.exports;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('slow saves serialize newer typing, deletion and other fields before confirmation flush completes', async () => {
  const first = deferred();
  const calls = [];
  const saver = createPendingDraftSaver(async (id, patch) => {
    calls.push([id, patch]);
    if (calls.length === 1) await first.promise;
  }, assert.fail, () => {}, 60000);
  try {
    saver.edit('a', { suggestedName: '旧名字' });
    const flushed = saver.flush();
    saver.edit('a', { suggestedName: '新名字', notes: '棉质' });
    saver.edit('a', { suggestedName: '', size: '90' });
    assert.equal(calls.length, 1);
    assert.equal(saver.flush(), flushed);
    first.resolve();
    await flushed;
    assert.deepEqual(calls[1], ['a', { suggestedName: '', notes: '棉质', size: '90' }]);
    assert.equal(saver.hasUnsaved(), false);
  } finally { saver.dispose(); }
});

test('IME composition pauses its draft while other cards save, then saves the committed Chinese text', async () => {
  const calls = [];
  const saver = createPendingDraftSaver(async (id, patch) => calls.push([id, patch]), assert.fail, () => {}, 60000);
  try {
    saver.composition('a', true);
    saver.edit('a', { suggestedName: 'yifu' });
    saver.edit('b', { notes: '其他衣物' });
    await saver.flush();
    assert.deepEqual(calls, [['b', { notes: '其他衣物' }]]);
    assert.equal(saver.isComposing(), true);
    saver.edit('a', { suggestedName: '衣服' });
    saver.composition('a', false);
    await saver.flush();
    assert.deepEqual(calls[1], ['a', { suggestedName: '衣服' }]);
    assert.equal(saver.hasUnsaved(), false);
  } finally { saver.dispose(); }
});

test('failed requests retain drafts without overwriting edits made while saving', async () => {
  const first = deferred();
  const calls = [];
  const saver = createPendingDraftSaver(async (id, patch) => {
    calls.push(patch);
    if (calls.length === 1) await first.promise;
  }, assert.fail, () => {}, 60000);
  try {
    saver.edit('a', { suggestedName: '旧值', notes: '保留备注' });
    const failed = saver.flush();
    saver.edit('a', { suggestedName: '', size: '80' });
    first.reject(new Error('offline'));
    await assert.rejects(failed, /offline/);
    assert.equal(saver.hasUnsaved(), true);
    await saver.flush();
    assert.deepEqual(calls[1], { suggestedName: '', notes: '保留备注', size: '80' });
    assert.equal(saver.hasUnsaved(), false);
  } finally { saver.dispose(); }
});

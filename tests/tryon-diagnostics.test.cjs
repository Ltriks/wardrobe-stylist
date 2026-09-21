const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(exports, name => dependencies[name] || require(name));
  return exports;
}
const diagnostics = load('lib/tryon-diagnostics.ts');

test('console errors retain useful context and redact secrets, nested causes and unknown payload fields', () => {
  const captured = [];
  const previous = console.error;
  console.error = (...args) => captured.push(args);
  try {
    const original = Object.assign(new Error('Bearer sk-fixture-key data:image/png;base64,PRIVATE_PHOTO https://images.example/a?token=hidden'), {
      cause: Object.assign(new Error('api_key=hidden-key'), { code: 'ECONNRESET' }),
      diagnostics: { httpStatus: 502, requestId: 'request-123', body: 'PRIVATE_REQUEST_BODY' },
    });
    diagnostics.logTryOnError('job-failed', diagnostics.safeTryOnError(original, {}, ['hidden-key']), { outfitId: 'outfit-123', stage: 'poll-task' });
    assert.equal(captured[0][0], '[try-on] job-failed');
    const details = captured[0][1];
    assert.equal(details.outfitId, 'outfit-123');
    assert.equal(details.httpStatus, 502);
    assert.equal(details.requestId, 'request-123');
    assert.equal(details.cause.code, 'ECONNRESET');
    assert.match(details.stack, /Error:/);
    for (const secret of ['sk-fixture-key', 'PRIVATE_PHOTO', 'token=hidden', 'hidden-key', 'PRIVATE_REQUEST_BODY']) assert.equal(JSON.stringify(captured).includes(secret), false);
  } finally { console.error = previous; }
});

test('background generation logs failures even though queue submission succeeds, and catches persistence failure', async () => {
  const captured = [];
  const previous = console.error;
  console.error = (...args) => captured.push(args);
  try {
    for (const saveFails of [false, true]) {
      let finish;
      const finished = new Promise(resolve => { finish = resolve; });
      const outfit = { id: `fixture-${saveFails}`, boardImageUrl: '/uploads/board.png', pantsFit: 'natural' };
      const service = load('lib/tryon-service.ts', {
        './tryon-diagnostics': diagnostics,
        './profile-context': { currentProfileId: () => 'child' },
        '@/lib/modelstudio-image': { generateTryOnImage: async () => { throw diagnostics.safeTryOnError(new Error('fixture model failure'), { stage: 'poll-task', taskId: 'task-1' }); } },
        '@/lib/wardrobe-assets': { ensureWardrobeAssetDirs: async () => {}, resolveUploadAsset: image => ({ absolutePath: image }) },
        '@/lib/wardrobe-store': {
          getOutfitRecord: async () => outfit,
          getDefaultTemplateRecord: async () => ({ imageUrl: '/uploads/template.png' }),
          updateOutfitTryOnState: async (_, state) => {
            if (state.tryOnStatus === 'failed') {
              assert.equal(state.tryOnError, 'fixture model failure');
              finish();
              if (saveFails) throw new Error('fixture database failure');
            }
            return { ...outfit, ...state };
          },
        },
      });
      await service.queueTryOnJob(outfit.id);
      await finished;
      await new Promise(resolve => setImmediate(resolve));
      const logged = captured.find(([event, details]) => event === '[try-on] job-failed' && details.outfitId === outfit.id);
      assert.equal(logged[1].stage, 'poll-task');
      assert.equal(logged[1].taskId, 'task-1');
      assert.equal(logged[1].profileId, 'child');
      if (saveFails) assert.ok(captured.some(([event]) => event === '[try-on] failure-state-save-failed'));
    }
  } finally { console.error = previous; }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, readFile, rm, stat, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

test('AI settings persist privately and control the next try-on request', async (t) => {
  const root = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'wardrobe-settings-test-'));
  const originalFetch = global.fetch;
  const keys = ['DASHSCOPE_API_KEY', 'MODEL_STUDIO_API_KEY', 'DASHSCOPE_IMAGE_MODEL', 'DASHSCOPE_IMAGE_BASE_URL'];
  const environment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    execFileSync(process.execPath, [
      join(root, 'node_modules/typescript/bin/tsc'),
      'lib/ai-settings.ts', 'lib/modelstudio-image.ts', '--outDir', join(directory, 'compiled'),
      '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck', '--esModuleInterop',
    ], { cwd: root, stdio: 'pipe' });
    process.chdir(directory);
    process.env.DASHSCOPE_API_KEY = 'test-environment-key';
    process.env.DASHSCOPE_IMAGE_MODEL = 'environment-model';
    process.env.DASHSCOPE_IMAGE_BASE_URL = 'https://environment.example/generation';
    const settings = require(join(directory, 'compiled/ai-settings.js'));
    const { generateTryOnImage } = require(join(directory, 'compiled/modelstudio-image.js'));

    await t.test('environment fallback is redacted', async () => {
      const result = await settings.readPublicAiSettings();
      assert.equal(result.model, 'environment-model');
      assert.equal(result.hasApiKey, true);
      assert.equal(result.keySource, 'environment');
      assert.equal(result.hasSavedSettings, false);
      assert.equal('apiKey' in result, false);
      assert.equal(JSON.stringify(result).includes('test-environment-key'), false);
    });

    await t.test('invalid endpoints and malformed settings cannot be saved', async () => {
      for (const baseUrl of ['http://example.com', 'https://user:secret@example.com', 'https://example.com?key=secret', 'not-a-url']) {
        await assert.rejects(settings.saveAiSettings({ model: 'model', baseUrl }), settings.SettingsValidationError);
      }
      await assert.rejects(settings.saveAiSettings({ model: ' ', baseUrl: 'https://example.com' }), settings.SettingsValidationError);
      await assert.rejects(settings.saveAiSettings({ model: 'model', baseUrl: 'https://example.com', apiKey: 'bad\nkey' }), settings.SettingsValidationError);
    });

    await t.test('blank keys preserve fallback and saved keys; values persist to disk', async () => {
      await settings.saveAiSettings({ model: 'first-model', baseUrl: 'https://first.example/generation', apiKey: '' });
      assert.equal((await settings.readAiSettings()).apiKey, 'test-environment-key');
      await settings.saveAiSettings({ model: 'second-model', baseUrl: 'https://second.example/generation', apiKey: 'test-page-key' });
      const result = await settings.saveAiSettings({ model: 'latest-model', baseUrl: 'https://second.example/generation', apiKey: '' });
      assert.equal((await settings.readAiSettings()).apiKey, 'test-page-key');
      assert.equal(result.keySource, 'page');
      assert.equal('apiKey' in result, false);
      assert.equal(JSON.stringify(result).includes('test-page-key'), false);
      const file = join(directory, 'data/ai-settings.json');
      assert.equal(JSON.parse(await readFile(file, 'utf8')).model, 'latest-model');
      if (process.platform !== 'win32') assert.equal((await stat(file)).mode & 0o777, 0o600);
      delete require.cache[require.resolve(join(directory, 'compiled/ai-settings.js'))];
      assert.equal((await require(join(directory, 'compiled/ai-settings.js')).readAiSettings()).apiKey, 'test-page-key');
    });

    await t.test('generation uses saved key, endpoint and model without a restart', async () => {
      const templateImagePath = join(directory, 'template.png');
      const boardImagePath = join(directory, 'board.png');
      await writeFile(templateImagePath, 'fake-template');
      await writeFile(boardImagePath, 'fake-board');
      global.fetch = async (url, options) => {
        assert.equal(url, 'https://second.example/generation');
        assert.equal(options.headers.Authorization, 'Bearer test-page-key');
        const body = JSON.parse(options.body);
        assert.equal(body.model, 'latest-model');
        assert.equal(body.input.messages[0].content.length, 3);
        return { ok: true, json: async () => ({ output: { choices: [{ message: { content: [{ image: 'https://output.example/image.png' }] } }] } }) };
      };
      assert.equal((await generateTryOnImage({ templateImagePath, boardImagePath })).imageUrl, 'https://output.example/image.png');
    });

    await t.test('reset restores environment; missing keys and corrupt files fail clearly', async () => {
      const result = await settings.resetAiSettings();
      assert.equal(result.model, 'environment-model');
      assert.equal(result.keySource, 'environment');
      delete process.env.DASHSCOPE_API_KEY;
      delete process.env.MODEL_STUDIO_API_KEY;
      assert.equal((await settings.readPublicAiSettings()).hasApiKey, false);
      await assert.rejects(generateTryOnImage({ templateImagePath: 'missing', boardImagePath: 'missing' }), /AI 设置/);
      await mkdir(join(directory, 'data'), { recursive: true });
      await writeFile(join(directory, 'data/ai-settings.json'), 'broken');
      await assert.rejects(settings.readPublicAiSettings(), /无法读取/);
    });
  } finally {
    process.chdir(root);
    global.fetch = originalFetch;
    for (const key of keys) {
      if (environment[key] === undefined) delete process.env[key];
      else process.env[key] = environment[key];
    }
    await rm(directory, { recursive: true, force: true });
  }
});

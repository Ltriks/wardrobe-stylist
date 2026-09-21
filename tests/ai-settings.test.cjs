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

    await t.test('standard Images base and full URLs use JSON with both reference photos', async () => {
      const base = 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
      const templateImagePath = join(directory, 'template.png');
      const boardImagePath = join(directory, 'board.png');
      for (const baseUrl of [base, `${base}/`, `${base}/images/generations`, `${base}/images/generations/`]) {
        await settings.saveAiSettings({ model: 'qwen-image-3.0-pro', baseUrl });
        global.fetch = async (url, options) => {
          assert.equal(url, `${base}/images/generations`);
          assert.equal(options.headers.Authorization, 'Bearer test-page-key');
          const body = JSON.parse(options.body);
          assert.equal(body.model, 'qwen-image-3.0-pro');
          assert.equal(body.n, 1);
          assert.equal(body.size, '1024x1536');
          assert.equal(body.prompt.includes('Image 1'), true);
          assert.deepEqual(body.image, [
            `data:image/png;base64,${Buffer.from('fake-template').toString('base64')}`,
            `data:image/png;base64,${Buffer.from('fake-board').toString('base64')}`,
          ]);
          assert.equal('input' in body, false);
          assert.equal('parameters' in body, false);
          return { ok: true, json: async () => ({ data: [{ url: 'https://output.example/token-plan.png' }] }) };
        };
        assert.equal((await generateTryOnImage({ templateImagePath, boardImagePath })).imageUrl, 'https://output.example/token-plan.png');
      }
    });

    await t.test('each fit changes the actual outbound prompt and negative prompt in both protocols', async () => {
      const fits = { original: 'original garment cuts', natural: 'moderate ease', loose: 'generous room' };
      for (const imagesProtocol of [true, false]) {
        await settings.saveAiSettings({ model: 'qwen-image-3.0-pro', baseUrl: imagesProtocol ? 'https://workspace.example/v1' : 'https://workspace.example/generation' });
        for (const [pantsFit, expected] of Object.entries(fits)) {
          let sentPrompt;
          global.fetch = async (url, options) => {
            const body = JSON.parse(options.body);
            sentPrompt = imagesProtocol ? body.prompt : body.input.messages[0].content[2].text;
            const parameters = imagesProtocol ? body : body.parameters;
            assert.ok(sentPrompt.includes(expected));
            assert.ok(sentPrompt.includes('tops, outerwear, and bottoms'));
            assert.equal(sentPrompt.includes('only to trousers'), false);
            assert.ok(sentPrompt.includes('do not slim, lengthen, or reshape the body'));
            assert.equal(parameters.negative_prompt.includes('skin-tight trousers'), pantsFit !== 'original');
            assert.equal(parameters.negative_prompt.includes('skin-tight shirts'), pantsFit !== 'original');
            assert.equal(sentPrompt.includes('takes priority over the reference garment silhouettes'), pantsFit !== 'original');
            return { ok: true, json: async () => imagesProtocol ? { data: [{ url: 'https://output.example/fit.png' }] } : { output: { choices: [{ message: { content: [{ image: 'https://output.example/fit.png' }] } }] } } };
          };
          const result = await generateTryOnImage({ templateImagePath: join(directory, 'template.png'), boardImagePath: join(directory, 'board.png'), clothingFit: pantsFit });
          assert.equal(result.prompt, sentPrompt);
        }
      }
    });

    await t.test('Token Plan Qwen 3 submits once then polls on the same package host', async () => {
      const base = 'https://token-plan.cn-beijing.maas.aliyuncs.com';
      await settings.saveAiSettings({ model: 'qwen-image-3.0-pro', baseUrl: `${base}/compatible-mode/v1` });
      let submissions = 0;
      let polls = 0;
      global.fetch = async (url, options) => {
        assert.equal(options.headers.Authorization, 'Bearer test-page-key');
        if (options.method === 'POST') {
          submissions++;
          assert.equal(url, `${base}/api/v1/services/aigc/image-generation/generation`);
          assert.equal(options.headers['X-DashScope-Async'], 'enable');
          const body = JSON.parse(options.body);
          assert.equal(body.model, 'qwen-image-3.0-pro');
          assert.equal(body.parameters.size, '1024*1536');
          assert.equal(body.input.messages[0].content.length, 3);
          return { ok: true, json: async () => ({ output: { task_id: 'test-task', task_status: 'PENDING' } }) };
        }
        polls++;
        assert.equal(url, `${base}/api/v1/tasks/test-task`);
        return { ok: true, json: async () => ({ output: polls === 1
          ? { task_status: 'RUNNING' }
          : { task_status: 'SUCCEEDED', choices: [{ message: { content: [{ text: 'done' }, { image: 'https://output.example/async.png' }] } }] }
        }) };
      };
      const result = await generateTryOnImage({ templateImagePath: join(directory, 'template.png'), boardImagePath: join(directory, 'board.png') });
      assert.equal(result.imageUrl, 'https://output.example/async.png');
      assert.equal(submissions, 1);
      assert.equal(polls, 2);

      const { resolveImageEndpoint } = require(join(directory, 'compiled/image-endpoint.js'));
      assert.deepEqual(resolveImageEndpoint(`${base}/compatible-mode/v1/`, 'qwen-image-2.0-pro'), {
        url: `${base}/api/v1/services/aigc/multimodal-generation/generation`, protocol: 'dashscope',
      });
      assert.equal(resolveImageEndpoint(`${base}/api/v1/services/aigc/image-generation/generation/`, 'qwen-image-3.0-pro').protocol, 'dashscope-async');
    });

    await t.test('async task failures stop polling and do not submit another generation', async () => {
      const paths = { templateImagePath: join(directory, 'template.png'), boardImagePath: join(directory, 'board.png') };
      for (const status of ['FAILED', 'CANCELED', 'UNKNOWN']) {
        let calls = 0;
        global.fetch = async () => {
          calls++;
          return { ok: true, json: async () => ({ output: calls === 1
            ? { task_id: 'failed-task', task_status: 'PENDING' }
            : { task_status: status, message: 'test failure' }
          }) };
        };
        await assert.rejects(generateTryOnImage(paths), error => {
          assert.match(error.message, /试穿任务失败：test failure/);
          assert.equal(error.diagnostics.stage, 'poll-task');
          assert.equal(error.diagnostics.taskId, 'failed-task');
          assert.equal(error.diagnostics.taskStatus, status);
          return true;
        });
        assert.equal(calls, 2);
      }
      global.fetch = async () => ({ ok: true, json: async () => ({ output: {} }) });
      await assert.rejects(generateTryOnImage(paths), /没有返回任务编号/);
    });

    await t.test('Images error responses and missing output produce readable errors', async () => {
      await settings.saveAiSettings({ model: 'qwen-image-3.0-pro', baseUrl: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1' });
      const paths = { templateImagePath: join(directory, 'template.png'), boardImagePath: join(directory, 'board.png') };
      global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'invalid test key' } }) });
      await assert.rejects(generateTryOnImage(paths), /invalid test key/);
      global.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError(); } });
      await assert.rejects(generateTryOnImage(paths), /HTTP 502/);
      global.fetch = async () => ({ ok: true, json: async () => ({ data: [] }) });
      await assert.rejects(generateTryOnImage(paths), /没有返回图片/);
    });

    await t.test('provider errors retain HTTP and request diagnostics without exposing credentials or images', async () => {
      const key = 'private-fixture-key';
      await settings.saveAiSettings({ model: 'qwen-image-3.0-pro', baseUrl: 'https://workspace.example/compatible-mode/v1', apiKey: key });
      const paths = { templateImagePath: join(directory, 'template.png'), boardImagePath: join(directory, 'board.png') };
      global.fetch = async () => ({ ok: false, status: 403, json: async () => ({
        request_id: 'fixture-request', code: 'AccessDenied',
        message: `Rejected ${key}, data:image/png;base64,SHOULD_NOT_APPEAR https://output.example/image?signature=secret`,
        input: { image: 'private image contents' },
      }) });
      await assert.rejects(generateTryOnImage(paths), error => {
        assert.equal(error.diagnostics.httpStatus, 403);
        assert.equal(error.diagnostics.requestId, 'fixture-request');
        assert.equal(error.diagnostics.code, 'AccessDenied');
        assert.equal(error.diagnostics.stage, 'submit-request');
        assert.equal(error.diagnostics.model, 'qwen-image-3.0-pro');
        const serialized = JSON.stringify({ message: error.message, stack: error.stack, diagnostics: error.diagnostics });
        for (const privateText of [key, 'SHOULD_NOT_APPEAR', 'signature=secret', 'private image contents']) assert.equal(serialized.includes(privateText), false);
        return true;
      });
      global.fetch = async () => { const error = new TypeError('fetch failed'); error.cause = Object.assign(new Error('socket disconnected'), { code: 'ECONNRESET' }); throw error; };
      await assert.rejects(generateTryOnImage(paths), error => error.cause.code === 'ECONNRESET' && error.diagnostics.stage === 'submit-request');
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

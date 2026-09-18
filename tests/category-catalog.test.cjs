const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('lib/category-catalog.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(exportsObject, name=>require('../lib/category-defaults.json'));
const {defaultCategories: catalog, matchesCategory, refineCategorySuggestion, categoryLayoutGroup} = exportsObject;
test('body-part filters include detailed categories; exact filters remain specific',()=>{
  assert.equal(matchesCategory('skirt','group:bottom',catalog),true);
  assert.equal(matchesCategory('onepiece-dress','group:bottom',catalog),false);
  assert.equal(matchesCategory('skirt','bottom',catalog),false);
  assert.equal(matchesCategory('unknown','',catalog),true);
  assert.equal(categoryLayoutGroup('underwear'),'whole');
  assert.equal(categoryLayoutGroup('accessory'),'accessory');
});
test('local filename refinement distinguishes one-piece clothes, skirts and disabled suggestions',()=>{
  assert.equal(refineCategorySuggestion('宝宝哈衣.jpg','loungewear',catalog),'baby-romper');
  assert.equal(refineCategorySuggestion('花半身裙.jpg','dress',catalog),'skirt');
  assert.equal(refineCategorySuggestion('white-bodysuit.jpg','loungewear',catalog),'bodysuit');
  assert.equal(refineCategorySuggestion('白色卫衣.jpg','top',catalog),'sweatshirt');
  assert.equal(refineCategorySuggestion('无提示.jpg','loungewear',catalog.map(c=>({...c,active:c.id!=='loungewear'}))),'whole');
  assert.equal(refineCategorySuggestion('无提示.jpg','missing',catalog),'other');
});

# Wardrobe Stylist Agent Rules

## Product focus
本项目核心是：
- clothing catalog
- outfit composition
- outfit preview
- later-stage AI styling or try-on support

第一优先级永远是：
1. 先把衣物数据管理做好
2. 再把 outfit 组合流程做好
3. 最后再做视觉预览和 AI 增强

## Execution rules
- 先 inspect current repo，再做实现
- 优先 minimal viable implementation
- 不要为了未来可能的复杂能力提前过度设计
- 避免引入 heavy dependency，除非当前功能明确需要
- 优先复用现有 UI / state / data patterns
- 不做 unrelated refactor

## Data modeling rules
实现涉及 wardrobe domain 时，优先考虑这些实体：
- clothing item
- category
- color
- season
- style
- brand
- material
- tags
- outfit
- outfit item relation

在没有明确需要前：
- 不要过早引入复杂 recommendation engine
- 不要过早引入 image generation pipeline
- 不要把 AI try-on 当成第一阶段前提

## UX rules
- UI 应先可录入、可浏览、可筛选、可组合
- 操作路径要直接
- 第一版优先功能通顺，不追求复杂动效
- 如果要做 preview，先从 simple collage / gallery-style preview 开始

## Validation rules
修改后优先执行最相关的：
- test
- build
- lint
- local validation

如果无法运行验证，要明确说明：
- blocker 是什么
- 可替代的验证方式是什么

## Response rules
任务结束时，输出应尽量包含：
- 当前阶段
- 修改内容
- 影响范围
- 验证结果
- assumptions
- remaining work
- acceptance steps


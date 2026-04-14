# 真实 AI Vision 分类 MVP 方案

## 1. 当前环境现实方案

### 可用资源
- **Node.js / Next.js 14**：后端 API 路由
- **TensorFlow.js + MobileNet**：已安装依赖（`@tensorflow/tfjs`, `@tensorflow-models/mobilenet`）
- **无 GPU**：浏览器端运行，性能有限
- **无外部 API 密钥**：无法使用 Cloudinary / Google Vision

### 现实选择
**方案 A：浏览器端 TensorFlow.js（推荐）**
- 在 `/api/analyze` 中使用 Node.js 版 TensorFlow.js
- 加载 MobileNet 预训练模型进行分类
- 使用 Canvas 提取主色调
- **优点**：免费、离线、无需 API 密钥
- **缺点**：准确率中等、首次加载慢、无 GPU 加速

**方案 B：外部 API（需配置密钥）**
- Cloudinary AI / Google Vision API
- **优点**：准确率高、速度快
- **缺点**：需要付费、配置密钥、依赖外部服务

**结论**：先用方案 A（TensorFlow.js），后续可升级到方案 B

---

## 2. 是否需要多模态 Vision Model

### 分类任务需求
- **Category 识别**：单标签分类（top/bottom/outerwear/shoes/accessory）
- **Color 识别**：颜色提取（非多模态）
- **Season 识别**：基于款式推断（较复杂）

### 模型选择
**MobileNet（推荐）**
- 预训练 ImageNet 分类模型
- 可识别 1000+ 物体类别（包括服装）
- 在 Node.js 中可用 TensorFlow.js 加载
- **局限**：不是专门的服装分类模型，但可识别 "shirt", "shoe", "jacket" 等

**CLIP（多模态）**
- 可文本-图像匹配
- 但 Node.js 版本支持有限，需额外依赖
- **结论**：MVP 阶段不需要，MobileNet 足够

---

## 3. 图片传入方式

### 当前流程
1. 用户上传图片 → `/api/upload` → 保存到 `public/uploads/`
2. 返回图片 URL（如 `http://localhost:3000/uploads/xxx.jpg`）
3. 前端调用 `/api/analyze` 传入 `imageUrl`

### AI 分析时图片获取
**方式 1：通过 URL 下载（推荐）**
```typescript
// 在 /api/analyze 中
const response = await fetch(imageUrl);
const buffer = await response.arrayBuffer();
```
- **优点**：简单，复用现有流程
- **缺点**：需网络请求，稍慢

**方式 2：Base64 传入**
```typescript
// 前端上传时直接传 base64
const base64 = await fileToBase64(file);
await fetch('/api/analyze', { body: JSON.stringify({ imageBase64: base64 }) });
```
- **优点**：无需额外网络请求
- **缺点**：增加请求体积，需修改上传流程

**方式 3：本地文件路径**
```typescript
// 直接读取服务器本地文件
const imagePath = path.join(process.cwd(), 'public', 'uploads', filename);
```
- **优点**：最快，无网络开销
- **缺点**：需知道文件路径，当前流程未传递

**推荐**：方式 1（URL 下载），最小改动现有流程

---

## 4. 最小可用版本改动

### 当前 `/api/analyze` 问题
- 完全基于文件名规则（伪 AI）
- 未使用 TensorFlow.js
- 未真正分析图像内容

### 最小改动方案
**步骤 1：安装/确认依赖**
```bash
npm install @tensorflow/tfjs @tensorflow-models/mobilenet
```

**步骤 2：修改 `/api/analyze`**
```typescript
// 新增：加载 MobileNet 模型（单次加载，缓存）
let mobilenetModel: any = null;

async function loadModel() {
  if (!mobilenetModel) {
    const tf = await import('@tensorflow/tfjs');
    const mobilenet = await import('@tensorflow-models/mobilenet');
    mobilenetModel = await mobilenet.load();
  }
  return mobilenetModel;
}

// 在 POST handler 中：
// 1. 下载图片到 Buffer
// 2. 使用 TensorFlow.js 解码图片
// 3. 使用 MobileNet 分类
// 4. 提取主色调（Canvas 或简单算法）
// 5. 返回 AI 结果 + 规则 fallback
```

**步骤 3：区分 Mock vs 真实 AI**
```typescript
// API 响应中增加字段
{
  "category": "top",
  "categorySource": "ai",  // "ai" | "rule" | "default"
  "color": "white",
  "colorSource": "ai",     // "ai" | "rule" | "default"
  "season": ["summer"],
  "seasonSource": "rule",  // season 暂只用规则
  "confidence": 0.75,
  "note": "Real AI classification using TensorFlow.js MobileNet"
}
```

**步骤 4：前端显示区分**
- 在 `PendingItemCard` 中显示 `categorySource` / `colorSource`
- AI 结果用不同样式标记（如紫色 "AI" 标签）

---

## 5. Provider / Model 选择（MVP）

### 推荐方案
**TensorFlow.js + MobileNet V2**
- **Provider**：TensorFlow.js（Google）
- **Model**：MobileNet V2（ImageNet 预训练）
- **Category 映射**：
  - `shirt` / `t-shirt` → `top`
  - `jeans` / `pants` → `bottom`
  - `jacket` / `coat` → `outerwear`
  - `shoe` / `sneaker` → `shoes`
  - `bag` / `hat` → `accessory`

**Color 提取**
- 使用 Canvas API 或简单 K-means
- 映射到预定义颜色列表

**Season 识别**
- 继续使用规则 fallback（AI 识别季节较难）

### 备选方案（需配置密钥）
**Cloudinary AI**
- 提供服装分类、颜色提取
- 需要 API 密钥
- 适合后续升级

**Google Vision API**
- 提供标签识别、颜色检测
- 需要 API 密钥
- 准确率高

---

## 6. 实施计划

### Phase 1：真实 AI 分类（MVP）
1. 安装 TensorFlow.js 依赖（已安装）
2. 修改 `/api/analyze` 使用 MobileNet
3. 实现图片下载 + TensorFlow.js 解码
4. 实现颜色提取（Canvas）
5. 返回真实 AI 结果 + 规则 fallback
6. 前端显示 AI 来源标记

### Phase 2：优化
1. 缓存模型加载（避免重复加载）
2. 优化图片处理速度
3. 增加置信度阈值判断
4. 改进颜色提取算法

### Phase 3：升级（可选）
1. 接入 Cloudinary / Google Vision API
2. 使用专门的服装分类模型
3. 增加季节 AI 识别

---

## 7. 验收标准

### 功能验收
1. ✅ `/api/analyze` 真正使用 TensorFlow.js 分析图像
2. ✅ 返回 `categorySource` / `colorSource` 标记来源
3. ✅ AI 结果与规则结果可对比
4. ✅ AI 失败时自动 fallback 到规则

### 准确率验收
1. ✅ Category 识别准确率 > 60%（MobileNet 基准）
2. ✅ Color 识别准确率 > 70%
3. ✅ AI 识别速度 < 3 秒/张

### 交互验收
1. ✅ 前端显示 AI 来源标记
2. ✅ 用户可覆盖 AI 结果
3. ✅ AI 加载时显示状态
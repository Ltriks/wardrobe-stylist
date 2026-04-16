# AI 辅助图片归类 MVP 方案

## 1. AI 分类接入当前上传流程

### 整体流程
```
用户上传图片 → 上传到服务器 → AI 识别属性 → 显示待确认列表（AI 结果 + 规则 fallback）→ 用户编辑/确认 → 正式入库
```

### 接入方式
- **不重构上传系统**：复用现有的 `/api/upload` 接口
- **新增 AI 识别 API**：`/api/analyze` - 接收图片 URL，返回 AI 识别结果
- **前端调用**：上传完成后，调用 AI 识别接口
- **并行处理**：AI 识别和规则识别同时进行，取最佳结果

## 2. 分类识别方案

### Category 识别
**AI 方案**：
- 使用多标签分类模型（如 CLIP、ResNet）
- 识别服装类型：top/bottom/outerwear/shoes/accessory
- 置信度阈值：0.6

**规则 fallback**：
- 文件名关键词匹配
- 默认值：`other`

**优先级**：AI > 规则 > 默认

### Color 识别
**AI 方案**：
- 使用颜色提取算法（如 K-means 聚类）
- 识别主色调
- 映射到预定义颜色列表

**规则 fallback**：
- 文件名关键词匹配
- 默认值：`unknown`

**优先级**：AI > 规则 > 默认

### Season 识别
**AI 方案**：
- 基于服装款式/材质判断（较复杂）
- 可识别：短袖（夏）、羽绒服（冬）等

**规则 fallback**：
- 文件名关键词匹配
- 默认值：`[]`

**优先级**：规则 > AI（AI 识别季节较难，可暂缓）

## 3. 失败处理与 Fallback

### 识别失败场景
1. **AI 服务不可用**：网络错误、API 限流
2. **AI 置信度过低**：低于阈值
3. **图片格式不支持**：非标准图片格式

### Fallback 策略
```
AI 识别 → 成功且置信度高 → 使用 AI 结果
       ↓ 失败或置信度低
    规则识别 → 成功 → 使用规则结果
       ↓ 失败
    默认值 → 使用默认值
```

### 实现方式
```typescript
async function classifyImage(imageUrl: string): Promise<ClassificationResult> {
  try {
    // 尝试 AI 识别
    const aiResult = await callAI(imageUrl);
    if (aiResult.confidence > 0.6) {
      return aiResult;
    }
  } catch (error) {
    console.warn('AI classification failed:', error);
  }

  // Fallback 到规则识别
  const ruleResult = await ruleBasedClassification(imageUrl);
  if (ruleResult) {
    return ruleResult;
  }

  // 使用默认值
  return getDefaultClassification();
}
```

## 4. 第一版 MVP 应做到什么程度

### 功能范围
1. ✅ **AI 识别 Category**：使用预训练模型或简单 API
2. ✅ **AI 识别 Color**：使用颜色提取算法
3. ✅ **规则 fallback**：AI 失败时使用文件名规则
4. ✅ **待确认页面显示 AI 结果**：标记 AI 识别结果
5. ✅ **用户可编辑**：AI 结果可被用户修改

### 不做范围
- ❌ **Season AI 识别**：暂缓，继续使用规则
- ❌ **复杂模型部署**：使用现成 API 或简单算法
- ❌ **实时识别**：上传后异步识别
- ❌ **模型训练**：使用预训练模型

### 技术方案选择
**方案 A：使用现成 API（推荐）**
- **Cloudinary AI**：提供服装分类、颜色提取
- **Google Vision API**：提供标签识别、颜色检测
- **优点**：快速实现，准确率高
- **缺点**：需要付费，依赖外部服务

**方案 B：本地简单算法**
- **Category**：使用预训练的 MobileNet 模型（TensorFlow.js）
- **Color**：使用 Canvas 提取主色调
- **优点**：免费，离线可用
- **缺点**：准确率较低，需要加载模型

**方案 C：混合方案（推荐）**
- **Category**：使用 TensorFlow.js + 预训练模型
- **Color**：使用 Canvas 提取主色调
- **Season**：使用规则 fallback
- **优点**：平衡准确率和实现成本
- **缺点**：需要加载模型文件

### 推荐方案：方案 C（混合方案）
- **Category**：TensorFlow.js + MobileNet（预训练）
- **Color**：Canvas 提取主色调
- **Season**：规则 fallback
- **实现成本**：中等
- **准确率**：中等偏上

## 5. 新增内容

### 新增 API
- `/api/analyze` - AI 图片分析接口

### 新增依赖
- `@tensorflow/tfjs` - TensorFlow.js
- `@tensorflow-models/mobilenet` - MobileNet 预训练模型

### 新增组件
- `AIIndicator` - 显示 AI 识别结果标记

### 修改组件
- `BatchUploadButton` - 上传后调用 AI 识别
- `PendingItemCard` - 显示 AI 识别结果

## 6. 验收标准

### 功能验收
1. ✅ 上传图片后，待确认页面显示 AI 识别结果
2. ✅ AI 识别结果比文件名规则更准确
3. ✅ AI 识别失败时，自动 fallback 到规则
4. ✅ 用户可编辑 AI 识别结果

### 准确率验收
1. ✅ Category 识别准确率 > 70%
2. ✅ Color 识别准确率 > 80%
3. ✅ AI 识别速度 < 2 秒/张

### 交互验收
1. ✅ AI 识别时显示加载状态
2. ✅ AI 识别结果有明显标记
3. ✅ 用户可覆盖 AI 结果
# 批量上传衣物图片 MVP 方案

## 1. 完整数据流

```
用户选择多张图片 → 上传到服务器 → 系统识别属性 → 显示待确认列表 → 用户编辑/确认 → 正式入库
```

### 详细流程
1. **上传阶段**
   - 用户在 "Clothes" 标签点击 "Batch Upload" 按钮
   - 选择多张图片（支持拖拽）
   - 批量上传到 `/api/upload`（复用现有接口）

2. **识别阶段**
   - 系统对每张图片进行初步分析
   - 提取 category、color、season
   - 生成预览和建议属性

3. **待确认阶段**
   - 显示批量上传结果列表
   - 每张图片显示建议属性（可编辑）
   - 用户可以批量确认或单独编辑

4. **入库阶段**
   - 用户确认后，批量创建 clothing items
   - 跳转回衣物列表

## 2. 最小可用 MVP 拆分步骤

### Step 1: 批量上传 UI
- 新增 "Batch Upload" 按钮
- 支持多选文件
- 显示上传进度

### Step 2: 识别逻辑（规则-based）
- **Category 识别**：基于文件名关键词
  - top/tshirt/shirt → top
  - pants/jeans/bottom → bottom
  - jacket/coat/outerwear → outerwear
  - shoes/sneakers/boots → shoes
  - 默认 → other

- **Color 识别**：基于文件名关键词
  - white/白 → white
  - black/黑 → black
  - blue/蓝 → blue
  - red/红 → red
  - 默认 → unknown

- **Season 识别**：基于文件名关键词
  - summer/夏 → summer
  - winter/冬 → winter
  - spring/春 → spring
  - autumn/fall/秋 → autumn
  - 默认 → []

### Step 3: 待确认页面
- 新增 `/batch-confirm` 页面
- 显示上传的图片和建议属性
- 支持编辑每个物品的属性
- 支持批量确认

### Step 4: 入库逻辑
- 批量创建 clothing items
- 跳转回衣物列表

## 3. 字段实现策略

### 规则-based（先做）
- **Category**：文件名关键词匹配
- **Color**：文件名关键词匹配
- **Season**：文件名关键词匹配
- **Name**：使用文件名（去掉扩展名）

### AI（后续优化）
- **Category**：图像识别（更准确）
- **Color**：图像主色提取（更准确）
- **Season**：基于材质/款式判断（复杂，可暂缓）

## 4. 新增内容

### 新增页面
- `/batch-confirm` - 待确认列表页面

### 新增组件
- `BatchUploadButton` - 批量上传按钮
- `BatchConfirmList` - 待确认列表组件
- `BatchConfirmItem` - 单个待确认物品组件

### 新增状态
- `pendingItems` - 待确认物品列表

### 新增数据结构
```typescript
interface PendingItem {
  id: string;
  imageUrl: string;
  suggestedName: string;
  suggestedCategory: Category;
  suggestedColor: string;
  suggestedSeason: Season[];
  status: 'pending' | 'confirmed' | 'skipped';
}
```

## 5. 第一版验收标准

### 功能验收
1. ✅ 点击 "Batch Upload" 按钮，可以选择多张图片
2. ✅ 上传完成后，跳转到待确认页面
3. ✅ 每张图片显示建议的 category、color、season
4. ✅ 可以编辑每个物品的属性
5. ✅ 点击 "Confirm All" 后，所有物品入库
6. ✅ 跳转回衣物列表，显示新添加的物品

### 交互验收
1. ✅ 上传进度显示
2. ✅ 建议属性基于文件名生成
3. ✅ 编辑功能正常
4. ✅ 批量确认功能正常

## 6. 实现优先级

### Phase 1（本次实现）
- 批量上传 UI
- 规则-based 属性识别
- 待确认页面
- 批量入库

### Phase 2（后续优化）
- AI 图像识别
- 拖拽上传
- 批量编辑
- 预设模板

### Phase 3（高级功能）
- 智能分类建议
- 重复检测
- 批量移动/删除
# 集群调度管理页面

## 功能概述

集群调度管理页面提供了对 Karmada 多云环境中各种资源调度情况的全面监控和管理功能。

## 主要特性

### 1. 多资源类型支持

- **工作负载调度**: 监控 Deployment、StatefulSet、DaemonSet 等工作负载的调度情况
- **服务调度**: 管理 Service 资源在多集群间的分发
- **配置调度**: 处理 ConfigMap、Secret 等配置资源的调度

### 2. 双视图模式

#### 拓扑视图
- 层次化展示资源调度结构
- 按命名空间分组显示
- 可视化集群分布情况
- 实时状态指示器

#### 列表视图
- 表格形式展示详细信息
- 支持分页和搜索
- 可自定义列显示
- 导出功能支持

### 3. 实时统计

提供四个关键指标的实时统计：
- **总数**: 当前资源总数量
- **运行中**: 正常运行的资源数量
- **等待中**: 处于等待状态的资源
- **失败**: 调度失败的资源数量

## 技术架构

### 组件结构

```
cluster-scheduling/
├── index.tsx              # 主页面组件
├── components/
│   └── SchedulingTopology.tsx  # 拓扑视图组件
└── README.md             # 文档
```

### 数据接口

- `getSchedulingList()`: 获取调度列表数据
- `getSchedulingDetail()`: 获取单个资源详情
- 支持按资源类型过滤
- 包含模拟数据生成器作为后备方案

### 类型定义

```typescript
interface SchedulingData {
  name: string;
  namespace: string;
  resourceType: string;
  clusters: string[];
  status: string;
  createTime: string;
  workloadInfo?: WorkloadInfo;
  serviceInfo?: ServiceInfo;
  configInfo?: ConfigInfo;
}
```

## 使用指南

### 1. 资源类型切换

在页面顶部使用资源类型按钮组，支持在以下类型间切换：
- 工作负载调度
- 服务调度
- 配置调度

### 2. 视图模式切换

通过视图模式按钮组选择查看方式：
- 拓扑视图: 适合了解整体架构
- 列表视图: 适合查看详细信息

### 3. 监控指标

顶部统计卡片提供快速概览：
- 绿色: 运行正常
- 橙色: 等待状态
- 红色: 失败状态
- 蓝色: 总体数量

## API 集成

### 当前状态

- 使用模拟数据进行展示
- 包含完整的 API 接口定义
- 支持真实 API 的快速集成

### 集成真实 API

1. 修改 `services/scheduling.ts` 中的 API 端点
2. 取消注释真实 API 调用代码
3. 配置正确的请求库导入

```typescript
// 需要实现的 API 端点
GET /api/v1/scheduling/workloads     # 工作负载列表
GET /api/v1/scheduling/services      # 服务列表
GET /api/v1/scheduling/configurations # 配置列表
```

## 开发说明

### 依赖项

- React 18+
- Ant Design 5.x
- TypeScript 4.x

### 构建和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

### 扩展功能

- 添加新的资源类型支持
- 实现更多的过滤和搜索选项
- 增强拓扑视图的交互性
- 添加实时数据更新

## 故障排除

### 常见问题

1. **数据不显示**: 检查 API 端点配置
2. **类型错误**: 确保 TypeScript 版本兼容
3. **样式问题**: 验证 Ant Design 版本

### 调试模式

在浏览器开发者工具中查看：
- Network 标签: API 请求状态
- Console 标签: 错误日志
- React DevTools: 组件状态

## 贡献指南

1. Fork 项目仓库
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

Apache License 2.0 
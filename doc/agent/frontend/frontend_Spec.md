# Karmada-Manager 前端设计修改规范方案文档

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期 | 作者 | 变更说明 |
|--------|------|------|----------|
| 1.0 | 2025-01-XX | 前端开发工程师 | 初稿创建，前端重新规划设计 |

### 1.2 文档目的

基于PRD文档、用户故事地图和API响应示例，重新规划设计Karmada-Manager前端页面架构，提供统一的前端开发规范和页面设计方案，确保产品的一致性和用户体验。

## 2. 技术栈确认

### 2.1 核心技术栈
- **前端框架**: React 18+ + TypeScript
- **UI组件库**: Ant Design 5.x
- **图表库**: Ant Design Charts (基于G2Plot)
- **状态管理**: React Context API + useReducer
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **样式方案**: CSS Modules + Ant Design 主题定制

### 2.2 设计系统
- **主题色彩**: Ant Design 默认主题色 (#1890ff)，支持亮色/暗色主题切换
- **响应式设计**: 桌面端优先，支持移动端适配
- **组件规范**: 基于Ant Design Design Language

## 3. 页面架构重新规划

### 3.1 整体架构
```
Karmada-Manager
├── 登录页面 (/login)
├── 主体应用 (/dashboard)
│   ├── 概览总控 (/overview)
│   ├── 集群管理 (/cluster-manage)
│   │   ├── 集群列表 (/clusters)
│   │   ├── 集群详情 (/clusters/:clusterName)
│   │   ├── 节点管理 (/clusters/:clusterName/nodes)
│   │   └── 节点详情 (/clusters/:clusterName/nodes/:nodeName)
│   ├── 多云资源管理 (/multicloud-resource-manage)
│   │   ├── 工作负载 (/workload)
│   │   ├── 配置管理 (/config)
│   │   ├── 网络服务 (/service)
│   │   ├── 命名空间 (/namespace)
│   │   └── 调度信息 (/scheduling)
│   ├── 多云策略管理 (/multicloud-policy-manage)
│   │   ├── 传播策略 (/propagation-policy)
│   │   └── 覆盖策略 (/override-policy)
│   ├── 基础配置 (/basic-config)
│   │   ├── Karmada配置 (/karmada-config)
│   │   ├── 镜像仓库 (/registry)
│   │   ├── Helm配置 (/helm)
│   │   ├── OEM配置 (/oem)
│   │   └── 升级管理 (/upgrade)
│   ├── 高级配置 (/advanced-config)
│   │   ├── 故障转移 (/failover)
│   │   ├── 权限管理 (/permission)
│   │   └── 重调度 (/reschedule)
│   └── 插件管理 (/addon)
│       ├── 内置插件 (/buildin)
│       └── 第三方插件 (/thirdparty)
```

### 3.2 页面层级结构

#### 3.2.1 一级页面（主导航）
1. **概览总控** - 系统全局状态和关键指标
2. **集群管理** - 成员集群管理和监控
3. **多云资源管理** - 跨集群资源管理
4. **多云策略管理** - 调度策略配置
5. **基础配置** - 系统基础设置
6. **高级配置** - 高级功能配置
7. **插件管理** - 扩展功能管理

#### 3.2.2 二级页面（子导航）
根据功能模块进一步细分，详见3.1架构图

## 4. 核心页面设计规范

### 4.1 概览总控页面 (/overview)

#### 4.1.1 设计目标
- 快速展示Karmada系统整体健康状态
- 提供成员集群资源使用概览
- 展示关键性能指标和趋势

#### 4.1.2 页面布局
```
┌─────────────────────────────────────────────────────────┐
│ 页面标题: Karmada-Manager 概览                             │
├─────────────────────────────────────────────────────────┤
│ Karmada控制面状态卡片                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ 版本信息        │ │ 运行状态        │ │ 运行时长        ││
│ │ v1.13.2        │ │ 🟢 运行中      │ │ 15天3小时      ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────┤
│ 成员集群资源概览                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ 节点统计        │ │ CPU使用情况     │ │ 内存使用情况    ││
│ │ 9/9 Ready      │ │ 21.65/36 Core  │ │ 17.2/31.9 GB   ││
│ │ 进度条+百分比   │ │ 进度条+百分比   │ │ 进度条+百分比   ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────┤
│ 集群状态概览 (表格形式)                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 集群名 | 状态 | 节点数 | CPU使用率 | 内存使用率 | 操作 │ │
│ │ master | 🟢   | 5/5   | 55.6%    | 53.7%     | 查看 │ │
│ │ branch | 🟢   | 4/4   | 65.8%    | 60.3%     | 查看 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.3 核心组件
- **状态卡片组件**: 展示关键指标
- **进度条组件**: 资源使用率可视化
- **集群状态表格**: 集群概览信息
- **状态徽章**: 运行状态标识

### 4.2 集群管理页面 (/cluster-manage)

#### 4.2.1 集群列表页面 (/clusters)

##### 设计目标
- 展示所有成员集群的详细信息
- 支持集群状态监控和筛选
- 提供快速跳转到集群详情的入口

##### 页面布局
```
┌─────────────────────────────────────────────────────────┐
│ 页面标题: 集群管理                                       │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 总集群数: 2     │ │ 🔍 搜索框       │                │
│ └─────────────────┘ └─────────────────┘                │
├─────────────────────────────────────────────────────────┤
│ 集群列表 (卡片式布局)                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 集群: master                    🟢 Ready            │ │
│ │ K8s版本: v1.30.11+rke2r1        创建时间: 2天前     │ │
│ │ 节点: 5/5 Ready                 同步模式: Push      │ │
│ │ CPU: 55.6% (11.1/20 Core)       内存: 53.7% (...GB) │ │
│ │ Pod: 7.1% (39/550)              [查看详情] [管理节点] │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 集群: branch                    🟢 Ready            │ │
│ │ ... (类似布局)                                      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 4.2.2 集群详情页面 (/clusters/:clusterName)

##### 设计目标
- 展示单个集群的详细信息
- 提供节点列表和资源分配视图
- 支持集群级别的操作

##### 页面布局
```
┌─────────────────────────────────────────────────────────┐
│ 面包屑: 集群管理 > master                                │
│ 页面标题: 集群详情 - master                              │
├─────────────────────────────────────────────────────────┤
│ 集群基本信息卡片                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ 状态: 🟢 Ready  │ │ K8s: v1.30.11   │ │ 同步: Push      ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────┤
│ 资源使用情况图表                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ CPU使用率图表   │ │ 内存使用率图表   │ │ Pod分布图表     ││
│ │ (饼图/环图)     │ │ (饼图/环图)     │ │ (柱状图)       ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────┤
│ 节点列表                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 节点名 | 状态 | IP地址 | CPU | 内存 | Pod数 | 操作    │ │
│ │ master01 | 🟢 | 10.0.1.1 | 4/4 | 8/8GB | 15/110 | 查看 │ │
│ │ ... (更多节点)                                      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 4.2.3 节点详情页面 (/clusters/:clusterName/nodes/:nodeName)

##### 设计目标
- 展示单个节点的详细信息
- 显示节点上运行的Pod列表
- 提供节点资源监控视图

### 4.3 多云资源管理页面 (/multicloud-resource-manage)

#### 4.3.1 工作负载页面 (/workload)

##### 设计目标
- 展示跨集群的工作负载分布
- 支持调度策略可视化
- 提供Pod调度路径追溯

##### 页面布局
```
┌─────────────────────────────────────────────────────────┐
│ 页面标题: 工作负载管理                                   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ 类型筛选        │ │ 集群筛选        │ │ 🔍 搜索框       ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────┤
│ 工作负载列表                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📦 nginx-deployment                                 │ │
│ │ 类型: Deployment | 命名空间: default                │ │
│ │ 调度策略: nginx-propagation                         │ │
│ │ 总副本: 3 | 就绪: 3 | 集群分布: master(2), branch(1) │ │
│ │ [查看详情] [编辑策略] [调度分析]                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.2 调度信息页面 (/scheduling)

##### 设计目标
- 可视化展示资源调度过程
- 提供调度决策分析
- 支持调度路径追溯

## 5. 组件设计规范

### 5.1 通用组件

#### 5.1.1 状态徽章组件 (StatusBadge)
```typescript
interface StatusBadgeProps {
  status: 'ready' | 'notready' | 'unknown' | 'warning' | 'error';
  text?: string;
}

// 颜色映射
const statusColors = {
  ready: '#52c41a',    // 绿色
  notready: '#ff4d4f', // 红色  
  unknown: '#d9d9d9',  // 灰色
  warning: '#faad14',  // 橙色
  error: '#ff4d4f'     // 红色
};
```

#### 5.1.2 资源使用率组件 (ResourceUsage)
```typescript
interface ResourceUsageProps {
  used: number;
  total: number;
  unit: string;
  type: 'cpu' | 'memory' | 'storage';
  showProgress?: boolean;
}
```

#### 5.1.3 集群选择器组件 (ClusterSelector)
```typescript
interface ClusterSelectorProps {
  clusters: Cluster[];
  selectedClusters: string[];
  onChange: (clusters: string[]) => void;
  multiple?: boolean;
}
```

### 5.2 页面专用组件

#### 5.2.1 集群卡片组件 (ClusterCard)
```typescript
interface ClusterCardProps {
  cluster: {
    name: string;
    status: string;
    kubernetesVersion: string;
    nodeSummary: NodeSummary;
    allocatedResources: AllocatedResources;
    creationTimestamp: string;
  };
  onViewDetails: (clusterName: string) => void;
  onManageNodes: (clusterName: string) => void;
}
```

#### 5.2.2 调度可视化组件 (SchedulingVisualization)
```typescript
interface SchedulingVisualizationProps {
  workload: Workload;
  propagationPolicy: PropagationPolicy;
  clusterDistribution: ClusterDistribution[];
}
```

## 6. 数据流和状态管理

### 6.1 全局状态结构
```typescript
interface GlobalState {
  user: {
    isAuthenticated: boolean;
    userInfo: UserInfo | null;
  };
  clusters: {
    list: Cluster[];
    currentCluster: Cluster | null;
    loading: boolean;
    error: string | null;
  };
  resources: {
    workloads: Workload[];
    policies: Policy[];
    loading: boolean;
  };
  theme: {
    mode: 'light' | 'dark';
  };
}
```

### 6.2 API数据映射

#### 6.2.1 集群数据映射
```typescript
// API响应到页面数据的转换
const mapClusterData = (apiResponse: ClusterAPIResponse): ClusterCardData => {
  return {
    name: apiResponse.objectMeta.name,
    status: apiResponse.ready === 'True' ? 'ready' : 'notready',
    kubernetesVersion: apiResponse.kubernetesVersion,
    nodeStats: {
      total: apiResponse.nodeSummary.totalNum,
      ready: apiResponse.nodeSummary.readyNum,
      percentage: (apiResponse.nodeSummary.readyNum / apiResponse.nodeSummary.totalNum) * 100
    },
    resources: {
      cpu: {
        used: apiResponse.allocatedResources.cpuFraction,
        total: apiResponse.allocatedResources.cpuCapacity,
        percentage: apiResponse.allocatedResources.cpuFraction
      },
      memory: {
        used: apiResponse.allocatedResources.memoryCapacity * (apiResponse.allocatedResources.memoryFraction / 100),
        total: apiResponse.allocatedResources.memoryCapacity,
        percentage: apiResponse.allocatedResources.memoryFraction
      }
    }
  };
};
```

## 7. 响应式设计

### 7.1 断点规范
```css
/* 断点定义 */
@media (min-width: 576px) { /* 小屏设备 */ }
@media (min-width: 768px) { /* 平板设备 */ }
@media (min-width: 992px) { /* 桌面设备 */ }
@media (min-width: 1200px) { /* 大屏设备 */ }
```

### 7.2 布局适配

#### 7.2.1 桌面端 (≥992px)
- 侧边栏固定，宽度240px
- 主内容区域响应式调整
- 卡片使用网格布局，每行3-4个

#### 7.2.2 平板端 (768px-991px) 
- 侧边栏可折叠
- 卡片每行2个
- 表格支持横向滚动

#### 7.2.3 移动端 (<768px)
- 侧边栏改为抽屉式
- 卡片单列布局
- 优化触摸操作

## 8. 主题设计

### 8.1 亮色主题
- 主色调: #1890ff (Ant Design 蓝)
- 背景色: #f0f2f5
- 卡片背景: #ffffff
- 文字色: #000000d9

### 8.2 暗色主题  
- 主色调: #1890ff
- 背景色: #141414
- 卡片背景: #1f1f1f
- 文字色: #ffffffd9

### 8.3 主题切换
- 全局主题提供器支持
- 用户偏好存储在localStorage
- 组件级别的主题适配

## 9. 性能优化

### 9.1 代码层面
- 组件懒加载
- 虚拟滚动表格
- 图片资源优化
- Bundle代码分割

### 9.2 数据层面
- API请求缓存
- 分页加载
- 实时数据订阅优化
- 错误边界处理

## 10. 可访问性 (Accessibility)

### 10.1 键盘导航
- 所有交互元素支持Tab导航
- 明确的焦点指示器
- 快捷键支持

### 10.2 语义化标记
- 正确使用HTML语义标签
- ARIA属性支持
- 屏幕阅读器兼容

### 10.3 色彩对比
- 满足WCAG 2.1 AA级标准
- 色盲友好的颜色方案
- 状态不仅依赖颜色表示

## 11. 国际化 (i18n)

### 11.1 语言支持
- 简体中文 (默认)
- 英文
- 多语言扩展能力

### 11.2 文本管理
- 统一的文本资源管理
- 动态语言切换
- 数字、日期格式化

## 12. 开发和构建

### 12.1 开发环境
- 热重载开发服务器
- TypeScript严格模式
- ESLint + Prettier代码规范
- Git commit规范

### 12.2 构建优化
- 生产环境代码压缩
- 资源文件压缩
- CDN部署支持
- Docker容器化

## 13. 后续优化方向

### 13.1 功能增强
- 实时监控告警
- 自定义仪表板
- 操作审计日志
- 批量操作支持

### 13.2 用户体验
- 操作向导
- 上下文帮助
- 快速操作面板
- 个性化设置

### 13.3 技术升级
- PWA支持
- 微前端架构
- GraphQL集成
- AI智能推荐

---

*此文档将随着项目发展持续更新和完善* 
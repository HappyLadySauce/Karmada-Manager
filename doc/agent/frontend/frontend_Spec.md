# 前端设计修改规范方案 (Frontend Modification Specification)

## 1. 文档概述

### 1.1 文档目的

本文档基于 `PRD.md`、`Design_Spec.md`、`User_Story_Map.md` 以及高保真原型设计，制定 Karmada-Dashboard 前端优化的具体修改方案，指导前端开发团队完成界面现代化升级和功能增强。

### 1.2 设计目标

- **现代化升级**: 基于 Ant Design 5.x + Tailwind CSS 实现现代化、美观的界面设计
- **用户体验提升**: 优化概览页面、资源管理、可视化调度等核心功能
- **响应式优化**: 确保在不同屏幕尺寸下的良好用户体验
- **国际化完善**: 基于自动化 i18n 工具实现多语言支持
- **性能优化**: 提升页面加载速度和交互响应性

### 1.3 技术栈

基于现有项目架构，采用以下技术栈：
- **前端框架**: React 18.3.1 + TypeScript 5.6.3
- **UI组件库**: Ant Design 5.21.3
- **样式框架**: Tailwind CSS 3.4.13
- **数据可视化**: @ant-design/plots 2.4.0
- **状态管理**: Zustand 4.5.5
- **路由管理**: React Router DOM 6.26.2
- **HTTP客户端**: Axios 1.7.7 + TanStack Query 5.59.8
- **代码编辑器**: Monaco Editor 0.48.0
- **国际化**: i18next 23.15.2 + @karmada/i18n-tool

## 2. 整体设计方向

### 2.1 视觉升级策略

#### 2.1.1 色彩系统升级
基于设计规范实现更现代化的色彩方案：

```css
/* 主色调 - 蓝紫渐变系 */
:root {
  --primary-500: #4f46e5;   /* 主品牌色 */
  --secondary-500: #a855f7;  /* 次品牌色 */
  
  /* 渐变方案 */
  --gradient-primary: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --gradient-bg-card: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  
  /* 功能色彩 */
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
  --info-500: #06b6d4;
}
```

#### 2.1.2 卡片设计升级
```css
.modern-card {
  background: var(--gradient-bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.modern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}
```

#### 2.1.3 按钮设计升级
```css
.btn-primary-modern {
  background: var(--gradient-primary);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.btn-primary-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
}
```

### 2.2 布局架构优化

#### 2.2.1 侧边栏设计
- **宽度**: 240px
- **背景**: 白色渐变背景
- **导航项**: 圆角设计，hover悬浮效果
- **图标**: Font Awesome 6.4.0 或 Ant Design Icons

#### 2.2.2 主内容区
- **左边距**: 240px (侧边栏宽度)
- **内边距**: 24px
- **背景**: #f8fafc

#### 2.2.3 响应式断点
```css
/* 移动端 */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-240px); }
  .main-content { margin-left: 0; }
}

/* 平板端 */
@media (max-width: 1024px) {
  .sidebar { width: 200px; }
  .main-content { margin-left: 200px; }
}
```

## 3. 核心页面修改方案

### 3.1 概览页面 (Overview) 升级

#### 3.1.1 页面结构
基于原型设计 `overview.html`，实现以下模块：

```typescript
// 页面组件结构
OverviewPage
├── PageHeader                 // 页面头部
├── KarmadaStatusSection       // Karmada控制面状态
├── ClusterSummarySection      // 集群汇总信息
├── ResourceSummarySection     // 资源汇总信息
├── ResourceTrendsSection      // 资源趋势图表
├── PolicySummarySection       // 策略汇总信息
└── EventsSection              // 事件列表
```

#### 3.1.2 关键组件设计

**KarmadaStatusCard 组件**:
```typescript
interface KarmadaStatusCardProps {
  component: 'api-server' | 'controller' | 'scheduler';
  status: 'healthy' | 'warning' | 'error';
  version?: string;
  icon: React.ReactNode;
}

const KarmadaStatusCard: React.FC<KarmadaStatusCardProps> = ({
  component,
  status,
  version,
  icon
}) => {
  return (
    <Card className="modern-card hover-lift">
      <div className="flex items-center justify-between">
        <div>
          <Text className="text-gray-600">{component}</Text>
          <div className="flex items-center mt-2">
            <Badge status={status} />
            <Text className={`font-medium ${statusColors[status]}`}>
              {statusText[status]}
            </Text>
          </div>
          {version && <Text className="text-sm text-gray-500">{version}</Text>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColors[status]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
```

**ResourceSummaryCard 组件**:
```typescript
interface ResourceSummaryCardProps {
  title: string;
  total: number;
  allocated: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
}

const ResourceSummaryCard: React.FC<ResourceSummaryCardProps> = ({
  title,
  total,
  allocated,
  unit,
  icon,
  color
}) => {
  const percentage = total > 0 ? Math.round((allocated / total) * 100) : 0;
  
  return (
    <Card className="modern-card hover-lift">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Text className="text-gray-600">{title}</Text>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} 
               style={{ backgroundColor: `${color}20` }}>
            {icon}
          </div>
        </div>
        
        <div>
          <div className="flex items-baseline space-x-2">
            <Statistic 
              value={allocated} 
              suffix={`/ ${total} ${unit}`}
              valueStyle={{ fontSize: '24px', fontWeight: 600 }}
            />
          </div>
          <Progress 
            percent={percentage} 
            strokeColor={color}
            trailColor="#f0f0f0"
            strokeWidth={8}
            showInfo={false}
            className="mt-2"
          />
          <Text className="text-sm text-gray-500 mt-1">
            使用率: {percentage}%
          </Text>
        </div>
      </div>
    </Card>
  );
};
```

#### 3.1.3 数据可视化增强

**资源趋势图表**:
```typescript
const ResourceTrendsChart: React.FC = () => {
  const config = {
    data: trendsData,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    color: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'],
    smooth: true,
    lineStyle: {
      lineWidth: 3,
    },
    point: {
      size: 5,
      shape: 'circle',
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 2000,
      },
    },
  };

  return (
    <Card className="modern-card" title="资源使用趋势">
      <Line {...config} height={300} />
    </Card>
  );
};
```

### 3.2 资源管理页面升级

#### 3.2.1 工作负载管理 (Deployments)

基于原型设计 `deployments-list.html` 和 `deployment-create.html`：

**列表页面组件结构**:
```typescript
DeploymentListPage
├── PageHeader                 // 页面头部 + 创建按钮
├── FilterPanel                // 筛选面板
├── ResourceTable              // 资源表格
└── BulkActionBar              // 批量操作栏
```

**创建页面组件结构**:
```typescript
DeploymentCreatePage
├── PageHeader                 // 页面头部
├── CreationModeSelector       // 创建模式选择（表单/YAML）
├── FormCreationPanel          // 表单创建面板
│   ├── BasicInfoSection       // 基本信息
│   ├── ContainerSection       // 容器配置
│   ├── ResourceSection        // 资源配置
│   ├── PolicySection          // 策略配置
│   └── AdvancedSection        // 高级配置
├── YAMLCreationPanel          // YAML创建面板
└── ActionButtons              // 操作按钮
```

#### 3.2.2 关键组件设计

**ResourceTable 组件**:
```typescript
interface ResourceTableProps<T> {
  data: T[];
  columns: ColumnType<T>[];
  loading?: boolean;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  onBulkDelete?: (keys: React.Key[]) => void;
}

const ResourceTable = <T extends { key: React.Key }>({
  data,
  columns,
  loading,
  onEdit,
  onDelete,
  onBulkDelete
}: ResourceTableProps<T>) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const enhancedColumns = [
    ...columns,
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => onEdit?.(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => onDelete?.(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="modern-card">
      <Table
        rowSelection={rowSelection}
        columns={enhancedColumns}
        dataSource={data}
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
        className="modern-table"
      />
      
      {selectedRowKeys.length > 0 && (
        <div className="bulk-action-bar">
          <Space>
            <Text>已选择 {selectedRowKeys.length} 项</Text>
            <Button danger onClick={() => onBulkDelete?.(selectedRowKeys)}>
              批量删除
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};
```

**FormCreationPanel 组件**:
```typescript
interface DeploymentFormData {
  name: string;
  namespace: string;
  replicas: number;
  image: string;
  ports: { containerPort: number; name?: string }[];
  envVars: { name: string; value: string }[];
  resources: {
    requests: { cpu: string; memory: string };
    limits: { cpu: string; memory: string };
  };
  propagationPolicy: {
    mode: 'existing' | 'create';
    policy?: string;
    clusters?: string[];
  };
}

const DeploymentForm: React.FC = () => {
  const [form] = Form.useForm<DeploymentFormData>();
  const [activeSection, setActiveSection] = useState('basic');

  return (
    <Card className="modern-card">
      <Form form={form} layout="vertical" className="deployment-form">
        <Tabs
          activeKey={activeSection}
          onChange={setActiveSection}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: <BasicInfoSection />,
            },
            {
              key: 'container',
              label: '容器配置',
              children: <ContainerSection />,
            },
            {
              key: 'resources',
              label: '资源配置',
              children: <ResourceSection />,
            },
            {
              key: 'policy',
              label: '策略配置',
              children: <PolicySection />,
            },
          ]}
        />
      </Form>
    </Card>
  );
};
```

### 3.3 可视化调度策略页面

基于原型设计 `visual-scheduling.html`：

#### 3.3.1 页面组件结构
```typescript
VisualSchedulingPage
├── PageHeader                 // 页面头部
├── ClusterResourceView        // 集群资源视图
│   ├── ViewModeSelector       // 视图模式选择
│   ├── ClusterCards           // 集群卡片
│   └── ClusterFilter          // 集群筛选
├── PolicyConfigPanel          // 策略配置面板
│   ├── PlacementConfig        // 部署配置
│   ├── AffinityConfig         // 亲和性配置
│   ├── SpreadConfig           // 分布约束配置
│   └── TolerationsConfig      // 污点容忍配置
└── PolicyPreview              // 策略预览
    ├── YAMLPreview            // YAML预览
    └── SchedulingSimulation   // 调度模拟
```

#### 3.3.2 关键组件设计

**ClusterCard 组件**:
```typescript
interface ClusterCardProps {
  cluster: {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    region: string;
    zone: string;
    labels: Record<string, string>;
    taints: Array<{ key: string; value: string; effect: string }>;
    resources: {
      cpu: { total: number; allocated: number; unit: string };
      memory: { total: number; allocated: number; unit: string };
      pods: { total: number; allocated: number };
    };
    nodes: { total: number; ready: number };
  };
  selected?: boolean;
  onSelect?: (cluster: string) => void;
  allocation?: number; // 分配的副本数
}

const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  selected,
  onSelect,
  allocation
}) => {
  return (
    <Card
      className={`cluster-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect?.(cluster.name)}
      hoverable
    >
      {allocation && (
        <div className="allocation-preview">
          {allocation} 副本
        </div>
      )}
      
      <div className="cluster-header">
        <div className="flex items-center justify-between">
          <div>
            <Title level={5} className="mb-1">{cluster.name}</Title>
            <Text className="text-gray-500">
              {cluster.region} / {cluster.zone}
            </Text>
          </div>
          <Badge status={cluster.status} />
        </div>
      </div>

      <div className="cluster-resources mt-4 space-y-3">
        <ResourceBar
          label="CPU"
          total={cluster.resources.cpu.total}
          allocated={cluster.resources.cpu.allocated}
          unit={cluster.resources.cpu.unit}
          color="#4f46e5"
        />
        <ResourceBar
          label="Memory"
          total={cluster.resources.memory.total}
          allocated={cluster.resources.memory.allocated}
          unit={cluster.resources.memory.unit}
          color="#10b981"
        />
        <ResourceBar
          label="Pods"
          total={cluster.resources.pods.total}
          allocated={cluster.resources.pods.allocated}
          unit=""
          color="#f59e0b"
        />
      </div>

      <div className="cluster-labels mt-3">
        {Object.entries(cluster.labels).slice(0, 3).map(([key, value]) => (
          <Tag key={key} className="label-chip">
            {key}={value}
          </Tag>
        ))}
        {Object.keys(cluster.labels).length > 3 && (
          <Tag>+{Object.keys(cluster.labels).length - 3} 更多</Tag>
        )}
      </div>

      {cluster.taints.length > 0 && (
        <div className="cluster-taints mt-2">
          {cluster.taints.slice(0, 2).map((taint, index) => (
            <Tag key={index} className="taint-chip">
              {taint.key}:{taint.effect}
            </Tag>
          ))}
          {cluster.taints.length > 2 && (
            <Tag>+{cluster.taints.length - 2} 污点</Tag>
          )}
        </div>
      )}
    </Card>
  );
};
```

**PolicyConfigPanel 组件**:
```typescript
interface PolicyConfigData {
  placement: {
    clusterAffinity?: {
      clusterNames?: string[];
      labelSelector?: Record<string, string>;
    };
    spreadConstraints?: Array<{
      spreadByField: string;
      maxSkew: number;
      minGroups?: number;
    }>;
    tolerations?: Array<{
      key: string;
      operator: string;
      value?: string;
      effect: string;
    }>;
  };
  replicaScheduling?: {
    type: 'Duplicated' | 'Divided';
    replicaDivisionPreference?: 'Weighted' | 'Aggregated';
    replicaSchedulingPolicy?: Array<{
      cluster: string;
      weight?: number;
      replicas?: number;
    }>;
  };
}

const PolicyConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<PolicyConfigData>({});
  const [activeTab, setActiveTab] = useState('placement');

  return (
    <Card className="policy-config-panel modern-card">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'placement',
            label: '集群选择',
            children: <PlacementConfig config={config} onChange={setConfig} />,
          },
          {
            key: 'affinity',
            label: '亲和性',
            children: <AffinityConfig config={config} onChange={setConfig} />,
          },
          {
            key: 'spread',
            label: '分布约束',
            children: <SpreadConstraintConfig config={config} onChange={setConfig} />,
          },
          {
            key: 'tolerations',
            label: '污点容忍',
            children: <TolerationsConfig config={config} onChange={setConfig} />,
          },
        ]}
      />
    </Card>
  );
};
```

### 3.4 调度关系树形图页面

基于原型设计 `scheduling-tree.html`：

#### 3.4.1 页面组件结构
```typescript
SchedulingTreePage
├── PageHeader                 // 页面头部
├── TreeControls               // 树形图控制
│   ├── ViewModeSelector       // 视图模式
│   ├── SearchBox              // 搜索框
│   └── FilterOptions          // 筛选选项
├── SchedulingTree             // 调度关系树
│   ├── PolicyNode             // 策略节点
│   ├── RuleNodes              // 规则节点
│   └── ClusterNodes           // 集群节点
└── NodeDetailsPanel           // 节点详情面板
```

#### 3.4.2 关键组件设计

**SchedulingTree 组件**:
```typescript
interface TreeNode {
  id: string;
  type: 'policy' | 'placement' | 'affinity' | 'spread' | 'toleration' | 'cluster';
  label: string;
  data: any;
  children?: TreeNode[];
  parent?: string;
}

const SchedulingTree: React.FC<{ policyName: string }> = ({ policyName }) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const icon = getNodeIcon(node.type);
    const color = getNodeColor(node.type);
    
    return (
      <div 
        className={`tree-node ${selectedNode?.id === node.id ? 'selected' : ''}`}
        onClick={() => setSelectedNode(node)}
      >
        <div className="node-header">
          <div className="node-icon" style={{ color }}>
            {icon}
          </div>
          <Text className="node-label">{node.label}</Text>
        </div>
        
        {node.type === 'cluster' && (
          <div className="cluster-summary">
            <Tag color={getClusterStatusColor(node.data.status)}>
              {node.data.status}
            </Tag>
            <Text className="text-xs text-gray-500">
              {node.data.region}/{node.data.zone}
            </Text>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scheduling-tree-container">
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={setExpandedKeys}
        titleRender={renderTreeNode}
        className="scheduling-tree"
      />
      
      {selectedNode && (
        <NodeDetailsPanel 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};
```

## 4. 国际化实现方案

### 4.1 自动化 i18n 工作流

基于现有的 `@karmada/i18n-tool`，实现完整的国际化工作流：

#### 4.1.1 配置文件
```javascript
// i18n.config.cjs
module.exports = {
  input: './src',
  output: './locales',
  languages: ['zh-CN', 'en-US'],
  translator: {
    provider: 'baidu', // 'baidu' | 'deepl' | 'openai'
    config: {
      appid: process.env.BAIDU_TRANSLATE_APPID,
      key: process.env.BAIDU_TRANSLATE_KEY,
    }
  },
  glossary: './locales/glossaries.csv',
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
  ],
  keyGenerator: 'md5',
  codemod: true,
};
```

#### 4.1.2 组件中的使用示例
```typescript
import { useTranslation } from 'react-i18next';

const OverviewPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Title level={1}>
        {t('概览仪表盘')}
      </Title>
      <Text className="description">
        {t('监控您的Karmada多集群环境')}
      </Text>
      
      <Card title={t('Karmada控制面状态')}>
        <KarmadaStatusCard 
          component={t('API Server')}
          status="healthy"
        />
      </Card>
    </div>
  );
};
```

### 4.2 术语表管理

```csv
# locales/glossaries.csv
中文,英文,备注
概览,Overview,页面标题
仪表盘,Dashboard,产品名称
控制面,Control Plane,Karmada术语
成员集群,Member Cluster,Karmada术语
传播策略,Propagation Policy,Karmada术语
重写策略,Override Policy,Karmada术语
调度,Scheduling,功能模块
亲和性,Affinity,调度术语
反亲和性,Anti-Affinity,调度术语
污点,Taint,Kubernetes术语
容忍,Toleration,Kubernetes术语
```

## 5. 样式系统实现

### 5.1 Tailwind CSS 配置

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
        secondary: {
          500: '#a855f7',
          600: '#9333ea',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.12)',
        'primary': '0 4px 12px rgba(79, 70, 229, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
```

### 5.2 CSS 变量定义

```css
/* src/styles/variables.css */
:root {
  /* 色彩系统 */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  
  /* 渐变 */
  --gradient-primary: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --gradient-bg-card: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  
  /* 间距 */
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* 阴影 */
  --shadow-card: 0 4px 20px rgba(0,0,0,0.08);
  --shadow-card-hover: 0 8px 30px rgba(0,0,0,0.12);
  --shadow-primary: 0 4px 12px rgba(79, 70, 229, 0.3);
  
  /* 圆角 */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

### 5.3 组件样式类

```css
/* src/styles/components.css */

/* 现代化卡片 */
.modern-card {
  @apply bg-white rounded-xl border border-gray-200 transition-all duration-300;
  box-shadow: var(--shadow-card);
}

.modern-card:hover {
  @apply transform -translate-y-1;
  box-shadow: var(--shadow-card-hover);
}

/* 悬浮效果 */
.hover-lift {
  @apply transition-all duration-300;
}

.hover-lift:hover {
  @apply transform -translate-y-1;
  box-shadow: var(--shadow-card-hover);
}

/* 主要按钮 */
.btn-primary-modern {
  background: var(--gradient-primary);
  @apply border-none rounded-lg px-6 py-3 text-white font-medium transition-all duration-200 cursor-pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.btn-primary-modern:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
}

/* 集群卡片 */
.cluster-card {
  @apply modern-card cursor-pointer relative;
  border: 2px solid #e5e7eb;
}

.cluster-card:hover {
  @apply border-primary-500;
  box-shadow: 0 8px 30px rgba(79, 70, 229, 0.15);
}

.cluster-card.selected {
  @apply border-primary-500 bg-primary-50;
}

/* 资源进度条 */
.resource-bar {
  @apply bg-gray-200 rounded-lg overflow-hidden h-2;
}

.resource-fill {
  @apply h-full rounded-lg transition-all duration-300;
}

/* 状态徽章 */
.status-dot {
  @apply w-2 h-2 rounded-full inline-block mr-2;
}

.status-healthy { @apply bg-green-500; }
.status-warning { @apply bg-yellow-500; }
.status-error { @apply bg-red-500; }

/* 标签芯片 */
.label-chip {
  @apply bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs m-1 inline-block;
}

.taint-chip {
  @apply bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs m-1 inline-block;
}

/* 分配预览 */
.allocation-preview {
  @apply absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-full text-xs font-semibold;
}

/* 表格样式 */
.modern-table {
  @apply bg-white rounded-lg overflow-hidden;
}

.modern-table .ant-table-thead > tr > th {
  @apply bg-gray-50 font-semibold text-gray-700 border-b border-gray-200;
}

.modern-table .ant-table-tbody > tr:hover > td {
  @apply bg-primary-50;
}

/* 批量操作栏 */
.bulk-action-bar {
  @apply bg-primary-50 border-t border-primary-200 px-4 py-3 flex items-center justify-between;
}

/* 策略预览 */
.policy-preview {
  @apply bg-gray-900 text-gray-300 font-mono rounded-lg p-4 h-80 overflow-y-auto border border-gray-300;
}

/* 树形图样式 */
.scheduling-tree .ant-tree-node-content-wrapper {
  @apply hover:bg-primary-50 rounded-lg transition-colors duration-200;
}

.scheduling-tree .ant-tree-node-selected .ant-tree-node-content-wrapper {
  @apply bg-primary-100;
}

.tree-node {
  @apply p-3 rounded-lg border border-gray-200 mb-2 cursor-pointer transition-all duration-200;
}

.tree-node:hover {
  @apply border-primary-500 bg-primary-50;
}

.tree-node.selected {
  @apply border-primary-500 bg-primary-100;
}

.node-header {
  @apply flex items-center space-x-2;
}

.node-icon {
  @apply w-5 h-5;
}

.node-label {
  @apply font-medium text-gray-800;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}
```

## 6. 性能优化策略

### 6.1 代码分割

```typescript
// 页面级代码分割
const OverviewPage = lazy(() => import('@/pages/overview'));
const WorkloadPage = lazy(() => import('@/pages/multicloud-resource-manage/workload'));
const VisualSchedulingPage = lazy(() => import('@/pages/visual-scheduling'));

// 路由配置
const AppRoutes = () => (
  <Suspense fallback={<PageSkeleton />}>
    <Routes>
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/workload" element={<WorkloadPage />} />
      <Route path="/visual-scheduling" element={<VisualSchedulingPage />} />
    </Routes>
  </Suspense>
);
```

### 6.2 组件优化

```typescript
// 使用 React.memo 优化组件渲染
const KarmadaStatusCard = React.memo<KarmadaStatusCardProps>(({
  component,
  status,
  version,
  icon
}) => {
  // 组件实现
});

// 使用 useMemo 优化计算
const ResourceSummaryCard: React.FC<ResourceSummaryCardProps> = ({
  total,
  allocated,
  unit
}) => {
  const percentage = useMemo(() => 
    total > 0 ? Math.round((allocated / total) * 100) : 0,
    [total, allocated]
  );

  // 组件实现
};

// 使用 useCallback 优化事件处理
const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  onSelect
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.(cluster.name);
  }, [cluster.name, onSelect]);

  // 组件实现
};
```

### 6.3 数据缓存

```typescript
// 使用 TanStack Query 进行数据缓存
const useOverviewData = () => {
  return useQuery({
    queryKey: ['overview'],
    queryFn: GetOverview,
    staleTime: 30000, // 30秒内认为数据是新鲜的
    cacheTime: 300000, // 5分钟缓存时间
    refetchInterval: 60000, // 每分钟自动刷新
  });
};

// 使用 React Query 的无限查询处理大数据
const useResourceList = (filters: ResourceFilters) => {
  return useInfiniteQuery({
    queryKey: ['resources', filters],
    queryFn: ({ pageParam = 1 }) => 
      getResourceList({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasNext ? pages.length + 1 : undefined,
  });
};
```

## 7. 测试策略

### 7.1 单元测试

```typescript
// 组件测试示例
import { render, screen, fireEvent } from '@testing-library/react';
import { KarmadaStatusCard } from './KarmadaStatusCard';

describe('KarmadaStatusCard', () => {
  it('should render component status correctly', () => {
    render(
      <KarmadaStatusCard
        component="api-server"
        status="healthy"
        version="v1.8.0"
        icon={<ServerIcon />}
      />
    );

    expect(screen.getByText('api-server')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('v1.8.0')).toBeInTheDocument();
  });

  it('should handle different status types', () => {
    const { rerender } = render(
      <KarmadaStatusCard component="scheduler" status="warning" />
    );

    expect(screen.getByText('warning')).toHaveClass('text-warning-600');

    rerender(
      <KarmadaStatusCard component="scheduler" status="error" />
    );

    expect(screen.getByText('error')).toHaveClass('text-error-600');
  });
});
```

### 7.2 集成测试

```typescript
// 页面集成测试示例
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverviewPage } from './OverviewPage';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('OverviewPage', () => {
  it('should load and display overview data', async () => {
    render(<OverviewPage />, { wrapper: createWrapper() });

    expect(screen.getByText('概览仪表盘')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Karmada控制面状态')).toBeInTheDocument();
    });
  });
});
```

## 8. 部署和构建

### 8.1 构建优化

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/icons', '@ant-design/plots'],
          'utils-vendor': ['lodash', 'dayjs', 'axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 8.2 Docker 构建

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 9. 实施计划

### 9.1 第一阶段：基础升级 (2周)
- [ ] 升级概览页面设计和功能
- [ ] 完善国际化系统
- [ ] 优化现有组件样式
- [ ] 实现响应式布局

### 9.2 第二阶段：功能增强 (3周)
- [ ] 实现表单化资源创建
- [ ] 优化资源列表和详情页面
- [ ] 添加批量操作功能
- [ ] 集成Monaco Editor

### 9.3 第三阶段：高级功能 (4周)
- [ ] 实现可视化调度策略配置
- [ ] 开发调度关系树形图
- [ ] 添加调度模拟功能
- [ ] 性能优化和测试

### 9.4 第四阶段：完善和部署 (1周)
- [ ] 全面测试和bug修复
- [ ] 文档完善
- [ ] 部署和上线

这份前端设计修改规范方案提供了完整的技术指导和实施计划，确保Karmada-Dashboard的现代化升级能够按照设计规范和用户需求顺利进行。 

## 项目背景

基于后端工程师完成的新增API接口（14个新增接口和3个增强接口），需要完善前端界面以支持更丰富的集群资源监控功能。

## 增强内容

### 1. 集群资源视图增强

#### 1.1 数据结构升级
- **原有结构**: 基础的集群名称、区域、状态、资源使用率
- **新增字段**:
  - `displayName`: 集群显示名称
  - `version`: Kubernetes版本
  - `provider`: 云服务提供商（AWS、Azure、GCP、AliCloud等）
  - `location`: 地理位置信息（国家、城市、经纬度）
  - `capabilities`: 集群能力标签（GPU、SSD存储、高内存等）
  - `joinedTime`: 加入时间

#### 1.2 视觉设计改进
- **状态指示器**: 右上角圆形状态指示灯（绿色=健康，红色=异常，黄色=警告）
- **云厂商图标**: 根据provider显示对应的云服务商图标
- **地理位置显示**: 在卡片右上角显示城市和国家信息
- **版本标签**: 使用蓝色Tag显示Kubernetes版本
- **能力标签**: 使用青色Tag显示集群特殊能力

#### 1.3 交互体验优化
- **悬浮提示**: 鼠标悬停显示详细信息（CPU/内存具体数值、节点Pod数量等）
- **资源进度条**: 彩色进度条显示CPU和内存使用率
- **加入时间格式化**: 智能显示"今天加入"、"3天前加入"等友好格式

### 2. 组件设计规范

#### 2.1 集群卡片(ClusterCard)组件规范
```tsx
interface ClusterCardProps {
  cluster: ClusterResource;
}

// 卡片尺寸
- 高度: 自适应内容，最小高度保证一致性
- 圆角: 12px
- 边框: 2px，健康状态为浅灰色，异常状态为对应状态色
- 阴影: 0 4px 20px rgba(0,0,0,0.08)
- 悬停效果: 轻微上浮效果

// 内容布局
- 内边距: 16px
- 状态指示器: 右上角(-8px, -8px)位置
- 头部信息: 集群名称 + 云厂商图标 + 地理位置
- 关键指标: 3列布局显示节点数、Pod数、可用性
- 资源使用率: CPU和内存进度条
- 标签区域: 能力标签、普通标签、污点标签
```

#### 2.2 颜色规范
```css
/* 状态色 */
--status-healthy: #52c41a;    /* 绿色 */
--status-warning: #faad14;    /* 黄色 */
--status-error: #ff4d4f;      /* 红色 */

/* 负载等级色 */
--load-low: #52c41a;         /* 绿色 */
--load-medium: #faad14;      /* 黄色 */
--load-high: #ff4d4f;        /* 红色 */

/* 功能色 */
--primary: #4f46e5;          /* 主色调 */
--info: #1890ff;             /* 信息蓝 */
--success: #52c41a;          /* 成功绿 */
--warning: #faad14;          /* 警告黄 */

/* 标签色 */
--tag-capability: cyan;       /* 能力标签 */
--tag-version: blue;          /* 版本标签 */
--tag-zone: default;          /* 区域标签 */
--tag-taint: orange;          /* 污点标签 */
```

#### 2.3 字体规范
```css
/* 集群名称 */
font-size: 16px;
font-weight: 600;

/* 状态文字 */
font-size: 12px;
font-weight: 500;

/* 指标数值 */
font-size: 20px;
font-weight: bold;

/* 指标标签 */
font-size: 10px;
color: #666;

/* 标签文字 */
font-size: 9-10px;
```

### 3. 响应式设计

#### 3.1 栅格布局
- **超大屏(xl, ≥1200px)**: 6列（每行4个集群卡片）
- **大屏(lg, ≥992px)**: 8列（每行3个集群卡片）
- **中屏(md, ≥768px)**: 12列（每行2个集群卡片）
- **小屏(sm, ≥576px)**: 12列（每行2个集群卡片）
- **超小屏(xs, <576px)**: 24列（每行1个集群卡片）

#### 3.2 间距适配
```tsx
// 栅格间距
gutter={[16, 16]}  // 水平16px，垂直16px

// 卡片内间距在不同屏幕下保持一致
padding: 16px
```

### 4. 数据交互规范

#### 4.1 API接口对接
```typescript
// 服务接口路径
GET /api/v1/scheduling/clusters/resources

// 请求参数
{
  page?: number;     // 页码
  limit?: number;    // 每页数量（默认100）
  region?: string;   // 区域过滤
  status?: string;   // 状态过滤
}

// 响应数据结构
interface ClusterResourceResp {
  clusters: ClusterResource[];
  total?: number;
}
```

#### 4.2 错误处理策略
- **API不可用**: 显示模拟数据并在控制台输出警告
- **数据为空**: 显示空状态页面，提示"暂无集群数据"
- **加载失败**: 显示错误提示，提供重试按钮

#### 4.3 实时更新机制
```typescript
// 使用React Query实现30秒自动刷新
refetchInterval: 30000

// 手动刷新按钮
onClick={() => {
  refetch();           // 刷新概览数据
  refetchClusters();   // 刷新集群数据
}}
```

### 5. 用户体验优化

#### 5.1 加载状态
- **Spin组件**: 页面级加载使用大型加载器
- **骨架屏**: 卡片加载时显示骨架占位
- **防抖处理**: 避免频繁刷新请求

#### 5.2 空状态设计
```tsx
// 空状态页面
<div className="empty-state">
  <ClusterOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
  <Title level={4} style={{ color: '#999' }}>暂无集群数据</Title>
  <Text type="secondary">请稍后再试或联系管理员</Text>
</div>
```

#### 5.3 统计信息展示
```tsx
// 集群统计信息（卡片头部右侧）
总计: 3  健康: 2  异常: 1
```

### 6. 技术实现细节

#### 6.1 组件结构
```
Overview组件
├── 页面头部(page-header)
├── 系统信息卡片
├── 资源使用情况卡片  
├── 策略与资源统计卡片
└── 集群资源视图
    ├── 卡片标题栏（含统计信息）
    └── 集群卡片网格
        └── ClusterCard组件 × N
```

#### 6.2 状态管理
- **useQuery**: 数据获取和缓存
- **本地状态**: 组件内部UI状态
- **派生状态**: 基于服务器数据计算的显示状态

#### 6.3 性能优化
- **组件memo化**: 避免不必要的重渲染
- **图标优化**: 使用Ant Design图标库
- **懒加载**: 大量集群时考虑虚拟化渲染

### 7. 浏览器兼容性

#### 7.1 支持范围
- **Chrome**: >= 88
- **Firefox**: >= 84  
- **Safari**: >= 14
- **Edge**: >= 88

#### 7.2 Polyfill策略
- **CSS Grid**: 自动降级到Flexbox
- **新特性**: 通过Babel转译确保兼容性

### 8. 代码质量规范

#### 8.1 TypeScript类型定义
```typescript
// 严格的接口定义
interface ClusterResource {
  name: string;
  displayName?: string;
  region?: string;
  zone?: string;
  status: 'Ready' | 'NotReady' | 'Unknown';
  version?: string;
  provider?: string;
  // ... 其他字段
}
```

#### 8.2 代码注释规范
```typescript
/**
 * 集群卡片组件（增强版）
 * @param cluster 集群资源信息
 * @returns 渲染的集群卡片
 */
const ClusterCard: React.FC<{ cluster: ClusterResource }> = ({ cluster }) => {
  // 获取状态颜色
  const getStatusColor = (status: string) => { ... };
  
  // 格式化加入时间
  const formatJoinedTime = (joinedTime?: string) => { ... };
}
```

#### 8.3 测试覆盖
- **单元测试**: 组件渲染和用户交互
- **集成测试**: API数据流和状态管理
- **E2E测试**: 完整的用户操作流程

## 后续优化计划

### 第一阶段
- [x] 增强集群资源视图显示
- [x] 添加地理位置和版本信息
- [x] 实现悬浮提示功能
- [x] 优化响应式布局

### 第二阶段（规划中）
- [ ] 集群详情页面优化
- [ ] 实时监控图表集成
- [ ] 集群地图视图
- [ ] 更多过滤和排序选项

### 第三阶段（规划中）
- [ ] 集群性能分析
- [ ] 告警和通知功能
- [ ] 自定义仪表板
- [ ] 多语言支持

## 结论

本次前端设计修改显著提升了集群资源视图的信息密度和用户体验。通过结构化的数据展示、现代化的视觉设计和流畅的交互体验，用户能够更直观地监控和管理多云环境中的集群资源。

后续将继续完善其他页面和功能，构建完整的现代化多云管理界面体系。 
# 开发指南 (Development Guide) - Karmada-Manager 用户体验优化

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期       | 作者      | 变更说明       |
| ------ | ---------- | --------- | -------------- |
| 1.0    | 2024-12-19 | 架构设计师 | 初版开发指南文档 |

### 1.2 文档目的

本文档为Karmada-Dashboard用户体验优化项目的后端和前端开发团队提供详细的开发指导，包括项目结构、编码规范、开发流程、测试策略和部署指南。

### 1.3 相关文档

- `doc/agent/Arch/Arch_Spec.md` - 架构设计文档
- `doc/agent/Arch/API_Spec.md` - API定义文档  
- `doc/agent/Arch/Database_Spec.md` - 数据设计文档

## 2. 项目结构与组织

### 2.1 整体项目结构

```
Karmada-Manager/
├── cmd/                          # 应用程序入口
│   ├── api/                      # Dashboard API服务
│   │   ├── app/                  # 应用逻辑
│   │   │   ├── options/          # 命令行选项
│   │   │   ├── router/           # 路由配置
│   │   │   ├── routes/           # 路由处理器
│   │   │   └── types/            # 类型定义
│   │   └── main.go               # API服务入口
│   ├── metrics-scraper/          # 指标采集服务
│   └── web/                      # Web服务(如需要)
├── pkg/                          # 共享包
│   ├── client/                   # 客户端包
│   ├── common/                   # 通用工具
│   ├── config/                   # 配置管理
│   ├── dataselect/               # 数据选择器
│   └── resource/                 # 资源管理
├── ui/                           # 前端项目
│   ├── apps/dashboard/           # Dashboard应用
│   │   ├── src/                  # 源代码
│   │   │   ├── components/       # 组件
│   │   │   ├── pages/            # 页面
│   │   │   ├── services/         # 服务层
│   │   │   ├── hooks/            # 自定义Hook
│   │   │   ├── utils/            # 工具函数
│   │   │   └── types/            # 类型定义
│   │   ├── locales/              # 国际化资源
│   │   └── package.json          # 依赖配置
│   └── packages/                 # 共享包
├── deploy/                       # 部署配置
├── docs/                         # 文档
└── hack/                         # 构建脚本
```

### 2.2 后端项目结构详解

```
cmd/api/
├── app/
│   ├── options/
│   │   ├── options.go            # 启动选项定义
│   │   └── validation.go         # 选项验证
│   ├── router/
│   │   ├── router.go             # 主路由配置
│   │   └── middleware.go         # 中间件定义
│   ├── routes/                   # 路由处理器目录
│   │   ├── auth/                 # 认证相关路由
│   │   ├── cluster/              # 集群管理路由
│   │   ├── deployment/           # Deployment路由
│   │   ├── service/              # Service路由
│   │   ├── config/               # 配置路由
│   │   ├── namespace/            # 命名空间路由
│   │   ├── overview/             # 概览路由
│   │   ├── propagationpolicy/    # 分发策略路由
│   │   ├── overridepolicy/       # 覆盖策略路由
│   │   └── unstructured/         # 非结构化资源路由
│   └── types/
│       └── api/v1/               # API类型定义
└── main.go                       # 程序入口

pkg/
├── client/
│   ├── manager.go                # 客户端管理器
│   └── factory.go                # 客户端工厂
├── common/
│   ├── errors/                   # 错误处理
│   ├── helpers/                  # 辅助函数
│   └── types/                    # 通用类型
├── config/
│   ├── config.go                 # 配置结构定义
│   └── loader.go                 # 配置加载器
├── dataselect/
│   ├── dataselect.go            # 数据选择逻辑
│   └── sort.go                   # 排序逻辑
└── resource/                     # 资源管理
    ├── common/                   # 通用资源逻辑
    ├── cluster/                  # 集群资源
    ├── deployment/               # Deployment资源
    ├── service/                  # Service资源
    └── ...                       # 其他资源类型
```

### 2.3 前端项目结构详解

```
ui/apps/dashboard/src/
├── components/                   # 组件目录
│   ├── auth/                     # 认证组件
│   ├── error/                    # 错误处理组件
│   ├── icons/                    # 图标组件
│   ├── navigation/               # 导航组件
│   ├── panel/                    # 面板组件
│   ├── tag-list/                 # 标签列表组件
│   └── textarea-with-upload/     # 文本框上传组件
├── pages/                        # 页面组件
│   ├── overview/                 # 概览页面
│   ├── cluster-manage/           # 集群管理
│   ├── multicloud-resource-manage/ # 多云资源管理
│   │   ├── workload/             # 工作负载管理
│   │   ├── service/              # 服务管理
│   │   ├── config/               # 配置管理
│   │   └── namespace/            # 命名空间管理
│   ├── multicloud-policy-manage/ # 多云策略管理
│   │   ├── propagation-policy/   # 分发策略
│   │   └── override-policy/      # 覆盖策略
│   ├── basic-config/             # 基础配置
│   ├── advanced-config/          # 高级配置
│   ├── addon/                    # 插件管理
│   ├── login/                    # 登录页面
│   └── not-found/                # 404页面
├── services/                     # 服务层
│   ├── base.ts                   # 基础HTTP客户端
│   ├── auth.ts                   # 认证服务
│   ├── cluster.ts                # 集群服务
│   ├── workload.ts               # 工作负载服务
│   ├── config.ts                 # 配置服务
│   └── policy.ts                 # 策略服务
├── hooks/                        # 自定义Hook
│   ├── useAuth.ts                # 认证Hook
│   ├── useQuery.ts               # 查询Hook
│   └── useLocalStorage.ts        # 本地存储Hook
├── utils/                        # 工具函数
│   ├── i18n.tsx                  # 国际化工具
│   ├── request.ts                # 请求工具
│   ├── storage.ts                # 存储工具
│   └── validation.ts             # 验证工具
├── types/                        # 类型定义
│   ├── api.ts                    # API类型
│   ├── common.ts                 # 通用类型
│   └── index.ts                  # 类型导出
├── layout/                       # 布局组件
│   ├── index.tsx                 # 主布局
│   └── sidebaroverview/          # 侧边栏概览
├── routes/                       # 路由配置
│   └── index.tsx                 # 路由定义
└── assets/                       # 静态资源
```

## 3. 后端开发指南

### 3.1 开发环境设置

#### 3.1.1 环境要求

```bash
# Go版本要求
go version # >= 1.22.12

# 依赖工具
go install golang.org/x/tools/cmd/goimports@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
go install github.com/swaggo/swag/cmd/swag@latest
```

#### 3.1.2 本地开发启动

```bash
# 1. 设置环境变量
export KARMADA_KUBECONFIG=/path/to/karmada/kubeconfig
export KUBECONFIG=/path/to/member/cluster/kubeconfig

# 2. 启动API服务
cd cmd/api
go run main.go \
  --kubeconfig=${KARMADA_KUBECONFIG} \
  --context=karmada-apiserver \
  --bind-address=0.0.0.0 \
  --secure-port=8000 \
  --auto-generate-certs=false

# 3. 启动指标采集服务
cd cmd/metrics-scraper  
go run main.go \
  --kubeconfig=${KARMADA_KUBECONFIG} \
  --metric-resolution=20s \
  --metric-duration=15m
```

### 3.2 代码结构规范

#### 3.2.1 处理器(Handler)结构

```go
// 处理器结构定义
type DeploymentHandler struct {
    karmadaClient   karmadaclientset.Interface
    kubeClient      kubernetes.Interface
    config          *config.Config
}

// 构造函数
func NewDeploymentHandler(
    karmadaClient karmadaclientset.Interface,
    kubeClient kubernetes.Interface,
    config *config.Config,
) *DeploymentHandler {
    return &DeploymentHandler{
        karmadaClient: karmadaClient,
        kubeClient:    kubeClient,
        config:        config,
    }
}

// HTTP处理方法
func (h *DeploymentHandler) GetDeployments(c *gin.Context) {
    // 1. 参数解析和验证
    query := dataselect.ParseDataSelectPathParameter(c)
    namespace := c.Query("namespace")
    
    // 2. 业务逻辑处理
    result, err := h.getDeployments(namespace, query)
    if err != nil {
        common.HandleError(c, err)
        return
    }
    
    // 3. 响应返回
    c.JSON(http.StatusOK, common.Response{
        Code:    200,
        Message: "success",
        Data:    result,
    })
}

// 业务逻辑方法(私有)
func (h *DeploymentHandler) getDeployments(
    namespace string, 
    query *dataselect.DataSelectQuery,
) (*v1.DeploymentList, error) {
    // 具体实现...
}
```

#### 3.2.2 资源管理器(Resource)结构

```go
// 资源管理器接口
type DeploymentResourceManager interface {
    GetDeployments(namespace string, query *dataselect.DataSelectQuery) (*v1.DeploymentList, error)
    GetDeployment(namespace, name string) (*v1.Deployment, error)
    CreateDeployment(deployment *v1.DeploymentSpec) (*v1.Deployment, error)
    UpdateDeployment(namespace, name string, deployment *v1.DeploymentSpec) (*v1.Deployment, error)
    DeleteDeployment(namespace, name string) error
    ScaleDeployment(namespace, name string, replicas int32) error
}

// 资源管理器实现
type deploymentResourceManager struct {
    karmadaClient karmadaclientset.Interface
    kubeClient    kubernetes.Interface
}

func NewDeploymentResourceManager(
    karmadaClient karmadaclientset.Interface,
    kubeClient kubernetes.Interface,
) DeploymentResourceManager {
    return &deploymentResourceManager{
        karmadaClient: karmadaClient,
        kubeClient:    kubeClient,
    }
}

func (r *deploymentResourceManager) GetDeployments(
    namespace string, 
    query *dataselect.DataSelectQuery,
) (*v1.DeploymentList, error) {
    // 1. 从Karmada API获取Deployment列表
    deployments, err := r.karmadaClient.AppsV1().
        Deployments(namespace).
        List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return nil, err
    }
    
    // 2. 数据转换和聚合
    result := &v1.DeploymentList{
        Deployments: make([]v1.Deployment, 0),
        TotalItems:  len(deployments.Items),
    }
    
    for _, deploy := range deployments.Items {
        item := r.convertToDeploymentModel(&deploy)
        result.Deployments = append(result.Deployments, *item)
    }
    
    // 3. 数据选择和排序
    result.Deployments = dataselect.GenericDataSelect(
        result.Deployments, query).Items
    
    return result, nil
}
```

#### 3.2.3 错误处理规范

```go
// 自定义错误类型
type APIError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

func (e *APIError) Error() string {
    return e.Message
}

// 错误构造函数
func NewBadRequestError(message string) *APIError {
    return &APIError{
        Code:    400,
        Message: message,
    }
}

func NewNotFoundError(resource, name string) *APIError {
    return &APIError{
        Code:    404,
        Message: fmt.Sprintf("%s '%s' not found", resource, name),
    }
}

func NewInternalError(err error) *APIError {
    return &APIError{
        Code:    500,
        Message: "Internal server error",
        Details: err.Error(),
    }
}

// 错误处理中间件
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        if len(c.Errors) > 0 {
            err := c.Errors.Last().Err
            
            var apiErr *APIError
            if errors.As(err, &apiErr) {
                c.JSON(apiErr.Code, common.Response{
                    Code:    apiErr.Code,
                    Message: apiErr.Message,
                    Data:    apiErr.Details,
                })
            } else {
                c.JSON(500, common.Response{
                    Code:    500,
                    Message: "Internal server error",
                    Data:    err.Error(),
                })
            }
            
            c.Abort()
        }
    }
}
```

### 3.3 数据库操作规范

#### 3.3.1 GORM模型定义

```go
// 模型定义
type DashboardConfig struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Key         string    `gorm:"uniqueIndex;size:255;not null" json:"key"`
    Value       string    `gorm:"type:text" json:"value"`
    Type        string    `gorm:"size:50;default:string" json:"type"`
    Description string    `gorm:"type:text" json:"description"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

func (DashboardConfig) TableName() string {
    return "dashboard_config"
}

// 仓储接口
type ConfigRepository interface {
    GetConfig(key string) (*DashboardConfig, error)
    SetConfig(key, value, valueType string) error
    GetAllConfigs() ([]DashboardConfig, error)
    DeleteConfig(key string) error
}

// 仓储实现
type configRepository struct {
    db *gorm.DB
}

func NewConfigRepository(db *gorm.DB) ConfigRepository {
    return &configRepository{db: db}
}

func (r *configRepository) GetConfig(key string) (*DashboardConfig, error) {
    var config DashboardConfig
    err := r.db.Where("key = ?", key).First(&config).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, NewNotFoundError("config", key)
        }
        return nil, NewInternalError(err)
    }
    return &config, nil
}

func (r *configRepository) SetConfig(key, value, valueType string) error {
    config := DashboardConfig{
        Key:   key,
        Value: value,
        Type:  valueType,
    }
    
    return r.db.Save(&config).Error
}
```

### 3.4 日志处理规范

```go
import (
    "k8s.io/klog/v2"
)

// 日志级别使用
func (h *DeploymentHandler) GetDeployments(c *gin.Context) {
    namespace := c.Query("namespace")
    
    // Info级别 - 正常操作日志
    klog.InfoS("Getting deployments", 
        "namespace", namespace,
        "user", c.GetString("username"))
    
    result, err := h.getDeployments(namespace, query)
    if err != nil {
        // Error级别 - 错误日志
        klog.ErrorS(err, "Failed to get deployments",
            "namespace", namespace)
        common.HandleError(c, err)
        return
    }
    
    // V级别 - 调试日志
    klog.V(2).InfoS("Successfully retrieved deployments",
        "namespace", namespace,
        "count", len(result.Deployments))
    
    c.JSON(http.StatusOK, result)
}
```

### 3.5 测试规范

#### 3.5.1 单元测试

```go
// deployment_test.go
package deployment_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "your-project/pkg/resource/deployment"
)

// Mock对象
type MockKarmadaClient struct {
    mock.Mock
}

func (m *MockKarmadaClient) AppsV1() *mock.Mock {
    args := m.Called()
    return args.Get(0).(*mock.Mock)
}

// 测试用例
func TestGetDeployments(t *testing.T) {
    // 准备
    mockClient := new(MockKarmadaClient)
    manager := deployment.NewDeploymentResourceManager(mockClient, nil)
    
    // 设置mock行为
    mockClient.On("AppsV1").Return(&mock.Mock{})
    
    // 执行
    result, err := manager.GetDeployments("default", nil)
    
    // 验证
    assert.NoError(t, err)
    assert.NotNil(t, result)
    mockClient.AssertExpectations(t)
}

func TestGetDeployment_NotFound(t *testing.T) {
    // 测试资源不存在的情况
    mockClient := new(MockKarmadaClient)
    manager := deployment.NewDeploymentResourceManager(mockClient, nil)
    
    // 设置mock返回错误
    mockClient.On("AppsV1").Return(errors.New("not found"))
    
    result, err := manager.GetDeployment("default", "non-existent")
    
    assert.Error(t, err)
    assert.Nil(t, result)
}
```

#### 3.5.2 集成测试

```go
// integration_test.go
func TestDeploymentIntegration(t *testing.T) {
    // 需要真实的Karmada环境
    if testing.Short() {
        t.Skip("skipping integration test")
    }
    
    // 设置测试环境
    config := setupTestConfig(t)
    client := setupTestClient(t, config)
    
    // 创建测试资源
    deployment := createTestDeployment()
    created, err := client.CreateDeployment(deployment)
    assert.NoError(t, err)
    
    // 清理资源
    defer func() {
        err := client.DeleteDeployment(created.Namespace, created.Name)
        assert.NoError(t, err)
    }()
    
    // 验证创建成功
    retrieved, err := client.GetDeployment(created.Namespace, created.Name)
    assert.NoError(t, err)
    assert.Equal(t, created.Name, retrieved.Name)
}
```

## 4. 前端开发指南

### 4.1 开发环境设置

#### 4.1.1 环境要求

```bash
# Node.js版本要求
node --version # >= 18.14.0

# 包管理器
npm install -g pnpm@9.1.2

# 开发工具
npm install -g @antfu/eslint-config
npm install -g prettier
npm install -g typescript
```

#### 4.1.2 本地开发启动

```bash
# 1. 安装依赖
cd ui
pnpm install

# 2. 启动开发服务器
cd apps/dashboard
pnpm dev

# 3. 构建生产版本
pnpm build

# 4. 预览生产版本
pnpm preview
```

### 4.2 组件开发规范

#### 4.2.1 函数组件结构

```typescript
// DeploymentList.tsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type { Deployment, DataSelectQuery } from '@/types/api';
import { deploymentService } from '@/services/workload';
import { DeploymentForm } from './DeploymentForm';

// 组件属性类型
interface DeploymentListProps {
  namespace?: string;
  onSelect?: (deployment: Deployment) => void;
}

// 主组件
export const DeploymentList: React.FC<DeploymentListProps> = ({
  namespace,
  onSelect
}) => {
  const { t } = useTranslation();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  // 数据查询
  const {
    data: deployments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['deployments', namespace],
    queryFn: () => deploymentService.getDeployments({ namespace }),
    refetchInterval: 30000, // 30秒自动刷新
  });
  
  // 表格列定义
  const columns: ColumnsType<Deployment> = [
    {
      title: t('common.name'),
      dataIndex: ['objectMeta', 'name'],
      key: 'name',
      sorter: true,
      render: (name: string) => (
        <Button type="link" onClick={() => handleViewDetail(name)}>
          {name}
        </Button>
      ),
    },
    {
      title: t('common.namespace'),
      dataIndex: ['objectMeta', 'namespace'],
      key: 'namespace',
    },
    {
      title: t('workload.replicas'),
      dataIndex: ['status', 'replicas'],
      key: 'replicas',
      render: (replicas: number, record: Deployment) => (
        <span>
          {record.status.readyReplicas}/{replicas}
        </span>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: ['dashboardInfo', 'status'],
      key: 'status',
      render: (status: string) => (
        <span className={`status-${status.toLowerCase()}`}>
          {t(`status.${status.toLowerCase()}`)}
        </span>
      ),
    },
    {
      title: t('common.creationTime'),
      dataIndex: ['objectMeta', 'creationTimestamp'],
      key: 'creationTime',
      render: (time: string) => new Date(time).toLocaleDateString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record: Deployment) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button 
            size="small" 
            danger 
            onClick={() => handleDelete(record)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];
  
  // 事件处理函数
  const handleViewDetail = (name: string) => {
    // 导航到详情页面
  };
  
  const handleEdit = (deployment: Deployment) => {
    setIsFormVisible(true);
  };
  
  const handleDelete = async (deployment: Deployment) => {
    try {
      await deploymentService.deleteDeployment(
        deployment.objectMeta.namespace,
        deployment.objectMeta.name
      );
      message.success(t('messages.deleteSuccess'));
      refetch();
    } catch (error) {
      message.error(t('messages.deleteFailed'));
    }
  };
  
  const handleCreate = () => {
    setIsFormVisible(true);
  };
  
  const handleFormSubmit = async (values: any) => {
    try {
      await deploymentService.createDeployment(values);
      message.success(t('messages.createSuccess'));
      setIsFormVisible(false);
      refetch();
    } catch (error) {
      message.error(t('messages.createFailed'));
    }
  };
  
  // 错误处理
  if (error) {
    return (
      <div className="error-container">
        <p>{t('messages.loadFailed')}</p>
        <Button onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="deployment-list">
      <div className="list-header">
        <h2>{t('workload.deployments')}</h2>
        <Button type="primary" onClick={handleCreate}>
          {t('workload.createDeployment')}
        </Button>
      </div>
      
      <Table
        dataSource={deployments?.deployments}
        columns={columns}
        loading={isLoading}
        rowKey={(record) => record.objectMeta.uid}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          total: deployments?.totalItems,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
      
      {isFormVisible && (
        <DeploymentForm
          visible={isFormVisible}
          onCancel={() => setIsFormVisible(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
};
```

#### 4.2.2 表单组件结构

```typescript
// DeploymentForm.tsx
import React from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Switch,
  Tabs 
} from 'antd';
import { useTranslation } from 'react-i18next';
import type { DeploymentSpec } from '@/types/api';

interface DeploymentFormProps {
  visible: boolean;
  initialValues?: Partial<DeploymentSpec>;
  onCancel: () => void;
  onSubmit: (values: DeploymentSpec) => Promise<void>;
}

export const DeploymentForm: React.FC<DeploymentFormProps> = ({
  visible,
  initialValues,
  onCancel,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      await onSubmit(values);
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title={t('workload.createDeployment')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
      >
        <Tabs defaultActiveKey="basic">
          <Tabs.TabPane key="basic" tab={t('common.basicInfo')}>
            <Form.Item
              name="name"
              label={t('common.name')}
              rules={[
                { required: true, message: t('validation.required') },
                { 
                  pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, 
                  message: t('validation.invalidName') 
                }
              ]}
            >
              <Input placeholder={t('placeholders.enterName')} />
            </Form.Item>
            
            <Form.Item
              name="namespace"
              label={t('common.namespace')}
              rules={[{ required: true, message: t('validation.required') }]}
            >
              <Select placeholder={t('placeholders.selectNamespace')}>
                {/* 动态加载命名空间选项 */}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="replicas"
              label={t('workload.replicas')}
              rules={[{ required: true, message: t('validation.required') }]}
            >
              <InputNumber min={1} max={100} />
            </Form.Item>
          </Tabs.TabPane>
          
          <Tabs.TabPane key="container" tab={t('workload.container')}>
            <Form.Item
              name={['spec', 'template', 'spec', 'containers', 0, 'name']}
              label={t('workload.containerName')}
              rules={[{ required: true, message: t('validation.required') }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name={['spec', 'template', 'spec', 'containers', 0, 'image']}
              label={t('workload.image')}
              rules={[{ required: true, message: t('validation.required') }]}
            >
              <Input placeholder="nginx:latest" />
            </Form.Item>
          </Tabs.TabPane>
          
          <Tabs.TabPane key="policy" tab={t('policy.propagation')}>
            <Form.Item
              name={['propagationPolicy', 'create']}
              valuePropName="checked"
            >
              <Switch />
              <span className="ml-2">
                {t('policy.createPropagationPolicy')}
              </span>
            </Form.Item>
            
            <Form.Item
              name={['propagationPolicy', 'name']}
              label={t('policy.policyName')}
              dependencies={[['propagationPolicy', 'create']]}
              rules={[
                ({ getFieldValue }) => ({
                  required: getFieldValue(['propagationPolicy', 'create']),
                  message: t('validation.required')
                })
              ]}
            >
              <Input />
            </Form.Item>
          </Tabs.TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};
```

### 4.3 服务层开发规范

#### 4.3.1 HTTP客户端封装

```typescript
// services/base.ts
import axios, { 
  AxiosInstance, 
  AxiosResponse, 
  AxiosError 
} from 'axios';
import { message } from 'antd';
import type { IResponse } from '@/types/api';

class HttpClient {
  private instance: AxiosInstance;
  
  constructor() {
    this.instance = axios.create({
      baseURL: '/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<IResponse>) => {
        const { data } = response;
        
        // 检查业务状态码
        if (data.code !== 200) {
          message.error(data.message);
          return Promise.reject(new Error(data.message));
        }
        
        return data;
      },
      (error: AxiosError<IResponse>) => {
        // 处理HTTP错误
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }
  
  private handleError(error: AxiosError<IResponse>) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          message.error('认证失败，请重新登录');
          // 清除token并跳转到登录页
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          message.error('权限不足');
          break;
        case 404:
          message.error('资源不存在');
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(data?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络连接失败');
    } else {
      message.error('请求配置错误');
    }
  }
  
  // 通用HTTP方法
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.instance.get(url, { params });
    return response.data;
  }
  
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post(url, data);
    return response.data;
  }
  
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put(url, data);
    return response.data;
  }
  
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.instance.delete(url);
    return response.data;
  }
}

export const httpClient = new HttpClient();
```

#### 4.3.2 业务服务实现

```typescript
// services/workload.ts
import type { 
  DeploymentList, 
  Deployment, 
  DeploymentSpec,
  DataSelectQuery 
} from '@/types/api';
import { httpClient } from './base';

class WorkloadService {
  // 获取Deployment列表
  async getDeployments(query?: {
    namespace?: string;
  } & DataSelectQuery): Promise<DeploymentList> {
    const params = new URLSearchParams();
    
    if (query?.namespace) {
      params.append('namespace', query.namespace);
    }
    if (query?.filterBy) {
      query.filterBy.forEach(filter => {
        params.append('filterBy', filter);
      });
    }
    if (query?.sortBy) {
      query.sortBy.forEach(sort => {
        params.append('sortBy', sort);
      });
    }
    if (query?.itemsPerPage) {
      params.append('itemsPerPage', query.itemsPerPage.toString());
    }
    if (query?.page) {
      params.append('page', query.page.toString());
    }
    
    return httpClient.get<DeploymentList>(
      `/deployments?${params.toString()}`
    );
  }
  
  // 获取单个Deployment
  async getDeployment(
    namespace: string, 
    name: string
  ): Promise<Deployment> {
    return httpClient.get<Deployment>(
      `/deployments/${namespace}/${name}`
    );
  }
  
  // 创建Deployment
  async createDeployment(
    deployment: DeploymentSpec
  ): Promise<Deployment> {
    return httpClient.post<Deployment>('/deployments', deployment);
  }
  
  // 更新Deployment
  async updateDeployment(
    namespace: string,
    name: string,
    deployment: DeploymentSpec
  ): Promise<Deployment> {
    return httpClient.put<Deployment>(
      `/deployments/${namespace}/${name}`,
      deployment
    );
  }
  
  // 删除Deployment
  async deleteDeployment(
    namespace: string, 
    name: string
  ): Promise<void> {
    return httpClient.delete(`/deployments/${namespace}/${name}`);
  }
  
  // 扩缩容Deployment
  async scaleDeployment(
    namespace: string,
    name: string,
    replicas: number
  ): Promise<void> {
    return httpClient.post(
      `/deployments/${namespace}/${name}/scale`,
      { replicas }
    );
  }
}

export const workloadService = new WorkloadService();
```

### 4.4 状态管理规范

#### 4.4.1 Zustand Store

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: string[];
}

interface AuthActions {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // 状态
      user: null,
      token: null,
      isAuthenticated: false,
      permissions: [],
      
      // 操作
      login: (token: string, user: User) => {
        localStorage.setItem('auth_token', token);
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          permissions: [],
        });
      },
      
      updateUser: (user: User) => {
        set({ user });
      },
      
      setPermissions: (permissions: string[]) => {
        set({ permissions });
      },
      
      hasPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission) || 
               permissions.includes('*');
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

#### 4.4.2 自定义Hooks

```typescript
// hooks/useAuth.ts
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { useQuery } from '@tanstack/react-query';

export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    permissions,
    login,
    logout,
    hasPermission
  } = useAuthStore();
  
  // 获取用户信息
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getCurrentUser,
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
  
  return {
    user: userInfo || user,
    token,
    isAuthenticated,
    permissions,
    isLoading,
    login,
    logout,
    hasPermission,
  };
};

// hooks/usePermission.ts
import { useAuth } from './useAuth';

export const usePermission = (permission: string) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };
  
  return [storedValue, setValue];
};
```

### 4.5 样式和主题规范

#### 4.5.1 Tailwind CSS配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // 避免与Ant Design冲突
  },
};
```

#### 4.5.2 样式组织

```scss
// styles/global.scss
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

// 全局样式
.app {
  min-height: 100vh;
  background-color: #f5f5f5;
}

// 组件样式
.deployment-list {
  .list-header {
    @apply flex justify-between items-center mb-4;
    
    h2 {
      @apply text-xl font-semibold text-gray-800;
    }
  }
  
  .error-container {
    @apply flex flex-col items-center justify-center py-8;
  }
}

// 状态样式
.status-running {
  @apply text-green-600 font-medium;
}

.status-pending {
  @apply text-yellow-600 font-medium;
}

.status-failed {
  @apply text-red-600 font-medium;
}

.status-unknown {
  @apply text-gray-600 font-medium;
}
```

## 5. 国际化开发规范

### 5.1 i18next配置

```typescript
// utils/i18n.tsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源
import zhCN from '../locales/zh-CN.json';
import enUS from '../locales/en-US.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    fallbackLng: 'zh-CN',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### 5.2 语言资源结构

```json
// locales/zh-CN.json
{
  "common": {
    "name": "名称",
    "namespace": "命名空间",
    "status": "状态",
    "actions": "操作",
    "creationTime": "创建时间",
    "edit": "编辑",
    "delete": "删除",
    "create": "创建",
    "cancel": "取消",
    "confirm": "确认",
    "retry": "重试",
    "basicInfo": "基本信息"
  },
  "workload": {
    "deployments": "Deployment",
    "services": "Service",
    "createDeployment": "创建Deployment",
    "replicas": "副本数",
    "container": "容器",
    "containerName": "容器名称",
    "image": "镜像"
  },
  "policy": {
    "propagation": "分发策略",
    "override": "覆盖策略",
    "createPropagationPolicy": "创建分发策略",
    "policyName": "策略名称"
  },
  "status": {
    "running": "运行中",
    "pending": "等待中",
    "failed": "失败",
    "unknown": "未知"
  },
  "messages": {
    "loadFailed": "加载失败",
    "createSuccess": "创建成功",
    "createFailed": "创建失败",
    "deleteSuccess": "删除成功",
    "deleteFailed": "删除失败"
  },
  "validation": {
    "required": "此项为必填项",
    "invalidName": "名称格式不正确"
  },
  "placeholders": {
    "enterName": "请输入名称",
    "selectNamespace": "请选择命名空间"
  }
}
```

### 5.3 自动化国际化工具

```typescript
// packages/i18n-tool/src/scan/index.ts
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface I18nKey {
  key: string;
  defaultValue: string;
  file: string;
  line: number;
}

class I18nScanner {
  private keys: Map<string, I18nKey> = new Map();
  
  async scanFiles(pattern: string): Promise<I18nKey[]> {
    const files = await glob(pattern);
    
    for (const file of files) {
      await this.scanFile(file);
    }
    
    return Array.from(this.keys.values());
  }
  
  private async scanFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 匹配 t('key') 或 t("key") 模式
      const matches = line.matchAll(/t\(['"]([^'"]+)['"]\)/g);
      
      for (const match of matches) {
        const key = match[1];
        
        if (!this.keys.has(key)) {
          this.keys.set(key, {
            key,
            defaultValue: key, // 默认使用key作为值
            file: filePath,
            line: index + 1,
          });
        }
      }
    });
  }
  
  generateTranslationFile(keys: I18nKey[], outputPath: string): void {
    const translations: Record<string, any> = {};
    
    keys.forEach(({ key, defaultValue }) => {
      const keyParts = key.split('.');
      let current = translations;
      
      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      const finalKey = keyParts[keyParts.length - 1];
      if (!current[finalKey]) {
        current[finalKey] = defaultValue;
      }
    });
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify(translations, null, 2),
      'utf-8'
    );
  }
}

// 使用示例
const scanner = new I18nScanner();
scanner.scanFiles('src/**/*.{ts,tsx}').then(keys => {
  scanner.generateTranslationFile(keys, 'locales/zh-CN.json');
});
```

## 6. 代码质量保证

### 6.1 ESLint配置

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@antfu',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    // React相关规则
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // TypeScript相关规则
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // 通用规则
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
```

### 6.2 Prettier配置

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  bracketSameLine: false,
};
```

### 6.3 Git Hooks配置

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,md}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

### 6.4 测试规范

#### 6.4.1 前端单元测试

```typescript
// components/__tests__/DeploymentList.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { DeploymentList } from '../DeploymentList';
import { workloadService } from '@/services/workload';

// Mock服务
vi.mock('@/services/workload');

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('DeploymentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render deployment list', async () => {
    const mockDeployments = {
      deployments: [
        {
          objectMeta: {
            name: 'test-deployment',
            namespace: 'default',
            uid: 'test-uid',
            creationTimestamp: '2024-01-01T00:00:00Z',
          },
          status: {
            replicas: 3,
            readyReplicas: 3,
          },
          dashboardInfo: {
            status: 'Running',
          },
        },
      ],
      totalItems: 1,
    };
    
    vi.mocked(workloadService.getDeployments).mockResolvedValue(mockDeployments);
    
    renderWithProviders(<DeploymentList />);
    
    await waitFor(() => {
      expect(screen.getByText('test-deployment')).toBeInTheDocument();
      expect(screen.getByText('3/3')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });
  
  it('should handle delete deployment', async () => {
    const mockDeployments = {
      deployments: [
        {
          objectMeta: {
            name: 'test-deployment',
            namespace: 'default',
            uid: 'test-uid',
          },
          status: { replicas: 3, readyReplicas: 3 },
          dashboardInfo: { status: 'Running' },
        },
      ],
      totalItems: 1,
    };
    
    vi.mocked(workloadService.getDeployments).mockResolvedValue(mockDeployments);
    vi.mocked(workloadService.deleteDeployment).mockResolvedValue();
    
    renderWithProviders(<DeploymentList />);
    
    await waitFor(() => {
      expect(screen.getByText('test-deployment')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByText('删除');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(workloadService.deleteDeployment).toHaveBeenCalledWith(
        'default',
        'test-deployment'
      );
    });
  });
});
```

#### 6.4.2 E2E测试

```typescript
// e2e/deployment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Deployment Management', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    
    // 等待跳转到主页
    await page.waitForURL('/');
  });
  
  test('should create deployment', async ({ page }) => {
    // 导航到工作负载管理页面
    await page.click('text=工作负载管理');
    await page.click('text=Deployment');
    
    // 点击创建按钮
    await page.click('text=创建Deployment');
    
    // 填写表单
    await page.fill('input[name="name"]', 'test-deployment');
    await page.selectOption('select[name="namespace"]', 'default');
    await page.fill('input[name="replicas"]', '3');
    await page.fill('input[name="spec.template.spec.containers.0.name"]', 'nginx');
    await page.fill('input[name="spec.template.spec.containers.0.image"]', 'nginx:latest');
    
    // 提交表单
    await page.click('text=确认');
    
    // 验证创建成功
    await expect(page.locator('text=创建成功')).toBeVisible();
    await expect(page.locator('text=test-deployment')).toBeVisible();
  });
  
  test('should delete deployment', async ({ page }) => {
    // 导航到Deployment列表
    await page.goto('/workload/deployments');
    
    // 找到要删除的deployment
    const row = page.locator('tr:has-text("test-deployment")');
    await row.locator('text=删除').click();
    
    // 确认删除
    await page.click('text=确认');
    
    // 验证删除成功
    await expect(page.locator('text=删除成功')).toBeVisible();
    await expect(page.locator('text=test-deployment')).not.toBeVisible();
  });
});
```

## 7. 构建与部署

### 7.1 Docker镜像构建

```dockerfile
# 多阶段构建Dockerfile
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY ui/package.json ui/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY ui/ .
RUN pnpm build

FROM golang:1.22-alpine AS backend-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o karmada-dashboard-api cmd/api/main.go
RUN go build -o karmada-metrics-scraper cmd/metrics-scraper/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

COPY --from=backend-builder /app/karmada-dashboard-api .
COPY --from=backend-builder /app/karmada-metrics-scraper .
COPY --from=frontend-builder /app/dist ./ui

EXPOSE 8000 8080

CMD ["./karmada-dashboard-api"]
```

### 7.2 Makefile构建脚本

```makefile
# Makefile
.PHONY: build test clean docker-build docker-push

# 变量定义
APP_NAME := karmada-dashboard
VERSION := $(shell git describe --tags --always)
BUILD_TIME := $(shell date +%Y-%m-%dT%H:%M:%S%z)
IMAGE_REPO := karmada/dashboard

# Go构建参数
LDFLAGS := -X main.version=$(VERSION) \
          -X main.buildTime=$(BUILD_TIME)

# 安装依赖
deps:
	go mod download
	cd ui && pnpm install

# 代码检查
lint:
	golangci-lint run
	cd ui && pnpm lint

# 运行测试
test:
	go test -v ./...
	cd ui && pnpm test

# 构建后端
build-api:
	CGO_ENABLED=0 GOOS=linux go build \
		-ldflags "$(LDFLAGS)" \
		-o _output/bin/linux/amd64/karmada-dashboard-api \
		cmd/api/main.go

build-metrics-scraper:
	CGO_ENABLED=0 GOOS=linux go build \
		-ldflags "$(LDFLAGS)" \
		-o _output/bin/linux/amd64/karmada-metrics-scraper \
		cmd/metrics-scraper/main.go

# 构建前端
build-ui:
	cd ui && pnpm build

# 完整构建
build: build-api build-metrics-scraper build-ui

# Docker镜像构建
docker-build:
	docker build -t $(IMAGE_REPO):$(VERSION) .
	docker tag $(IMAGE_REPO):$(VERSION) $(IMAGE_REPO):latest

# Docker镜像推送
docker-push:
	docker push $(IMAGE_REPO):$(VERSION)
	docker push $(IMAGE_REPO):latest

# 清理
clean:
	rm -rf _output
	rm -rf ui/dist
	docker image prune -f
```

### 7.3 CI/CD流水线

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Go
      uses: actions/setup-go@v3
      with:
        go-version: '1.22'
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install pnpm
      run: npm install -g pnpm
    
    - name: Install dependencies
      run: |
        go mod download
        cd ui && pnpm install
    
    - name: Run Go tests
      run: go test -v ./...
    
    - name: Run frontend tests
      run: cd ui && pnpm test
    
    - name: Run linting
      run: |
        golangci-lint run
        cd ui && pnpm lint

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v3
      with:
        context: .
        push: true
        tags: |
          karmada/dashboard:latest
          karmada/dashboard:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        # 部署到测试环境的脚本
        echo "Deploying to staging environment..."
        
    - name: Run E2E tests
      run: |
        # 运行端到端测试
        echo "Running E2E tests..."
        
    - name: Deploy to production
      if: success()
      run: |
        # 部署到生产环境的脚本
        echo "Deploying to production environment..."
```

这份开发指南为Karmada-Dashboard项目的后端和前端开发团队提供了全面的开发指导，涵盖了项目结构、编码规范、测试策略、构建部署等各个方面，确保开发工作的高效进行和代码质量的保证。 
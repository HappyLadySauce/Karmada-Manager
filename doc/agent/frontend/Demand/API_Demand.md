# 前端API需求文档

## 概述

本文档详细列出了Karmada Dashboard前端应用所需的后端API接口。这些接口是实现完整的多云管理功能的关键依赖。

## **🚨 新增紧急需求接口（最高优先级）**

### 系统事件告警真实数据接口

**当前问题**: 前端概览页面的系统事件告警组件目前使用模拟数据显示，无法提供真实的系统事件信息。

**接口**: `GET /api/v1/events/recent`

**描述**: 获取真实的系统事件和告警信息，替换当前的模拟数据

**参数**:
```json
{
  "limit": 20,
  "severity": "info|warning|error",  // 可选，严重程度过滤
  "source": "string",                // 可选，事件源过滤
  "startTime": "2024-01-15T10:00:00Z", // 可选，开始时间
  "endTime": "2024-01-15T11:00:00Z"   // 可选，结束时间
}
```

**期望响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "events": [
      {
        "id": "event-001",
        "timestamp": "2024-01-15T10:30:00Z",
        "type": "Warning|Error|Info",
        "source": "cluster-beijing|karmada-controller|etcd|node-xxx",
        "message": "具体的事件描述信息",
        "severity": "low|medium|high",
        "category": "resource|policy|network|storage|scheduling",
        "details": {
          "node": "node-001",
          "cpuUsage": 85.5,
          "memoryUsage": 78.2
          // 其他相关详细信息
        }
      }
    ],
    "total": 125
  }
}
```

**关键字段说明**:
- `type`: 事件类型（Warning、Error、Info）
- `source`: 事件来源（集群名、组件名、节点名等）
- `severity`: 严重程度（low、medium、high）
- `category`: 事件分类（resource、policy、network、storage、scheduling）
- `details`: 事件相关的详细信息，根据不同类型事件包含不同字段

**业务需求**:
1. 显示系统中真实发生的各类事件
2. 支持按严重程度和来源过滤
3. 提供事件详细信息用于问题诊断
4. 支持分页和时间范围查询
5. 实时更新（建议1分钟刷新间隔）

**用途**: 
- 概览页面系统事件告警卡片显示
- 系统监控和故障诊断
- 运维人员及时获取系统状态变化

### 系统健康状态真实数据接口

**当前问题**: 前端概览页面的系统健康状态组件目前也使用模拟数据显示，无法提供真实的系统健康状态信息。

**接口**: `GET /api/v1/health/detailed`

**描述**: 获取真实的系统健康状态信息，替换当前的模拟数据

**期望响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "overall": "healthy|warning|error",
    "components": [
      {
        "name": "karmada-apiserver",
        "status": "healthy|warning|error",
        "message": "API服务器运行正常",
        "lastCheck": "2024-01-15T10:30:00Z"
      },
      {
        "name": "karmada-controller-manager",
        "status": "healthy|warning|error",
        "message": "控制器管理器运行正常",
        "lastCheck": "2024-01-15T10:30:00Z"
      }
    ],
    "dependencies": [
      {
        "name": "etcd",
        "status": "healthy|warning|error",
        "latency": "2ms",
        "message": "数据存储服务正常"
      },
      {
        "name": "member-clusters",
        "status": "healthy|warning|error",
        "message": "3/3 集群健康",
        "details": {
          "healthy": ["cluster-beijing", "cluster-shanghai", "cluster-shenzhen"],
          "unhealthy": []
        }
      }
    ]
  }
}
```

**关键字段说明**:
- `overall`: 系统整体健康状态
- `components`: 各个系统组件的健康状态
- `dependencies`: 依赖服务的健康状态
- `latency`: 服务响应延迟
- `details`: 详细的健康状态信息

**业务需求**:
1. 显示系统各组件的真实健康状态
2. 提供系统依赖服务的监控信息
3. 支持实时健康状态检查
4. 提供故障诊断所需的详细信息

**用途**: 
- 概览页面系统健康状态卡片显示
- 系统运维监控
- 故障快速定位和诊断

---

## 紧急需求接口（高优先级）

### 1. 概览页面 - 集群资源视图接口

**接口**: `GET /api/v1/scheduling/clusters/resources`

**描述**: 获取所有集群的详细资源信息，用于展示集群资源视图

**参数**:
```json
{
  "page": 1,
  "limit": 100
}
```

**期望响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clusters": [
      {
        "name": "cluster-beijing",
        "region": "beijing",
        "zone": "zone-a",
        "status": "Ready",
        "resources": {
          "cpu": {
            "capacity": 1000,
            "allocatable": 950,
            "allocated": 600
          },
          "memory": {
            "capacity": 2048000,
            "allocatable": 1948000,
            "allocated": 1024000
          },
          "pod": {
            "capacity": 110,
            "allocatable": 110,
            "allocated": 65
          }
        },
        "labels": {
          "region": "beijing",
          "env": "production",
          "zone": "a"
        },
        "taints": [
          {
            "key": "special",
            "value": "gpu",
            "effect": "NoSchedule"
          }
        ],
        "loadLevel": "medium",
        "nodeCount": 12,
        "podCount": 256,
        "availability": 98
      }
    ]
  }
}
```

**用途**: 
- 在概览页面底部展示集群资源视图
- 显示每个集群的状态、资源使用情况、标签和污点信息
- 提供实时的多云环境监控能力

### 2. 可视化调度配置接口

**接口**: `GET /api/v1/scheduling/visual/clusters`

**描述**: 获取用于可视化调度配置的集群信息

**期望响应**:
```json
{
  "code": 200,
  "data": {
    "clusters": [
      {
        "name": "cluster1",
        "displayName": "北京集群",
        "region": "beijing",
        "zone": "zone-a",
        "status": "Ready",
        "resources": {
          "cpu": { "total": 1000, "used": 600, "available": 400 },
          "memory": { "total": 2048000, "used": 1024000, "available": 1024000 },
          "nodes": { "total": 12, "ready": 12 }
        },
        "labels": {
          "region": "beijing",
          "env": "production"
        },
        "capabilities": ["gpu", "ssd-storage"]
      }
    ]
  }
}
```

**接口**: `POST /api/v1/scheduling/visual/simulate`

**描述**: 模拟调度策略，预测资源分配结果

**请求体**:
```json
{
  "workload": {
    "kind": "Deployment",
    "replicas": 6,
    "resources": {
      "cpu": "100m",
      "memory": "128Mi"
    }
  },
  "clusters": ["cluster-beijing", "cluster-shanghai"],
  "strategy": "Divided",
  "weights": {
    "cluster-beijing": 2,
    "cluster-shanghai": 1
  }
}
```

**期望响应**:
```json
{
  "code": 200,
  "data": {
    "allocation": [
      {
        "clusterName": "cluster-beijing",
        "replicas": 4,
        "reason": "按权重分配，权重比例2:1"
      },
      {
        "clusterName": "cluster-shanghai", 
        "replicas": 2,
        "reason": "按权重分配，权重比例2:1"
      }
    ],
    "warnings": [],
    "feasible": true
  }
}
```

## 已有接口的增强需求

### 1. 概览接口增强

**当前接口**: `GET /api/v1/overview`

**增强需求**: 返回数据中需要包含更详细的版本信息和运行时间

**期望增强**:
```json
{
  "data": {
    "karmadaInfo": {
      "version": {
        "gitVersion": "v1.8.0",
        "gitCommit": "abc123def",
        "buildDate": "2024-01-15T10:30:00Z"
      },
      "status": "running",
      "createTime": "2024-01-01T00:00:00Z",
      "uptime": "720h30m45s"
    }
  }
}
```

### 2. 集群管理接口增强

**当前接口**: `GET /api/v1/cluster`

**增强需求**: 需要包含集群的地理位置信息和更详细的资源状态

## 中优先级接口需求

### 1. 实时监控接口

**接口**: `GET /api/v1/monitoring/realtime`

**描述**: 获取实时监控数据，支持WebSocket或SSE

**用途**: 
- 实现30秒自动刷新
- 提供实时的资源使用率变化
- 集群状态变更通知

### 2. 策略模板接口

**接口**: `GET /api/v1/policy/templates`

**描述**: 获取预定义的策略模板

**接口**: `POST /api/v1/policy/validate-yaml`

**描述**: 验证用户输入的策略YAML格式

## 低优先级接口需求

### 1. 用户偏好设置

**接口**: `GET/PUT /api/v1/user/preferences`

**描述**: 保存用户的界面偏好设置（主题、语言等）

### 2. 审计日志

**接口**: `GET /api/v1/audit/logs`

**描述**: 获取用户操作的审计日志

### 3. 系统健康检查

**接口**: `GET /api/v1/health/detailed`

**描述**: 获取详细的系统健康状态信息

## 接口通用要求

### 1. 认证和授权
所有API接口都需要支持JWT认证：
```
Authorization: Bearer <jwt-token>
User-ID: <user-id>
```

### 2. 统一响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 具体数据
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. 错误处理
```json
{
  "code": 400,
  "message": "请求参数错误",
  "error": "详细错误信息",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. 分页支持
支持分页的接口需要返回：
```json
{
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### 5. 跨域支持
需要配置CORS允许前端域名访问

### 6. 接口版本控制
所有接口都应该包含版本号，如 `/api/v1/`

## 开发时间线建议

1. **第一阶段（紧急）**: 集群资源视图接口
2. **第二阶段（1周内）**: 可视化调度配置接口  
3. **第三阶段（2周内）**: 实时监控和告警接口
4. **第四阶段（1个月内）**: 其他增强功能接口

## 测试要求

1. 提供接口的Swagger/OpenAPI文档
2. 包含完整的单元测试覆盖
3. 提供接口调用示例和Mock数据
4. 支持本地开发环境的Mock接口

## 性能要求

1. 响应时间: 概览接口 < 500ms，列表接口 < 1s
2. 并发支持: 至少支持100个并发用户
3. 数据更新频率: 关键指标支持30秒刷新
4. 缓存策略: 静态数据支持合理的缓存时间

## 联系信息

如有接口设计问题或需要澄清需求，请联系前端开发团队。

---

**文档版本**: v1.1  
**创建时间**: 2024-01-15  
**最后更新**: 2024-05-26  
**负责人**: 前端开发团队

## 更新记录

- **v1.1 (2024-05-26)**: 新增系统事件告警和健康状态接口紧急需求，当前前端使用模拟数据
- **v1.0 (2024-01-15)**: 初始版本

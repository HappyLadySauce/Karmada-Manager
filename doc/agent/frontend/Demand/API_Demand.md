# 前端API需求文档

## 概述

本文档详细列出了Karmada Dashboard前端应用所需的后端API接口。这些接口是实现完整的多云管理功能的关键依赖。

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

### 2. 告警和事件接口

**接口**: `GET /api/v1/events/recent`

**描述**: 获取最近的系统事件和告警信息

**期望响应**:
```json
{
  "code": 200,
  "data": {
    "events": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "type": "Warning",
        "source": "cluster-beijing",
        "message": "节点资源使用率过高",
        "severity": "medium"
      }
    ]
  }
}
```

### 3. 策略模板接口

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

**文档版本**: v1.0  
**创建时间**: 2024-01-15  
**最后更新**: 2024-01-15  
**负责人**: 前端开发团队

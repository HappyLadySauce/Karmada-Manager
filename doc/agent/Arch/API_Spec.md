# API 定义文档 (API Specification) - Karmada-Manager 用户体验优化

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期       | 作者      | 变更说明       |
| ------ | ---------- | --------- | -------------- |
| 1.0    | 2024-12-19 | 架构设计师 | 初版API定义文档 |

### 1.2 API设计原则

- **RESTful设计**: 遵循REST架构风格
- **统一响应格式**: 所有API使用统一的响应结构
- **版本化管理**: API路径包含版本信息(/api/v1)
- **数据选择支持**: 支持分页、筛选、排序等查询参数
- **错误处理**: 提供明确的错误代码和信息

### 1.3 基础配置

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: JWT Bearer Token
- **字符编码**: UTF-8

## 2. 通用数据结构

### 2.1 统一响应格式

```typescript
interface IResponse<T = any> {
  code: number;           // 状态码，200=成功
  message: string;        // 响应信息
  data: T;               // 响应数据
}
```

### 2.2 分页查询参数

```typescript
interface DataSelectQuery {
  filterBy?: string[];    // 筛选条件，格式: ["field,value"]
  sortBy?: string[];      // 排序条件，格式: ["field,asc/desc"]
  itemsPerPage?: number;  // 每页条数
  page?: number;          // 页码（从1开始）
}
```

### 2.3 通用元数据结构

```typescript
interface ObjectMeta {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  creationTimestamp: string;
  uid: string;
}

interface TypeMeta {
  kind: string;
  scalable: boolean;
  restartable: boolean;
}
```

## 3. 概览API

### 3.1 获取系统概览信息

- **URL**: `/overview`
- **Method**: `GET`
- **描述**: 获取Karmada控制面和成员集群的整体状态信息

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "karmadaInfo": {
      "version": {
        "gitVersion": "v1.13.0",
        "gitCommit": "abc123",
        "gitTreeState": "clean",
        "buildDate": "2024-12-19T10:00:00Z",
        "goVersion": "go1.22.12",
        "compiler": "gc",
        "platform": "linux/amd64"
      },
      "status": "running",
      "createTime": "2024-01-01T00:00:00Z"
    },
    "memberClusterStatus": {
      "nodeSummary": {
        "totalNum": 15,
        "readyNum": 14
      },
      "cpuSummary": {
        "totalCPU": 128000,
        "allocatedCPU": 89600.5
      },
      "memorySummary": {
        "totalMemory": 524288000,
        "allocatedMemory": 367001600.0
      },
      "podSummary": {
        "totalPod": 1000,
        "allocatedPod": 756
      }
    },
    "clusterResourceStatus": {
      "propagationPolicyNum": 25,
      "overridePolicyNum": 12,
      "namespaceNum": 45,
      "workloadNum": 156,
      "serviceNum": 89,
      "configNum": 67
    }
  }
}
```

## 4. 集群管理API

### 4.1 获取集群列表

- **URL**: `/clusters`
- **Method**: `GET`
- **参数**: DataSelectQuery

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clusters": [
      {
        "objectMeta": {
          "name": "cluster-beijing",
          "namespace": "",
          "labels": {
            "cluster.karmada.io/region": "beijing",
            "cluster.karmada.io/zone": "beijing-a"
          },
          "annotations": {},
          "creationTimestamp": "2024-01-01T00:00:00Z",
          "uid": "abc123"
        },
        "typeMeta": {
          "kind": "Cluster",
          "scalable": false,
          "restartable": false
        },
        "ready": "True",
        "nodeSummary": {
          "totalNum": 5,
          "readyNum": 5
        },
        "allocatedResources": {
          "cpuCapacity": 32000,
          "cpuFraction": 70.5,
          "memoryCapacity": 131072000,
          "memoryFraction": 65.2,
          "podCapacity": 200,
          "allocatedPods": 145
        }
      }
    ],
    "totalItems": 3
  }
}
```

### 4.2 获取集群详情

- **URL**: `/clusters/{clusterName}`
- **Method**: `GET`

### 4.3 创建集群

- **URL**: `/clusters`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "cluster-shanghai",
  "labels": {
    "cluster.karmada.io/region": "shanghai",
    "cluster.karmada.io/zone": "shanghai-a"
  },
  "endpoint": "https://cluster-shanghai-api.example.com:6443",
  "secretRef": {
    "namespace": "karmada-cluster",
    "name": "cluster-shanghai-secret"
  },
  "syncMode": "Push",
  "taints": []
}
```

## 5. 工作负载管理API

### 5.1 获取Deployment列表

- **URL**: `/deployments`
- **Method**: `GET`
- **参数**: 
  - `namespace` (可选): 指定命名空间
  - DataSelectQuery

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deployments": [
      {
        "objectMeta": {
          "name": "nginx-deployment",
          "namespace": "default",
          "labels": {
            "app": "nginx"
          },
          "annotations": {
            "propagationpolicy.karmada.io/name": "nginx-propagation"
          },
          "creationTimestamp": "2024-12-19T10:00:00Z",
          "uid": "def456"
        },
        "typeMeta": {
          "kind": "Deployment",
          "scalable": true,
          "restartable": true
        },
        "status": "Running",
        "statusInfo": {
          "replicas": 3,
          "updatedReplicas": 3,
          "readyReplicas": 3,
          "availableReplicas": 3
        },
        "containerImages": ["nginx:1.21"],
        "initContainerImages": [],
        "selector": {
          "app": "nginx"
        }
      }
    ],
    "totalItems": 15
  }
}
```

### 5.2 创建Deployment

- **URL**: `/deployments`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "nginx-deployment",
  "namespace": "default",
  "labels": {
    "app": "nginx"
  },
  "spec": {
    "replicas": 3,
    "selector": {
      "matchLabels": {
        "app": "nginx"
      }
    },
    "template": {
      "metadata": {
        "labels": {
          "app": "nginx"
        }
      },
      "spec": {
        "containers": [
          {
            "name": "nginx",
            "image": "nginx:1.21",
            "ports": [
              {
                "containerPort": 80,
                "protocol": "TCP"
              }
            ],
            "resources": {
              "requests": {
                "cpu": "100m",
                "memory": "128Mi"
              },
              "limits": {
                "cpu": "200m",
                "memory": "256Mi"
              }
            }
          }
        ]
      }
    }
  },
  "propagationPolicy": {
    "create": true,
    "name": "nginx-propagation",
    "placement": {
      "clusterSelector": {
        "matchLabels": {
          "cluster.karmada.io/region": "beijing"
        }
      }
    }
  }
}
```

### 5.3 更新Deployment

- **URL**: `/deployments/{namespace}/{name}`
- **Method**: `PUT`

### 5.4 删除Deployment

- **URL**: `/deployments/{namespace}/{name}`
- **Method**: `DELETE`

### 5.5 扩缩容Deployment

- **URL**: `/deployments/{namespace}/{name}/scale`
- **Method**: `POST`

**请求体**:
```json
{
  "replicas": 5
}
```

## 6. 服务管理API

### 6.1 获取Service列表

- **URL**: `/services`
- **Method**: `GET`

### 6.2 创建Service

- **URL**: `/services`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "nginx-service",
  "namespace": "default",
  "labels": {
    "app": "nginx"
  },
  "spec": {
    "type": "ClusterIP",
    "selector": {
      "app": "nginx"
    },
    "ports": [
      {
        "name": "http",
        "port": 80,
        "targetPort": 80,
        "protocol": "TCP"
      }
    ]
  },
  "propagationPolicy": {
    "create": true,
    "name": "nginx-service-propagation",
    "placement": {
      "clusterSelector": {
        "matchLabels": {
          "cluster.karmada.io/region": "beijing"
        }
      }
    }
  }
}
```

## 7. 配置管理API

### 7.1 获取ConfigMap列表

- **URL**: `/configmaps`
- **Method**: `GET`

### 7.2 创建ConfigMap

- **URL**: `/configmaps`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "app-config",
  "namespace": "default",
  "labels": {
    "app": "myapp"
  },
  "data": {
    "app.properties": "server.port=8080\nserver.host=0.0.0.0",
    "log.level": "INFO"
  },
  "propagationPolicy": {
    "create": false,
    "name": "existing-propagation"
  }
}
```

### 7.3 获取Secret列表

- **URL**: `/secrets`
- **Method**: `GET`

### 7.4 创建Secret

- **URL**: `/secrets`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "app-secret",
  "namespace": "default",
  "labels": {
    "app": "myapp"
  },
  "type": "Opaque",
  "data": {
    "username": "YWRtaW4=",
    "password": "cGFzc3dvcmQ="
  },
  "propagationPolicy": {
    "create": true,
    "name": "secret-propagation",
    "placement": {
      "clusterNames": ["cluster-beijing", "cluster-shanghai"]
    }
  }
}
```

## 8. 命名空间管理API

### 8.1 获取Namespace列表

- **URL**: `/namespaces`
- **Method**: `GET`

### 8.2 创建Namespace

- **URL**: `/namespaces`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "production",
  "labels": {
    "env": "production",
    "team": "backend"
  },
  "propagationPolicy": {
    "create": true,
    "name": "production-namespace-propagation",
    "placement": {
      "clusterSelector": {
        "matchLabels": {
          "env": "production"
        }
      }
    }
  }
}
```

## 9. 策略管理API

### 9.1 获取PropagationPolicy列表

- **URL**: `/propagationpolicies`
- **Method**: `GET`
- **参数**: 
  - `namespace` (可选): 指定命名空间
  - DataSelectQuery

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "propagationPolicies": [
      {
        "objectMeta": {
          "name": "nginx-propagation",
          "namespace": "default",
          "labels": {},
          "annotations": {},
          "creationTimestamp": "2024-12-19T10:00:00Z",
          "uid": "ghi789"
        },
        "typeMeta": {
          "kind": "PropagationPolicy",
          "scalable": false,
          "restartable": false
        },
        "resourceSelectors": [
          {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "name": "nginx-deployment"
          }
        ],
        "placement": {
          "clusterSelector": {
            "matchLabels": {
              "cluster.karmada.io/region": "beijing"
            }
          },
          "replicaScheduling": {
            "replicaSchedulingType": "Divided",
            "replicaDivisionPreference": "Weighted",
            "weightPreference": {
              "staticWeightList": [
                {
                  "targetCluster": {
                    "clusterNames": ["cluster-beijing-1"]
                  },
                  "weight": 2
                },
                {
                  "targetCluster": {
                    "clusterNames": ["cluster-beijing-2"]
                  },
                  "weight": 1
                }
              ]
            }
          }
        }
      }
    ],
    "totalItems": 25
  }
}
```

### 9.2 创建PropagationPolicy

- **URL**: `/propagationpolicies`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "nginx-propagation",
  "namespace": "default",
  "resourceSelectors": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "name": "nginx-deployment"
    }
  ],
  "placement": {
    "clusterSelector": {
      "matchLabels": {
        "cluster.karmada.io/region": "beijing"
      }
    },
    "replicaScheduling": {
      "replicaSchedulingType": "Divided",
      "replicaDivisionPreference": "Weighted",
      "weightPreference": {
        "staticWeightList": [
          {
            "targetCluster": {
              "clusterNames": ["cluster-beijing-1"]
            },
            "weight": 2
          }
        ]
      }
    },
    "spreadConstraints": [
      {
        "spreadByField": "cluster",
        "maxSkew": 2,
        "minGroups": 1,
        "whenUnsatisfiable": "DoNotSchedule"
      }
    ],
    "tolerations": [
      {
        "key": "node.karmada.io/unschedulable",
        "operator": "Exists",
        "effect": "NoSchedule"
      }
    ]
  }
}
```

### 9.3 获取OverridePolicy列表

- **URL**: `/overridepolicies`
- **Method**: `GET`

### 9.4 创建OverridePolicy

- **URL**: `/overridepolicies`
- **Method**: `POST`

**请求体**:
```json
{
  "name": "nginx-override",
  "namespace": "default",
  "resourceSelectors": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "name": "nginx-deployment"
    }
  ],
  "overrideRules": [
    {
      "targetCluster": {
        "clusterNames": ["cluster-production"]
      },
      "overriders": {
        "imageOverrider": [
          {
            "component": "Registry",
            "operator": "replace",
            "value": "production-registry.example.com"
          }
        ],
        "replicas": 5
      }
    }
  ]
}
```

## 10. 可视化调度API

### 10.1 获取集群资源视图

- **URL**: `/scheduling/clusters/resources`
- **Method**: `GET`

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clusters": [
      {
        "name": "cluster-beijing-1",
        "region": "beijing",
        "zone": "beijing-a",
        "status": "Ready",
        "resources": {
          "cpu": {
            "capacity": 32000,
            "allocatable": 30000,
            "allocated": 21000,
            "usage": 18500
          },
          "memory": {
            "capacity": 131072000,
            "allocatable": 125829120,
            "allocated": 82059264,
            "usage": 75497472
          },
          "pod": {
            "capacity": 200,
            "allocatable": 200,
            "allocated": 145
          }
        },
        "labels": {
          "cluster.karmada.io/region": "beijing",
          "cluster.karmada.io/zone": "beijing-a",
          "env": "production"
        },
        "taints": [],
        "loadLevel": "medium"
      }
    ]
  }
}
```

### 10.2 调度策略模拟

- **URL**: `/scheduling/simulate`
- **Method**: `POST`

**请求体**:
```json
{
  "workload": {
    "kind": "Deployment",
    "replicas": 6,
    "resources": {
      "requests": {
        "cpu": "100m",
        "memory": "128Mi"
      }
    }
  },
  "placement": {
    "clusterSelector": {
      "matchLabels": {
        "cluster.karmada.io/region": "beijing"
      }
    },
    "replicaScheduling": {
      "replicaSchedulingType": "Divided",
      "replicaDivisionPreference": "Weighted"
    }
  }
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "schedulingResult": [
      {
        "clusterName": "cluster-beijing-1",
        "replicas": 4,
        "reason": "Higher weight and more available resources"
      },
      {
        "clusterName": "cluster-beijing-2",
        "replicas": 2,
        "reason": "Lower weight but sufficient resources"
      }
    ],
    "warnings": [],
    "errors": []
  }
}
```

## 11. 非结构化资源API

### 11.1 创建非结构化资源

- **URL**: `/unstructured`
- **Method**: `POST`

**请求体**:
```json
{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "custom-app",
    "namespace": "default"
  },
  "spec": {
    "replicas": 2,
    "selector": {
      "matchLabels": {
        "app": "custom-app"
      }
    },
    "template": {
      "metadata": {
        "labels": {
          "app": "custom-app"
        }
      },
      "spec": {
        "containers": [
          {
            "name": "app",
            "image": "custom-app:latest"
          }
        ]
      }
    }
  }
}
```

## 12. 认证相关API

### 12.1 获取认证信息

- **URL**: `/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "username": "admin",
    "groups": ["system:admin"],
    "permissions": [
      "clusters.read",
      "deployments.write",
      "services.write"
    ]
  }
}
```

## 13. 错误处理

### 13.1 错误响应格式

```json
{
  "code": 400,
  "message": "validation failed",
  "data": {
    "errors": [
      {
        "field": "spec.replicas",
        "message": "replicas must be greater than 0"
      }
    ]
  }
}
```

### 13.2 常见错误代码

| 错误代码 | 描述 | 示例场景 |
|---------|------|----------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求参数错误 | 参数验证失败 |
| 401 | 未认证 | Token无效或过期 |
| 403 | 权限不足 | 无操作权限 |
| 404 | 资源不存在 | 找不到指定资源 |
| 409 | 资源冲突 | 资源已存在 |
| 500 | 服务器内部错误 | 系统异常 |
| 503 | 服务不可用 | 依赖服务异常 |

这份API定义文档为前端开发团队提供了完整的接口规范，确保前后端开发的一致性和高效协作。 
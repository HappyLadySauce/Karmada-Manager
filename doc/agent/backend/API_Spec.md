# Karmada Dashboard API 接口规范

## 概述

本文档定义了Karmada Dashboard后端API的所有接口规范，包括请求方法、参数、响应格式和示例。

## 通用响应格式

所有API接口都使用统一的响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 具体数据内容
  }
}
```

错误响应格式：
```json
{
  "code": 400,
  "message": "错误信息",
  "error": "详细错误描述"
}
```

## 概览页面 API

### 获取控制器信息
- **URL**: `/api/v1/overview/karmada`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "version": {
      "gitVersion": "v1.7.0",
      "gitCommit": "abc123",
      "buildDate": "2024-01-01T00:00:00Z"
    },
    "status": "running",
    "createTime": "2024-01-01T00:00:00Z"
  }
}
```

### 获取成员集群状态
- **URL**: `/api/v1/overview/cluster`
- **Method**: `GET`
- **Parameters**:
  - `page` (int): 页码，默认1
  - `limit` (int): 每页数量，默认10
- **Response**:
```json
{
  "code": 200,
  "data": {
    "nodeSummary": {
      "totalNum": 10,
      "readyNum": 9
    },
    "cpuSummary": {
      "totalCPU": 1000,
      "allocatedCPU": 600.5
    },
    "memorySummary": {
      "totalMemory": 2048000,
      "allocatedMemory": 1024000
    },
    "podSummary": {
      "totalPod": 500,
      "allocatedPod": 300
    }
  }
}
```

### 获取资源统计
- **URL**: `/api/v1/overview/resource`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "propagationPolicyNum": 15,
    "overridePolicyNum": 8,
    "workloadNum": 45,
    "serviceNum": 23,
    "configNum": 67,
    "namespaceNum": 12
  }
}
```

## 工作负载管理 API

### Deployment 管理

#### 通过表单创建 Deployment
- **URL**: `/api/v1/deployment/form`
- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "nginx-deployment",
  "namespace": "default",
  "replicas": 3,
  "labels": {
    "app": "nginx"
  },
  "containers": [
    {
      "name": "nginx",
      "image": "nginx:1.20",
      "ports": [
        {
          "name": "http",
          "containerPort": 80,
          "protocol": "TCP"
        }
      ],
      "env": [
        {
          "name": "ENV_VAR",
          "value": "value"
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
      },
      "livenessProbe": {
        "httpGet": {
          "path": "/health",
          "port": 80
        },
        "initialDelaySeconds": 30,
        "periodSeconds": 10
      }
    }
  ],
  "strategy": {
    "type": "RollingUpdate",
    "rollingUpdate": {
      "maxSurge": "25%",
      "maxUnavailable": "25%"
    }
  },
  "propagationPolicy": {
    "create": true,
    "name": "nginx-propagation",
    "placement": {
      "clusterSelector": {
        "matchLabels": {
          "environment": "production"
        }
      },
      "clusterAffinity": {
        "clusterNames": ["cluster1", "cluster2"]
      }
    }
  }
}
```

#### 更新 Deployment
- **URL**: `/api/v1/deployment/:namespace/:deployment`
- **Method**: `PUT`
- **Request Body**: 同创建接口的spec部分

#### 扩缩容 Deployment
- **URL**: `/api/v1/deployment/:namespace/:deployment/scale`
- **Method**: `PUT`
- **Request Body**:
```json
{
  "replicas": 5
}
```

#### 删除 Deployment
- **URL**: `/api/v1/deployment/:namespace/:deployment`
- **Method**: `DELETE`

### StatefulSet 管理

#### 通过表单创建 StatefulSet
- **URL**: `/api/v1/statefulset/form`
- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "mysql-statefulset",
  "namespace": "default",
  "replicas": 3,
  "serviceName": "mysql-headless",
  "labels": {
    "app": "mysql"
  },
  "containers": [
    {
      "name": "mysql",
      "image": "mysql:8.0",
      "ports": [
        {
          "name": "mysql",
          "containerPort": 3306
        }
      ],
      "env": [
        {
          "name": "MYSQL_ROOT_PASSWORD",
          "value": "password"
        }
      ],
      "volumeMounts": [
        {
          "name": "mysql-data",
          "mountPath": "/var/lib/mysql"
        }
      ]
    }
  ],
  "volumeClaimTemplates": [
    {
      "name": "mysql-data",
      "accessModes": ["ReadWriteOnce"],
      "size": "10Gi",
      "storageClass": "fast-ssd"
    }
  ],
  "updateStrategy": {
    "type": "RollingUpdate",
    "rollingUpdate": {
      "partition": 0
    }
  },
  "propagationPolicy": {
    "create": true,
    "placement": {
      "clusterAffinity": {
        "clusterNames": ["cluster1", "cluster2"]
      }
    }
  }
}
```

#### 更新 StatefulSet
- **URL**: `/api/v1/statefulset/:namespace/:statefulset`
- **Method**: `PUT`

#### 扩缩容 StatefulSet
- **URL**: `/api/v1/statefulset/:namespace/:statefulset/scale`
- **Method**: `PUT`
- **Request Body**:
```json
{
  "replicas": 5
}
```

#### 删除 StatefulSet
- **URL**: `/api/v1/statefulset/:namespace/:statefulset`
- **Method**: `DELETE`

### DaemonSet 管理

#### 通过表单创建 DaemonSet
- **URL**: `/api/v1/daemonset/form`
- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "log-collector",
  "namespace": "kube-system",
  "labels": {
    "app": "log-collector"
  },
  "containers": [
    {
      "name": "fluentd",
      "image": "fluentd:v1.14",
      "volumeMounts": [
        {
          "name": "varlog",
          "mountPath": "/var/log",
          "readOnly": true
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "varlog",
      "hostPath": {
        "path": "/var/log"
      }
    }
  ],
  "tolerations": [
    {
      "key": "node-role.kubernetes.io/master",
      "effect": "NoSchedule",
      "operator": "Exists"
    }
  ],
  "updateStrategy": {
    "type": "RollingUpdate",
    "rollingUpdate": {
      "maxUnavailable": "10%"
    }
  }
}
```

#### 更新 DaemonSet
- **URL**: `/api/v1/daemonset/:namespace/:daemonset`
- **Method**: `PUT`

#### 删除 DaemonSet
- **URL**: `/api/v1/daemonset/:namespace/:daemonset`
- **Method**: `DELETE`

### Job 管理

#### 通过表单创建 Job
- **URL**: `/api/v1/job/form`
- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "data-migration",
  "namespace": "default",
  "labels": {
    "app": "migration"
  },
  "containers": [
    {
      "name": "migration",
      "image": "migration:latest",
      "env": [
        {
          "name": "DATABASE_URL",
          "value": "mysql://localhost:3306/db"
        }
      ]
    }
  ],
  "restartPolicy": "Never",
  "completions": 1,
  "parallelism": 1,
  "backoffLimit": 3,
  "activeDeadlineSeconds": 3600
}
```

#### 更新 Job
- **URL**: `/api/v1/job/:namespace/:job`
- **Method**: `PUT`

#### 删除 Job
- **URL**: `/api/v1/job/:namespace/:job`
- **Method**: `DELETE`

### CronJob 管理

#### 通过表单创建 CronJob
- **URL**: `/api/v1/cronjob/form`
- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "backup-job",
  "namespace": "default",
  "schedule": "0 2 * * *",
  "labels": {
    "app": "backup"
  },
  "containers": [
    {
      "name": "backup",
      "image": "backup:latest",
      "env": [
        {
          "name": "BACKUP_TARGET",
          "value": "s3://my-bucket/backups"
        }
      ]
    }
  ],
  "restartPolicy": "OnFailure",
  "completions": 1,
  "parallelism": 1,
  "backoffLimit": 3,
  "activeDeadlineSeconds": 1800,
  "concurrencyPolicy": "Forbid",
  "suspend": false,
  "successfulJobsHistoryLimit": 3,
  "failedJobsHistoryLimit": 1,
  "startingDeadlineSeconds": 600
}
```

#### 更新 CronJob
- **URL**: `/api/v1/cronjob/:namespace/:cronjob`
- **Method**: `PUT`

#### 删除 CronJob
- **URL**: `/api/v1/cronjob/:namespace/:cronjob`
- **Method**: `DELETE`

## 服务管理 API

### 通过表单创建 Service
- **URL**: `/api/v1/service/form`
- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "nginx-service",
  "namespace": "default",
  "type": "ClusterIP",
  "selector": {
    "app": "nginx"
  },
  "ports": [
    {
      "name": "http",
      "port": 80,
      "targetPort": 8080,
      "protocol": "TCP"
    }
  ],
  "labels": {
    "app": "nginx"
  },
  "propagationPolicy": {
    "create": true,
    "placement": {
      "clusterAffinity": {
        "clusterNames": ["cluster1", "cluster2"]
      }
    }
  }
}
```

### 更新 Service
- **URL**: `/api/v1/service/:namespace/:service`
- **Method**: `PUT`

### 删除 Service
- **URL**: `/api/v1/service/:namespace/:service`
- **Method**: `DELETE`

## 可视化调度 API

### 获取集群资源视图
- **URL**: `/api/v1/scheduling/clusters/resources`
- **Method**: `GET`
- **Parameters**:
  - `page` (int): 页码
  - `limit` (int): 每页数量
- **Response**:
```json
{
  "code": 200,
  "data": {
    "clusters": [
      {
        "name": "cluster1",
        "region": "us-west-1",
        "zone": "us-west-1a",
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
          "cluster.karmada.io/region": "us-west-1"
        },
        "taints": [
          {
            "key": "special",
            "value": "gpu",
            "effect": "NoSchedule"
          }
        ],
        "loadLevel": "medium"
      }
    ]
  }
}
```

### 调度策略模拟
- **URL**: `/api/v1/scheduling/simulate`
- **Method**: `POST`
- **Request Body**:
```json
{
  "workload": {
    "kind": "Deployment",
    "replicas": 3,
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
        "cluster.karmada.io/region": "us-west-1"
      }
    },
    "replicaScheduling": {
      "replicaSchedulingType": "Divided",
      "weightPreference": {
        "staticWeightList": [
          {
            "targetCluster": {
              "clusterNames": ["cluster1", "cluster2"]
            },
            "weight": 2
          }
        ]
      }
    }
  }
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "schedulingResult": [
      {
        "clusterName": "cluster1",
        "replicas": 2,
        "reason": "按权重分配，权重: 2/3"
      },
      {
        "clusterName": "cluster2",
        "replicas": 1,
        "reason": "按权重分配，权重: 1/3"
      }
    ],
    "warnings": [],
    "errors": []
  }
}
```

### 获取资源调度树形图
- **URL**: `/api/v1/scheduling/tree`
- **Method**: `GET`
- **Parameters**:
  - `resourceType` (string): 资源类型（deployment, service等）
  - `resourceName` (string, optional): 具体资源名称
  - `namespace` (string, optional): 命名空间
- **Response**:
```json
{
  "code": 200,
  "data": {
    "nodes": [
      {
        "id": "resource-default-nginx",
        "type": "resource",
        "name": "nginx",
        "namespace": "default",
        "status": "ready",
        "properties": {
          "kind": "deployment"
        },
        "position": {
          "x": 100,
          "y": 100
        },
        "style": {
          "color": "#1890ff",
          "icon": "deployment"
        }
      },
      {
        "id": "policy-nginx-propagation",
        "type": "policy",
        "name": "nginx-propagation",
        "namespace": "default",
        "status": "ready",
        "properties": {
          "resourceSelectors": 1,
          "clusters": 2
        },
        "position": {
          "x": 300,
          "y": 100
        },
        "style": {
          "color": "#52c41a",
          "icon": "policy"
        }
      },
      {
        "id": "cluster-cluster1",
        "type": "cluster",
        "name": "cluster1",
        "status": "ready",
        "properties": {
          "ready": true
        },
        "position": {
          "x": 500,
          "y": 50
        },
        "style": {
          "color": "#722ed1",
          "icon": "cluster"
        }
      }
    ],
    "edges": [
      {
        "id": "edge-resource-policy",
        "source": "resource-default-nginx",
        "target": "policy-nginx-propagation",
        "type": "propagate",
        "label": "应用策略",
        "status": "active",
        "style": {
          "color": "#1890ff",
          "width": 2
        }
      },
      {
        "id": "edge-policy-cluster",
        "source": "policy-nginx-propagation",
        "target": "cluster-cluster1",
        "type": "schedule",
        "label": "调度到集群",
        "status": "active",
        "style": {
          "color": "#52c41a",
          "width": 2
        }
      }
    ]
  }
}
```

## 策略管理 API

### 接口特性
- **完全用户自定义**: 策略名称、命名空间、标签等均可自定义
- **灵活的集群选择**: 支持直接指定集群名称或使用标签选择器
- **智能权重分配**: 支持按权重分配副本到不同集群
- **覆盖规则定制**: 支持镜像、参数、命令等多种覆盖方式
- **模板生成**: 根据用户输入动态生成策略YAML模板

### 获取策略列表（增强版）
- **URL**: `/api/v1/policy/list`
- **Method**: `GET`
- **Parameters**:
  - `namespace` (string, optional): 命名空间过滤
  - `type` (string, optional): 策略类型 (propagation, override, all)
  - `page` (int): 页码
  - `limit` (int): 每页数量
- **Response**:
```json
{
  "code": 200,
  "data": {
    "listMeta": {
      "totalItems": 10
    },
    "policies": [
      {
        "objectMeta": {
          "name": "nginx-policy",
          "namespace": "default",
          "creationTimestamp": "2024-01-01T00:00:00Z",
          "labels": {
            "app": "nginx"
          }
        },
        "typeMeta": {
          "kind": "PropagationPolicy",
          "apiVersion": "policy.karmada.io/v1alpha1"
        }
      }
    ]
  }
}
```

### 通过表单创建策略
- **URL**: `/api/v1/policy/form`
- **Method**: `POST`
- **描述**: 完全自定义的策略创建接口，支持用户指定所有参数
- **Request Body**:
```json
{
  "name": "nginx-propagation",
  "namespace": "default",
  "resourceSelectors": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "name": "nginx",
      "labelSelector": {
        "app": "nginx"
      }
    }
  ],
  "placement": {
    "clusterAffinity": {
      "clusterNames": ["cluster1", "cluster2"]
    }
  },
  "scheduling": "Divided"
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "name": "nginx-propagation",
    "namespace": "default",
    "type": "PropagationPolicy",
    "status": "Active",
    "lastApplied": "2024-01-01T00:00:00Z"
  }
}
```

**参数说明**:
- `name`: 用户可自定义策略名称
- `namespace`: 可选，留空创建集群级策略
- `resourceSelectors`: 支持多种选择方式（名称、标签选择器）
- `placement.clusterAffinity.clusterNames`: 直接指定目标集群
- `scheduling`: 可选 "Duplicated"（复制）或 "Divided"（分割）

### 生成策略模板（增强版）
- **URL**: `/api/v1/policy/template`
- **Method**: `POST`
- **描述**: 根据用户输入动态生成策略YAML模板，不再使用写死的值
- **Request Body**:
```json
{
  "policyType": "propagation",
  "isClusterScope": false,
  "name": "my-nginx-policy",
  "namespace": "production",
  "labels": {
    "app": "nginx",
    "env": "production"
  },
  "resourceSelectors": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "labelSelector": {
        "app": "nginx"
      }
    }
  ],
  "clusters": ["cluster-prod-1", "cluster-prod-2"],
  "clusterLabels": {
    "environment": "production"
  },
  "schedulingType": "Divided",
  "staticWeightList": [
    {
      "targetCluster": {
        "clusterNames": ["cluster-prod-1"]
      },
      "weight": 3
    },
    {
      "targetCluster": {
        "clusterNames": ["cluster-prod-2"]
      },
      "weight": 1
    }
  ]
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "template": "apiVersion: policy.karmada.io/v1alpha1\nkind: PropagationPolicy\nmetadata:\n  name: my-nginx-policy\n  namespace: production\n  labels:\n    app: nginx\n    env: production\nspec:\n  resourceSelectors:\n  - apiVersion: apps/v1\n    kind: Deployment\n    labelSelector:\n      matchLabels:\n        app: nginx\n  placement:\n    clusterAffinity:\n      clusterNames:\n      - cluster-prod-1\n      - cluster-prod-2\n      labelSelector:\n        matchLabels:\n          environment: production\n    replicaScheduling:\n      replicaSchedulingType: Divided\n      weightPreference:\n        staticWeightList:\n        - targetCluster:\n            clusterNames:\n            - cluster-prod-1\n          weight: 3\n        - targetCluster:\n            clusterNames:\n            - cluster-prod-2\n          weight: 1"
  }
}
```

#### 覆盖策略模板示例
```json
{
  "policyType": "override",
  "isClusterScope": true,
  "name": "image-override-policy",
  "labels": {
    "purpose": "image-override"
  },
  "resourceSelectors": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "name": "nginx-app"
    }
  ],
  "targetCluster": {
    "clusterNames": ["cluster-china"],
    "clusterLabels": {
      "region": "china"
    }
  },
  "overrideRules": {
    "imageOverrides": [
      {
        "component": "nginx",
        "replicas": {
          "cluster-china": "nginx:1.20-alpine"
        }
      }
    ],
    "args": ["--config=/etc/nginx/nginx.conf"],
    "command": ["/usr/sbin/nginx", "-g", "daemon off;"]
  }
}
```

**模板生成特性**:
- **智能默认值**: 仅在用户未提供时使用合理默认值
- **完全自定义**: 策略名称、命名空间、标签等全部可自定义
- **灵活集群选择**: 同时支持集群名称和标签选择器
- **权重分配**: 支持为不同集群设置不同权重
- **覆盖规则**: 镜像、参数、命令等覆盖配置完全由用户定义

**关键参数**:
- `name`: 默认 "policy-template"，用户可自定义
- `namespace`: 默认 "default"，用户可自定义
- `labels`: 用户自定义标签
- `clusters`: 目标集群名称数组，用户指定真实集群
- `clusterLabels`: 集群标签选择器
- `staticWeightList`: 副本权重分配配置
- `overrideRules`: 覆盖策略具体规则

### 验证策略
- **URL**: `/api/v1/policy/validate`
- **Method**: `POST`
- **Request Body**:
```json
{
  "policyYAML": "apiVersion: policy.karmada.io/v1alpha1\nkind: PropagationPolicy\nmetadata:\n  name: test-policy\nspec:\n  resourceSelectors:\n  - apiVersion: apps/v1\n    kind: Deployment",
  "policyType": "propagation"
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["未指定目标集群，策略可能不会生效"]
  }
}
```

### 获取策略状态
- **URL**: `/api/v1/policy/:name/status`
- **Method**: `GET`
- **Parameters**:
  - `namespace` (string, optional): 命名空间
  - `type` (string, optional): 策略类型
- **Response**:
```json
{
  "code": 200,
  "data": {
    "name": "nginx-propagation",
    "namespace": "default",
    "type": "PropagationPolicy",
    "status": "Active",
    "clusters": [
      {
        "clusterName": "cluster1",
        "status": "Applied",
        "message": ""
      },
      {
        "clusterName": "cluster2",
        "status": "Applied",
        "message": ""
      }
    ],
    "resources": [
      {
        "kind": "Deployment",
        "name": "nginx",
        "namespace": "default",
        "status": "Propagated",
        "clusters": 2
      }
    ],
    "lastApplied": "2024-01-01T00:00:00Z"
  }
}
```

### 批量策略操作
- **URL**: `/api/v1/policy/batch`
- **Method**: `POST`
- **Request Body**:
```json
{
  "policyNames": ["policy1", "policy2"],
  "namespace": "default",
  "action": "delete"
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "succeeded": ["policy1"],
    "failed": [
      {
        "name": "policy2",
        "reason": "policy not found"
      }
    ]
  }
}
```

## 集群管理 API

### 获取集群列表
- **URL**: `/api/v1/cluster`
- **Method**: `GET`
- **Parameters**:
  - `page` (int): 页码
  - `limit` (int): 每页数量

### 获取集群详情
- **URL**: `/api/v1/cluster/:cluster`
- **Method**: `GET`

## 命名空间管理 API

### 获取命名空间列表
- **URL**: `/api/v1/namespace`
- **Method**: `GET`
- **Parameters**:
  - `cluster` (string, optional): 集群过滤
  - `page` (int): 页码
  - `limit` (int): 每页数量

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 数据模型

### 容器规格 (ContainerSpec)
```json
{
  "name": "string",
  "image": "string",
  "ports": [
    {
      "name": "string",
      "containerPort": "int32",
      "protocol": "string"
    }
  ],
  "env": [
    {
      "name": "string",
      "value": "string"
    }
  ],
  "resources": {
    "requests": {
      "cpu": "string",
      "memory": "string"
    },
    "limits": {
      "cpu": "string",
      "memory": "string"
    }
  },
  "volumeMounts": [
    {
      "name": "string",
      "mountPath": "string",
      "readOnly": "boolean"
    }
  ],
  "livenessProbe": {
    "httpGet": {
      "path": "string",
      "port": "int32"
    },
    "initialDelaySeconds": "int32",
    "periodSeconds": "int32",
    "timeoutSeconds": "int32"
  },
  "readinessProbe": {
    "httpGet": {
      "path": "string",
      "port": "int32"
    },
    "initialDelaySeconds": "int32",
    "periodSeconds": "int32",
    "timeoutSeconds": "int32"
  }
}
```

### 分发策略配置 (PropagationPolicyConfig)
```json
{
  "create": "boolean",
  "name": "string",
  "placement": {
    "clusterSelector": {
      "matchLabels": {
        "key": "value"
      }
    },
    "clusterAffinity": {
      "clusterNames": ["string"]
    }
  }
}
```

### 卷规格 (VolumeSpec)
```json
{
  "name": "string",
  "configMap": {
    "name": "string"
  },
  "secret": {
    "secretName": "string"
  },
  "emptyDir": {
    "sizeLimit": "string"
  },
  "hostPath": {
    "path": "string"
  }
}
```

### 容忍配置 (TolerationSpec)
```json
{
  "key": "string",
  "value": "string",
  "operator": "string",
  "effect": "string"
}
```

## 版本更新历史

### v1.1.0 (2025-05-26)
- ✅ **解决写死问题**: 策略接口完全用户自定义，去除所有硬编码值
- ✅ **灵活策略模板**: 支持自定义名称、命名空间、标签等所有元数据
- ✅ **智能集群选择**: 支持集群名称数组和标签选择器两种方式
- ✅ **权重分配**: 支持为不同集群设置不同的副本权重
- ✅ **覆盖规则定制**: 支持镜像、参数、命令等多种覆盖方式
- ✅ **完善策略管理**: 表单创建、模板生成、验证、状态监控、批量操作
- ✅ **修复编译错误**: 项目可正常构建和运行

### v1.0.0 (2024-01-15)
- 实现基础工作负载管理接口
- 添加表单创建功能
- 实现调度可视化接口
- 移除国际化相关接口

### v0.9.0 (2024-01-01)
- 初始版本
- 基础概览和集群管理接口

## 认证和授权

所有API接口都需要在请求头中携带认证信息：

```
Authorization: Bearer <token>
User-ID: <user-id>
```

## 版本控制

API版本通过URL路径进行控制，当前版本为 `v1`。

## 数据分页

支持分页的接口使用以下参数：
- `page`: 页码，从1开始
- `limit`: 每页数量，最大100
- `sort`: 排序字段
- `order`: 排序方向，asc/desc

分页响应格式：
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "pages": 10
}
``` 
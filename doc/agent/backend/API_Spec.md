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

### 获取控制器信息（增强版）
- **URL**: `/api/v1/overview/karmada`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "karmadaInfo": {
      "version": {
        "gitVersion": "v1.8.0",
        "gitCommit": "abc123def456",
        "buildDate": "2024-01-15T10:30:00Z"
      },
      "status": "running",
      "createTime": "2024-01-01T00:00:00Z",
      "uptime": "720h30m45s"
    }
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

### 获取集群资源视图（增强版）
- **URL**: `/api/v1/scheduling/clusters/resources`
- **Method**: `GET`
- **Parameters**:
  - `page` (int): 页码，默认1
  - `limit` (int): 每页数量，默认100
- **Response**:
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

### 获取可视化调度集群信息
- **URL**: `/api/v1/scheduling/visual/clusters`
- **Method**: `GET`
- **描述**: 获取用于可视化调度配置的集群信息
- **Response**:
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

### 可视化调度模拟
- **URL**: `/api/v1/scheduling/visual/simulate`
- **Method**: `POST`
- **描述**: 模拟调度策略，预测资源分配结果
- **Request Body**:
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
- **Response**:
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

## 实时监控 API

### 获取实时监控数据
- **URL**: `/api/v1/monitoring/realtime`
- **Method**: `GET`
- **描述**: 获取实时监控数据，支持WebSocket或SSE
- **Parameters**:
  - `type` (string, optional): 监控类型 (cluster, resource, all)
  - `interval` (int, optional): 刷新间隔，秒，默认30
- **Response**:
```json
{
  "code": 200,
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "clusters": [
      {
        "name": "cluster-beijing",
        "status": "Ready",
        "resources": {
          "cpu": { "usage": 65.5, "trend": "up" },
          "memory": { "usage": 52.3, "trend": "stable" },
          "pods": { "count": 256, "trend": "up" }
        }
      }
    ],
    "alerts": [
      {
        "level": "warning",
        "message": "集群 cluster-beijing CPU 使用率过高",
        "timestamp": "2024-01-15T10:25:00Z"
      }
    ]
  }
}
```

## 事件和告警 API

### 获取最近事件
- **URL**: `/api/v1/events/recent`
- **Method**: `GET`
- **Parameters**:
  - `limit` (int, optional): 事件数量限制，默认50
  - `severity` (string, optional): 严重程度过滤 (info, warning, error)
  - `source` (string, optional): 事件源过滤
- **Response**:
```json
{
  "code": 200,
  "data": {
    "events": [
      {
        "id": "event-001",
        "timestamp": "2024-01-15T10:30:00Z",
        "type": "Warning",
        "source": "cluster-beijing",
        "message": "节点资源使用率过高",
        "severity": "medium",
        "category": "resource",
        "details": {
          "node": "node-001",
          "cpuUsage": 85.5,
          "memoryUsage": 78.2
        }
      }
    ],
    "total": 125
  }
}
```

### 获取告警规则
- **URL**: `/api/v1/alerts/rules`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "rules": [
      {
        "id": "rule-001",
        "name": "CPU使用率告警",
        "condition": "cpu_usage > 80",
        "severity": "warning",
        "enabled": true
      }
    ]
  }
}
```

## 策略模板 API

### 获取策略模板列表
- **URL**: `/api/v1/policy/templates`
- **Method**: `GET`
- **Parameters**:
  - `category` (string, optional): 模板分类 (workload, service, config)
  - `type` (string, optional): 策略类型 (propagation, override)
- **Response**:
```json
{
  "code": 200,
  "data": {
    "templates": [
      {
        "id": "template-001",
        "name": "多区域部署模板",
        "description": "将工作负载部署到多个地理区域",
        "category": "workload",
        "type": "propagation",
        "template": "apiVersion: policy.karmada.io/v1alpha1\nkind: PropagationPolicy\n...",
        "variables": [
          {
            "name": "clusters",
            "type": "array",
            "description": "目标集群列表",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### 验证策略YAML
- **URL**: `/api/v1/policy/validate-yaml`
- **Method**: `POST`
- **Request Body**:
```json
{
  "yaml": "apiVersion: policy.karmada.io/v1alpha1\nkind: PropagationPolicy\n...",
  "type": "propagation"
}
```
- **Response**:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "建议添加资源选择器以提高策略精确性"
    ],
    "suggestions": [
      "可以考虑添加亲和性规则优化调度"
    ]
  }
}
```

## 用户偏好和配置 API

### 获取用户偏好设置
- **URL**: `/api/v1/user/preferences`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "theme": "dark",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "defaultCluster": "cluster-beijing",
    "dashboardLayout": {
      "overview": ["clusters", "resources", "policies"],
      "refreshInterval": 30
    }
  }
}
```

### 更新用户偏好设置
- **URL**: `/api/v1/user/preferences`
- **Method**: `PUT`
- **Request Body**:
```json
{
  "theme": "light",
  "language": "en-US",
  "timezone": "UTC",
  "defaultCluster": "cluster-shanghai"
}
```

## 审计日志 API

### 获取审计日志
- **URL**: `/api/v1/audit/logs`
- **Method**: `GET`
- **Parameters**:
  - `user` (string, optional): 用户过滤
  - `action` (string, optional): 操作类型过滤
  - `resource` (string, optional): 资源类型过滤
  - `startTime` (string, optional): 开始时间
  - `endTime` (string, optional): 结束时间
  - `page` (int): 页码
  - `limit` (int): 每页数量
- **Response**:
```json
{
  "code": 200,
  "data": {
    "logs": [
      {
        "id": "audit-001",
        "timestamp": "2024-01-15T10:30:00Z",
        "user": "admin",
        "action": "create",
        "resource": "deployment",
        "resourceName": "nginx-app",
        "namespace": "default",
        "cluster": "cluster-beijing",
        "result": "success",
        "details": {
          "replicas": 3,
          "image": "nginx:1.20"
        }
      }
    ],
    "total": 1250,
    "page": 1,
    "limit": 20
  }
}
```

## 系统健康检查 API

### 系统健康状态
- **URL**: `/api/v1/health`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": "720h30m45s",
    "version": "v1.8.0"
  }
}
```

### 详细健康检查
- **URL**: `/api/v1/health/detailed`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "overall": "healthy",
    "components": [
      {
        "name": "karmada-apiserver",
        "status": "healthy",
        "message": "API服务器运行正常",
        "lastCheck": "2024-01-15T10:30:00Z"
      },
      {
        "name": "karmada-controller-manager",
        "status": "healthy",
        "message": "控制器管理器运行正常",
        "lastCheck": "2024-01-15T10:30:00Z"
      },
      {
        "name": "karmada-scheduler",
        "status": "healthy",
        "message": "调度器运行正常",
        "lastCheck": "2024-01-15T10:30:00Z"
      }
    ],
    "dependencies": [
      {
        "name": "etcd",
        "status": "healthy",
        "latency": "2ms"
      },
      {
        "name": "member-clusters",
        "status": "partial",
        "message": "2/3 集群健康",
        "details": {
          "healthy": ["cluster-beijing", "cluster-shanghai"],
          "unhealthy": ["cluster-shenzhen"]
        }
      }
    ]
  }
}
```

## 集群管理增强 API

### 获取集群列表（增强版）
- **URL**: `/api/v1/cluster`
- **Method**: `GET`
- **Parameters**:
  - `page` (int): 页码
  - `limit` (int): 每页数量
  - `region` (string, optional): 区域过滤
  - `status` (string, optional): 状态过滤
- **Response**:
```json
{
  "code": 200,
  "data": {
    "clusters": [
      {
        "name": "cluster-beijing",
        "displayName": "北京生产集群",
        "region": "beijing",
        "zone": "zone-a",
        "status": "Ready",
        "version": "v1.28.0",
        "provider": "alicloud",
        "location": {
          "country": "China",
          "city": "Beijing",
          "latitude": 39.9042,
          "longitude": 116.4074
        },
        "resources": {
          "nodes": { "total": 12, "ready": 12 },
          "cpu": { "total": "120 cores", "used": "72 cores" },
          "memory": { "total": "480Gi", "used": "288Gi" },
          "storage": { "total": "12Ti", "used": "7.2Ti" }
        },
        "conditions": [
          {
            "type": "Ready",
            "status": "True",
            "lastTransitionTime": "2024-01-15T10:30:00Z"
          }
        ],
        "joinedTime": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 3
  }
}
```

### 获取集群详情（增强版）
- **URL**: `/api/v1/cluster/:cluster`
- **Method**: `GET`
- **Response**:
```json
{
  "code": 200,
  "data": {
    "cluster": {
      "name": "cluster-beijing",
      "displayName": "北京生产集群",
      "region": "beijing",
      "zone": "zone-a",
      "status": "Ready",
      "version": "v1.28.0",
      "provider": "alicloud",
      "location": {
        "country": "China",
        "city": "Beijing",
        "latitude": 39.9042,
        "longitude": 116.4074
      },
      "spec": {
        "connection": {
          "type": "direct",
          "endpoint": "https://cluster-beijing.example.com:6443"
        },
        "syncMode": "Push",
        "impersonatorSecretRef": {
          "name": "cluster-beijing-impersonator",
          "namespace": "karmada-cluster"
        }
      },
      "status": {
        "conditions": [
          {
            "type": "Ready",
            "status": "True",
            "lastTransitionTime": "2024-01-15T10:30:00Z",
            "message": "cluster is ready"
          }
        ],
        "nodeSummary": {
          "totalNum": 12,
          "readyNum": 12
        },
        "resourceSummary": {
          "allocatable": {
            "cpu": "120",
            "memory": "480Gi",
            "pods": "1320"
          },
          "allocated": {
            "cpu": "72",
            "memory": "288Gi",
            "pods": "789"
          }
        }
      },
      "joinedTime": "2024-01-01T00:00:00Z",
      "lastUpdateTime": "2024-01-15T10:30:00Z"
    }
  }
}
```

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

### v1.2.0 (2024-01-15) - 前端需求完善版
- ✅ **集群资源视图增强**: 增加区域、可用性、节点数、Pod数等详细信息
- ✅ **可视化调度接口**: 新增可视化调度集群信息和模拟接口
- ✅ **实时监控支持**: 实现实时监控数据获取，支持趋势分析
- ✅ **事件和告警系统**: 完善事件查询和告警规则管理
- ✅ **策略模板管理**: 支持策略模板列表、YAML验证功能
- ✅ **用户偏好设置**: 支持主题、语言、时区等个性化配置
- ✅ **审计日志完善**: 详细的操作记录和审计追踪
- ✅ **健康检查增强**: 系统组件和依赖项健康状态监控
- ✅ **集群管理升级**: 增加地理位置、版本、提供商等信息
- ✅ **概览信息增强**: 支持运行时长、详细版本信息

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
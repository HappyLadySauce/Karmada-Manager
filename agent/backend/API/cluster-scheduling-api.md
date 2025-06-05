# 集群调度 API 接口文档

## 概述
集群调度API提供了Karmada多集群工作负载调度的详细信息，包括工作负载分布、集群状态、节点级Pod分布等。

## 基础URL
```
http://localhost:8000/api/v1
```

## 接口列表

### 1. 获取调度概览
获取整体调度统计信息，包括工作负载总数、集群分布等。

**请求**
```http
GET /scheduling/overview?namespace={namespace}
```

**参数**
- `namespace` (可选): 命名空间过滤器

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "totalWorkloads": 2,
    "scheduledWorkloads": 2,
    "pendingWorkloads": 0,
    "failedWorkloads": 0,
    "clusterDistribution": [
      {
        "clusterName": "master",
        "workloadCount": 2,
        "totalReplicas": 8,
        "readyReplicas": 8,
        "nodeCount": 0,
        "readyNodes": 0,
        "clusterStatus": "Ready"
      }
    ],
    "namespaceStats": [
      {
        "namespace": "test",
        "workloadCount": 2,
        "scheduledCount": 2,
        "pendingCount": 0,
        "failedCount": 0
      }
    ]
  }
}
```

### 2. 获取命名空间工作负载调度信息
获取指定命名空间中的工作负载调度信息列表。

**请求**
```http
GET /scheduling/namespace/{namespace}/workloads?kind={kind}&page={page}&pageSize={pageSize}
```

**参数**
- `namespace`: 命名空间名称
- `kind` (可选): 工作负载类型过滤 (Deployment, StatefulSet, DaemonSet, Job, CronJob)
- `page` (可选): 页码，默认1
- `pageSize` (可选): 每页大小，默认20

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "data": [
      {
        "workloadInfo": {
          "name": "nginx-1",
          "namespace": "test",
          "kind": "Deployment",
          "apiVersion": "apps/v1",
          "replicas": 3,
          "readyReplicas": 3
        },
        "clusterPlacements": [
          {
            "clusterName": "master",
            "plannedReplicas": 3,
            "actualReplicas": 3,
            "reason": "根据调度策略分配 3 个副本"
          }
        ],
        "schedulingStatus": {
          "phase": "Scheduled",
          "message": "工作负载已成功调度到目标集群"
        },
        "totalReplicas": 3,
        "readyReplicas": 3,
        "createdTime": "2025-06-04T14:42:35Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 2
    }
  }
}
```

### 3. 获取工作负载基础调度信息
获取指定工作负载的基础调度信息。

**请求**
```http
GET /workloads/{namespace}/{name}/scheduling?kind={kind}
```

**参数**
- `namespace`: 命名空间名称
- `name`: 工作负载名称
- `kind`: 工作负载类型

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "workloadInfo": {
      "name": "nginx-1",
      "namespace": "test",
      "kind": "Deployment",
      "apiVersion": "apps/v1",
      "replicas": 3,
      "readyReplicas": 3
    },
    "propagationPolicy": {
      "name": "nginx-1",
      "namespace": "test",
      "clusterAffinity": {
        "clusterNames": ["branch", "master"]
      },
      "placement": {
        "replicaScheduling": {
          "replicaSchedulingType": "Divided",
          "replicaDivisionPreference": "Weighted"
        }
      }
    },
    "clusterPlacements": [
      {
        "clusterName": "master",
        "plannedReplicas": 3,
        "actualReplicas": 3,
        "reason": "根据调度策略分配 3 个副本"
      }
    ],
    "schedulingStatus": {
      "phase": "Scheduled",
      "message": "所有副本都已成功调度到目标集群"
    }
  }
}
```

### 4. 获取工作负载精确调度信息 🎯
获取指定工作负载的详细调度信息，包括节点级Pod分布。

**请求**
```http
GET /workloads/{namespace}/{name}/precise-scheduling?kind={kind}
```

**参数**
- `namespace`: 命名空间名称
- `name`: 工作负载名称  
- `kind`: 工作负载类型

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "workloadInfo": {
      "name": "nginx-1",
      "namespace": "test",
      "kind": "Deployment",
      "apiVersion": "apps/v1",
      "replicas": 3,
      "readyReplicas": 3
    },
    "propagationPolicy": {
      "name": "nginx-1",
      "namespace": "test",
      "clusterAffinity": {
        "clusterNames": ["branch", "master"]
      },
      "placement": {
        "replicaScheduling": {
          "replicaSchedulingType": "Divided",
          "replicaDivisionPreference": "Weighted",
          "weightPreference": {
            "staticWeightList": [
              {
                "targetCluster": {
                  "clusterNames": ["master"]
                },
                "weight": 2
              }
            ]
          }
        }
      }
    },
    "clusterPlacements": [
      {
        "clusterName": "master",
        "plannedReplicas": 3,
        "actualReplicas": 3,
        "reason": "根据调度策略分配 3 个副本",
        "nodePlacements": [
          {
            "nodeName": "m-rke2-master03.example.com",
            "podCount": 1,
            "runningPods": 1,
            "pendingPods": 0,
            "failedPods": 0,
            "nodeStatus": "Ready",
            "nodeIP": "10.10.10.13",
            "nodeRoles": ["master"],
            "podDetails": [
              {
                "podName": "nginx-1-658b854ff4-w9xrs",
                "podNamespace": "test",
                "podStatus": "Running",
                "podIP": "10.42.2.12",
                "restartCount": 0,
                "createdTime": "2025-06-04T14:42:36Z",
                "labels": {
                  "app": "nginx-1",
                  "pod-template-hash": "658b854ff4"
                }
              }
            ],
            "nodeResources": {
              "cpuCapacity": "4",
              "memoryCapacity": "7902480Ki",
              "cpuAllocatable": "4",
              "memoryAllocatable": "7902480Ki",
              "podCapacity": "110",
              "podAllocatable": "110"
            }
          }
        ],
        "clusterStatus": "Ready"
      }
    ],
    "schedulingStatus": {
      "phase": "Scheduled",
      "message": "所有副本都已成功调度到目标集群"
    },
    "totalReplicas": 3,
    "readyReplicas": 3
  }
}
```

## 数据结构说明

### WorkloadInfo - 工作负载信息
| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 工作负载名称 |
| namespace | string | 命名空间 |
| kind | string | 工作负载类型 |
| apiVersion | string | API版本 |
| replicas | int32 | 总副本数 |
| readyReplicas | int32 | 就绪副本数 |

### ClusterPlacement - 集群调度信息
| 字段 | 类型 | 说明 |
|------|------|------|
| clusterName | string | 集群名称 |
| plannedReplicas | int32 | 计划副本数 |
| actualReplicas | int32 | 实际副本数 |
| reason | string | 调度原因 |
| nodePlacements | []NodePlacement | 节点分布详情 |
| clusterStatus | string | 集群状态 |

### NodePlacement - 节点调度信息 🎯
| 字段 | 类型 | 说明 |
|------|------|------|
| nodeName | string | 节点名称 |
| podCount | int32 | Pod总数 |
| runningPods | int32 | 运行中Pod数 |
| pendingPods | int32 | 待调度Pod数 |
| failedPods | int32 | 失败Pod数 |
| nodeStatus | string | 节点状态 |
| nodeIP | string | 节点IP |
| nodeRoles | []string | 节点角色 |
| podDetails | []PodDetail | Pod详情列表 |
| nodeResources | NodeResources | 节点资源信息 |

### PodDetail - Pod详细信息 🎯
| 字段 | 类型 | 说明 |
|------|------|------|
| podName | string | Pod名称 |
| podNamespace | string | Pod命名空间 |
| podStatus | string | Pod状态 |
| podIP | string | Pod IP |
| restartCount | int32 | 重启次数 |
| createdTime | Time | 创建时间 |
| labels | map[string]string | Pod标签 |

### SchedulingStatus - 调度状态
| 字段 | 类型 | 说明 |
|------|------|------|
| phase | string | 调度阶段: Scheduled/Pending/Failed |
| message | string | 状态消息 |

## 使用示例

### 查看nginx-1工作负载的详细调度信息
```bash
curl "http://localhost:8000/api/v1/workloads/test/nginx-1/precise-scheduling?kind=Deployment"
```

### 查看test命名空间的所有Deployment
```bash
curl "http://localhost:8000/api/v1/scheduling/namespace/test/workloads?kind=Deployment"
```

### 查看整体调度概览
```bash
curl "http://localhost:8000/api/v1/scheduling/overview"
```

## 状态码说明
- `200`: 请求成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误 
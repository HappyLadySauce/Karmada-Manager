# 副本调度配置修复说明

## 🔧 问题修复

### 原始问题
用户在配置传播策略时，选择了以下配置：
- 分发偏好：**加权 (Weighted)**
- 调度类型：**分割 (Divided)**

但生成的 PropagationPolicy 无法正常调度工作负载，因为缺少权重配置。

### 修复内容

#### 1. **添加权重配置界面**
当选择"加权 + 分割"模式时，UI 自动显示权重配置区域：

```typescript
{/* 权重配置 - 仅在加权分发且选择了集群时显示 */}
{policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference === 'Weighted' && 
 policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType === 'Divided' &&
 policyConfig.spec.placement.clusters && policyConfig.spec.placement.clusters.length > 0 && (
  // 权重配置UI
)}
```

#### 2. **自动权重分配**
如果用户没有手动配置权重，系统自动为所有集群分配相等权重：

```typescript
// 如果是加权分发但没有配置权重，自动为所有集群设置相等权重
if (
  replicaScheduling.replicaDivisionPreference === 'Weighted' &&
  replicaScheduling.replicaSchedulingType === 'Divided' &&
  config.spec.placement.clusters &&
  config.spec.placement.clusters.length > 0
) {
  if (!replicaScheduling.weightPreference?.staticWeightList || 
      replicaScheduling.weightPreference.staticWeightList.length === 0) {
    replicaScheduling.weightPreference = {
      staticWeightList: config.spec.placement.clusters.map(cluster => ({
        targetCluster: { clusterNames: [cluster] },
        weight: 1
      }))
    };
  }
}
```

#### 3. **配置说明和提示**
添加了详细的配置说明，帮助用户理解不同选项：

- **聚合 vs 加权**：聚合尽量减少分布集群数，加权按比例分发
- **复制 vs 分割**：复制在每个集群创建完整副本，分割将总副本数分散

## 📋 修复后的配置示例

### 原始配置（有问题）
```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: nginx-1
  namespace: test
  labels:
    app: nginx-1
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx-1
      namespace: test
  placement:
    clusterAffinity:
      clusterNames:
        - branch
        - master
    replicaScheduling:
      replicaDivisionPreference: Weighted
      replicaSchedulingType: Divided
  preemption: Always
  conflictResolution: Abort
```

### 修复后的配置（正确）
```yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: nginx-1
  namespace: test
  labels:
    app: nginx-1
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx-1
      namespace: test
  placement:
    clusterAffinity:
      clusterNames:
        - branch
        - master
    replicaScheduling:
      replicaDivisionPreference: Weighted
      replicaSchedulingType: Divided
      weightPreference:
        staticWeightList:
          - targetCluster:
              clusterNames:
                - branch
            weight: 1
          - targetCluster:
              clusterNames:
                - master
            weight: 1
  preemption: Always
  conflictResolution: Abort
```

## 🎯 副本调度模式详解

### 1. **复制模式 (Duplicated)**
- **用途**：高可用部署，每个集群都有完整副本
- **示例**：如果 Deployment 有 3 个副本，每个集群都会创建 3 个副本
- **YAML**：
```yaml
replicaScheduling:
  replicaSchedulingType: Duplicated
```

### 2. **分割模式 (Divided)**
- **用途**：资源分片，总副本数分散到多个集群
- **示例**：如果 Deployment 有 6 个副本，可能 branch 集群分配 2 个，master 集群分配 4 个
- **YAML**：
```yaml
replicaScheduling:
  replicaSchedulingType: Divided
  replicaDivisionPreference: Weighted
  weightPreference:
    staticWeightList:
      - targetCluster:
          clusterNames: ["branch"]
        weight: 1
      - targetCluster:
          clusterNames: ["master"]
        weight: 2  # master 集群权重是 branch 的 2 倍
```

### 3. **权重分配示例**

假设有一个 6 副本的 Deployment，权重配置为 branch:1, master:2

- **总权重**: 1 + 2 = 3
- **branch 集群**: 6 × (1/3) = 2 个副本
- **master 集群**: 6 × (2/3) = 4 个副本

## 🚀 使用建议

### 推荐配置组合

1. **高可用场景**
   ```yaml
   replicaScheduling:
     replicaSchedulingType: Duplicated
   ```

2. **负载均衡场景**
   ```yaml
   replicaScheduling:
     replicaDivisionPreference: Aggregated
     replicaSchedulingType: Divided
   ```

3. **按集群能力分配**
   ```yaml
   replicaScheduling:
     replicaDivisionPreference: Weighted
     replicaSchedulingType: Divided
     weightPreference:
       staticWeightList:
         - targetCluster: { clusterNames: ["high-performance-cluster"] }
           weight: 3
         - targetCluster: { clusterNames: ["standard-cluster"] }
           weight: 1
   ```

## ✅ 验证步骤

1. 创建传播策略
2. 检查生成的 YAML 包含完整的权重配置
3. 部署 Deployment 并验证副本分配是否符合预期
4. 查看各集群的副本数量是否按权重比例分配

通过这些修复，副本调度功能现在能够正确工作，用户可以灵活配置多集群的副本分配策略。 
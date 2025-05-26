# Karmada Dashboard 数据库设计文档

## 概述

Karmada Dashboard 后端主要基于 Kubernetes 和 Karmada API 进行数据操作，不直接使用传统的关系型数据库。本文档描述了系统中使用的数据模型、存储方案和数据访问模式。

## 数据存储架构

### 存储层级
1. **Kubernetes API Server** - 存储 Kubernetes 原生资源
2. **Karmada API Server** - 存储 Karmada 策略和集群信息
3. **内存缓存** - 临时存储计算结果和会话数据
4. **配置文件** - 存储应用配置和静态数据

### 数据分类
- **集群资源数据** - Deployment、Service、Pod 等工作负载
- **策略数据** - PropagationPolicy、OverridePolicy 等分发策略
- **集群管理数据** - 成员集群信息、状态监控
- **元数据** - 标签、注解、命名空间等
- **临时数据** - 调度模拟结果、缓存数据

## 核心数据模型

### 1. 工作负载资源模型

#### Deployment 数据模型
```go
type DeploymentFormRequest struct {
    // 基础元数据
    Name      string            `json:"name" binding:"required"`
    Namespace string            `json:"namespace" binding:"required"`
    Labels    map[string]string `json:"labels,omitempty"`
    
    // 部署规格
    Replicas   int32           `json:"replicas" binding:"min=0"`
    Containers []ContainerSpec `json:"containers" binding:"required"`
    InitContainers []ContainerSpec `json:"initContainers,omitempty"`
    Volumes    []VolumeSpec    `json:"volumes,omitempty"`
    
    // 部署策略
    Strategy *DeploymentStrategySpec `json:"strategy,omitempty"`
    
    // 分发策略
    PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

type ContainerSpec struct {
    Name         string                     `json:"name" binding:"required"`
    Image        string                     `json:"image" binding:"required"`
    Ports        []ContainerPortSpec        `json:"ports,omitempty"`
    Env          []EnvVarSpec              `json:"env,omitempty"`
    Resources    *ResourceRequirementsSpec  `json:"resources,omitempty"`
    VolumeMounts []VolumeMountSpec         `json:"volumeMounts,omitempty"`
    LivenessProbe  *ProbeSpec              `json:"livenessProbe,omitempty"`
    ReadinessProbe *ProbeSpec              `json:"readinessProbe,omitempty"`
}
```

#### StatefulSet 数据模型
```go
type StatefulSetFormRequest struct {
    // 继承基础工作负载字段
    Name      string            `json:"name" binding:"required"`
    Namespace string            `json:"namespace" binding:"required"`
    Labels    map[string]string `json:"labels,omitempty"`
    Replicas  int32             `json:"replicas" binding:"min=0"`
    
    // StatefulSet 特有字段
    ServiceName          string                        `json:"serviceName" binding:"required"`
    VolumeClaimTemplates []PersistentVolumeClaimSpec   `json:"volumeClaimTemplates,omitempty"`
    UpdateStrategy       *StatefulSetUpdateStrategy    `json:"updateStrategy,omitempty"`
    
    // 通用字段
    Containers     []ContainerSpec `json:"containers" binding:"required"`
    InitContainers []ContainerSpec `json:"initContainers,omitempty"`
    Volumes        []VolumeSpec    `json:"volumes,omitempty"`
    
    PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

type PersistentVolumeClaimSpec struct {
    Name         string            `json:"name" binding:"required"`
    AccessModes  []string          `json:"accessModes" binding:"required"`
    Size         string            `json:"size" binding:"required"`
    StorageClass string            `json:"storageClass,omitempty"`
    Labels       map[string]string `json:"labels,omitempty"`
}
```

#### DaemonSet 数据模型
```go
type DaemonSetFormRequest struct {
    Name      string            `json:"name" binding:"required"`
    Namespace string            `json:"namespace" binding:"required"`
    Labels    map[string]string `json:"labels,omitempty"`
    
    Containers     []ContainerSpec `json:"containers" binding:"required"`
    InitContainers []ContainerSpec `json:"initContainers,omitempty"`
    Volumes        []VolumeSpec    `json:"volumes,omitempty"`
    
    // DaemonSet 特有字段
    NodeSelector   map[string]string        `json:"nodeSelector,omitempty"`
    Tolerations    []TolerationSpec         `json:"tolerations,omitempty"`
    UpdateStrategy *DaemonSetUpdateStrategy `json:"updateStrategy,omitempty"`
    
    PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

type TolerationSpec struct {
    Key      string `json:"key,omitempty"`
    Value    string `json:"value,omitempty"`
    Operator string `json:"operator,omitempty"`
    Effect   string `json:"effect,omitempty"`
}
```

#### Job/CronJob 数据模型
```go
type JobFormRequest struct {
    Name      string            `json:"name" binding:"required"`
    Namespace string            `json:"namespace" binding:"required"`
    Labels    map[string]string `json:"labels,omitempty"`
    
    Containers     []ContainerSpec `json:"containers" binding:"required"`
    InitContainers []ContainerSpec `json:"initContainers,omitempty"`
    Volumes        []VolumeSpec    `json:"volumes,omitempty"`
    
    // Job 特有字段
    RestartPolicy          string `json:"restartPolicy,omitempty"`
    Completions            *int32 `json:"completions,omitempty"`
    Parallelism            *int32 `json:"parallelism,omitempty"`
    BackoffLimit           *int32 `json:"backoffLimit,omitempty"`
    ActiveDeadlineSeconds  *int64 `json:"activeDeadlineSeconds,omitempty"`
    
    PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

type CronJobFormRequest struct {
    // 继承 Job 的所有字段
    JobFormRequest
    
    // CronJob 特有字段
    Schedule                     string `json:"schedule" binding:"required"`
    ConcurrencyPolicy           string `json:"concurrencyPolicy,omitempty"`
    Suspend                     *bool  `json:"suspend,omitempty"`
    SuccessfulJobsHistoryLimit  *int32 `json:"successfulJobsHistoryLimit,omitempty"`
    FailedJobsHistoryLimit      *int32 `json:"failedJobsHistoryLimit,omitempty"`
    StartingDeadlineSeconds     *int64 `json:"startingDeadlineSeconds,omitempty"`
}
```

### 2. 服务资源模型

```go
type ServiceFormRequest struct {
    Name      string            `json:"name" binding:"required"`
    Namespace string            `json:"namespace" binding:"required"`
    Labels    map[string]string `json:"labels,omitempty"`
    
    Type     string                `json:"type" binding:"required"`
    Selector map[string]string     `json:"selector" binding:"required"`
    Ports    []ServicePortSpec     `json:"ports" binding:"required"`
    
    PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

type ServicePortSpec struct {
    Name       string `json:"name,omitempty"`
    Port       int32  `json:"port" binding:"required"`
    TargetPort int32  `json:"targetPort" binding:"required"`
    Protocol   string `json:"protocol,omitempty"`
    NodePort   int32  `json:"nodePort,omitempty"`
}
```

### 3. 策略管理模型

#### 策略表单创建模型
```go
type PolicyFormRequest struct {
    Name              string                    `json:"name" binding:"required"`
    Namespace         string                    `json:"namespace,omitempty"` // 为空时创建ClusterPropagationPolicy
    ResourceSelectors []PolicyResourceSelector  `json:"resourceSelectors" binding:"required,min=1"`
    Placement         PlacementSpec             `json:"placement" binding:"required"`
    Override          *OverrideRulesSpec        `json:"override,omitempty"`
    Scheduling        string                    `json:"scheduling,omitempty"` // Duplicated, Divided
}

type PolicyResourceSelector struct {
    APIVersion    string            `json:"apiVersion" binding:"required"`
    Kind          string            `json:"kind" binding:"required"`
    Name          string            `json:"name,omitempty"`
    Namespace     string            `json:"namespace,omitempty"`
    LabelSelector map[string]string `json:"labelSelector,omitempty"`
}
```

#### 策略模板生成模型（增强版）
```go
type PolicyTemplateRequest struct {
    // 基础信息
    PolicyType     string `json:"policyType" binding:"required"` // propagation, override
    IsClusterScope bool   `json:"isClusterScope"`
    
    // 自定义元数据
    Name      string            `json:"name,omitempty"`      // 策略名称，用户可自定义
    Namespace string            `json:"namespace,omitempty"` // 命名空间，用户可自定义
    Labels    map[string]string `json:"labels,omitempty"`    // 自定义标签
    
    // 资源选择器
    ResourceSelectors []PolicyResourceSelector `json:"resourceSelectors"`
    
    // 放置策略（灵活配置）
    Clusters       []string          `json:"clusters,omitempty"`       // 目标集群列表
    ClusterLabels  map[string]string `json:"clusterLabels,omitempty"`  // 集群标签选择器
    SchedulingType string            `json:"schedulingType,omitempty"` // Duplicated, Divided
    
    // 副本调度配置（支持权重分配）
    StaticWeightList []StaticWeightSpec `json:"staticWeightList,omitempty"`
    
    // 覆盖策略配置（仅当 PolicyType 为 override 时）
    OverrideRules *OverrideRulesSpec `json:"overrideRules,omitempty"`
    TargetCluster *ClusterTarget     `json:"targetCluster,omitempty"`
}

type StaticWeightSpec struct {
    TargetCluster TargetClusterSpec `json:"targetCluster"`
    Weight        int32             `json:"weight"`
}

type TargetClusterSpec struct {
    ClusterNames []string `json:"clusterNames"`
}

type ClusterTarget struct {
    ClusterNames  []string          `json:"clusterNames,omitempty"`
    ClusterLabels map[string]string `json:"clusterLabels,omitempty"`
}
```

#### 通用策略配置模型
```go
type PropagationPolicyConfig struct {
    Create    bool          `json:"create"`
    Name      string        `json:"name,omitempty"`
    Placement PlacementSpec `json:"placement"`
}

type PlacementSpec struct {
    ClusterSelector  *LabelSelector     `json:"clusterSelector,omitempty"`
    ClusterAffinity  *ClusterAffinity   `json:"clusterAffinity,omitempty"`
    ReplicaScheduling *ReplicaSchedulingSpec `json:"replicaScheduling,omitempty"`
}

type ClusterAffinity struct {
    ClusterNames []string `json:"clusterNames,omitempty"`
}

type LabelSelector struct {
    MatchLabels map[string]string `json:"matchLabels,omitempty"`
}

type ReplicaSchedulingSpec struct {
    ReplicaSchedulingType string              `json:"replicaSchedulingType,omitempty"`
    WeightPreference      *WeightPreference   `json:"weightPreference,omitempty"`
}

type WeightPreference struct {
    StaticWeightList []StaticWeightRule `json:"staticWeightList,omitempty"`
}

type StaticWeightRule struct {
    TargetCluster ClusterAffinity `json:"targetCluster"`
    Weight        int32           `json:"weight"`
}

type OverrideRulesSpec struct {
    ImageOverrides []ImageOverride `json:"imageOverrides,omitempty"`
    Args           []string        `json:"args,omitempty"`
    Command        []string        `json:"command,omitempty"`
}

type ImageOverride struct {
    Component string              `json:"component"`
    Replicas  map[string]string   `json:"replicas"`
}
```

### 4. 调度可视化模型

```go
type ResourceSchedulingTreeRequest struct {
    ResourceType string `json:"resourceType" form:"resourceType"`
    ResourceName string `json:"resourceName" form:"resourceName"`
    Namespace    string `json:"namespace" form:"namespace"`
}

type ResourceSchedulingTreeResponse struct {
    Nodes []TreeNode `json:"nodes"`
    Edges []TreeEdge `json:"edges"`
}

type TreeNode struct {
    ID         string                 `json:"id"`
    Type       string                 `json:"type"`
    Name       string                 `json:"name"`
    Namespace  string                 `json:"namespace,omitempty"`
    Status     string                 `json:"status"`
    Properties map[string]interface{} `json:"properties,omitempty"`
    Position   *NodePosition          `json:"position,omitempty"`
    Style      *NodeStyle             `json:"style,omitempty"`
}

type TreeEdge struct {
    ID     string     `json:"id"`
    Source string     `json:"source"`
    Target string     `json:"target"`
    Type   string     `json:"type"`
    Label  string     `json:"label,omitempty"`
    Status string     `json:"status"`
    Style  *EdgeStyle `json:"style,omitempty"`
}
```

### 5. 集群资源视图模型（增强版）

```go
type ClustersResourceView struct {
    Clusters []ClusterResourceInfo `json:"clusters"`
}

type ClusterResourceInfo struct {
    Name         string            `json:"name"`
    DisplayName  string            `json:"displayName,omitempty"`
    Region       string            `json:"region,omitempty"`
    Zone         string            `json:"zone,omitempty"`
    Status       string            `json:"status"`
    Version      string            `json:"version,omitempty"`
    Provider     string            `json:"provider,omitempty"`
    Labels       map[string]string `json:"labels,omitempty"`
    Resources    ResourceMetrics   `json:"resources"`
    Taints       []TaintInfo       `json:"taints,omitempty"`
    LoadLevel    string            `json:"loadLevel"`
    NodeCount    int32             `json:"nodeCount"`
    PodCount     int32             `json:"podCount"`
    Availability int32             `json:"availability"`
    Location     *LocationInfo     `json:"location,omitempty"`
    Capabilities []string          `json:"capabilities,omitempty"`
    JoinedTime   time.Time         `json:"joinedTime,omitempty"`
}

type ResourceMetrics struct {
    CPU    ResourceMetric `json:"cpu"`
    Memory ResourceMetric `json:"memory"`
    Pod    PodMetric      `json:"pod"`
    Storage *ResourceMetric `json:"storage,omitempty"`
}

type ResourceMetric struct {
    Capacity    int64 `json:"capacity"`
    Allocatable int64 `json:"allocatable"`
    Allocated   int64 `json:"allocated"`
    Unit        string `json:"unit,omitempty"`
}

type PodMetric struct {
    Capacity    int64 `json:"capacity"`
    Allocatable int64 `json:"allocatable"`
    Allocated   int64 `json:"allocated"`
}

type TaintInfo struct {
    Key    string `json:"key"`
    Value  string `json:"value"`
    Effect string `json:"effect"`
}

type LocationInfo struct {
    Country   string  `json:"country"`
    City      string  `json:"city"`
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
}
```

### 6. 实时监控数据模型

```go
type RealtimeMonitoringData struct {
    Timestamp time.Time              `json:"timestamp"`
    Clusters  []ClusterMonitoringInfo `json:"clusters"`
    Alerts    []AlertInfo             `json:"alerts"`
}

type ClusterMonitoringInfo struct {
    Name      string               `json:"name"`
    Status    string               `json:"status"`
    Resources ClusterResourceUsage `json:"resources"`
}

type ClusterResourceUsage struct {
    CPU    ResourceUsageInfo `json:"cpu"`
    Memory ResourceUsageInfo `json:"memory"`
    Pods   PodUsageInfo      `json:"pods"`
}

type ResourceUsageInfo struct {
    Usage float64 `json:"usage"` // 使用率百分比
    Trend string  `json:"trend"` // up, down, stable
}

type PodUsageInfo struct {
    Count int32  `json:"count"`
    Trend string `json:"trend"`
}

type AlertInfo struct {
    Level     string    `json:"level"`     // info, warning, error
    Message   string    `json:"message"`
    Timestamp time.Time `json:"timestamp"`
    Source    string    `json:"source"`
}
```

### 7. 事件和告警模型

```go
type EventInfo struct {
    ID        string                 `json:"id"`
    Timestamp time.Time              `json:"timestamp"`
    Type      string                 `json:"type"`      // Info, Warning, Error
    Source    string                 `json:"source"`    // 事件源
    Message   string                 `json:"message"`
    Severity  string                 `json:"severity"`  // low, medium, high, critical
    Category  string                 `json:"category"`  // resource, network, storage, etc.
    Details   map[string]interface{} `json:"details,omitempty"`
}

type AlertRule struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    Condition string `json:"condition"`
    Severity  string `json:"severity"`
    Enabled   bool   `json:"enabled"`
    Actions   []AlertAction `json:"actions,omitempty"`
}

type AlertAction struct {
    Type   string                 `json:"type"`   // email, webhook, slack
    Config map[string]interface{} `json:"config"`
}
```

### 8. 策略模板模型

```go
type PolicyTemplate struct {
    ID          string              `json:"id"`
    Name        string              `json:"name"`
    Description string              `json:"description"`
    Category    string              `json:"category"` // workload, service, config
    Type        string              `json:"type"`     // propagation, override
    Template    string              `json:"template"` // YAML模板内容
    Variables   []TemplateVariable  `json:"variables"`
    Tags        []string            `json:"tags,omitempty"`
    CreatedAt   time.Time           `json:"createdAt"`
    UpdatedAt   time.Time           `json:"updatedAt"`
}

type TemplateVariable struct {
    Name        string      `json:"name"`
    Type        string      `json:"type"`        // string, number, boolean, array, object
    Description string      `json:"description"`
    Required    bool        `json:"required"`
    Default     interface{} `json:"default,omitempty"`
    Options     []string    `json:"options,omitempty"` // 枚举选项
}

type PolicyValidationResult struct {
    Valid       bool     `json:"valid"`
    Errors      []string `json:"errors"`
    Warnings    []string `json:"warnings"`
    Suggestions []string `json:"suggestions"`
}
```

### 9. 用户偏好设置模型

```go
type UserPreferences struct {
    UserID          string                 `json:"userId"`
    Theme           string                 `json:"theme"`           // light, dark, auto
    Language        string                 `json:"language"`        // zh-CN, en-US, etc.
    Timezone        string                 `json:"timezone"`        // Asia/Shanghai, UTC, etc.
    DefaultCluster  string                 `json:"defaultCluster,omitempty"`
    DashboardLayout DashboardLayoutConfig  `json:"dashboardLayout"`
    Notifications   NotificationConfig     `json:"notifications"`
    CreatedAt       time.Time              `json:"createdAt"`
    UpdatedAt       time.Time              `json:"updatedAt"`
}

type DashboardLayoutConfig struct {
    Overview        []string `json:"overview"`        // 概览页组件顺序
    RefreshInterval int32    `json:"refreshInterval"` // 自动刷新间隔（秒）
    PageSize        int32    `json:"pageSize"`        // 默认分页大小
}

type NotificationConfig struct {
    Email   bool `json:"email"`
    Browser bool `json:"browser"`
    Sound   bool `json:"sound"`
}
```

### 10. 审计日志模型

```go
type AuditLog struct {
    ID           string                 `json:"id"`
    Timestamp    time.Time              `json:"timestamp"`
    User         string                 `json:"user"`
    Action       string                 `json:"action"`       // create, update, delete, get
    Resource     string                 `json:"resource"`     // deployment, service, policy
    ResourceName string                 `json:"resourceName"`
    Namespace    string                 `json:"namespace,omitempty"`
    Cluster      string                 `json:"cluster,omitempty"`
    Result       string                 `json:"result"`       // success, failure
    Details      map[string]interface{} `json:"details,omitempty"`
    ClientIP     string                 `json:"clientIP,omitempty"`
    UserAgent    string                 `json:"userAgent,omitempty"`
}

type AuditQuery struct {
    User       string    `json:"user,omitempty"`
    Action     string    `json:"action,omitempty"`
    Resource   string    `json:"resource,omitempty"`
    StartTime  time.Time `json:"startTime,omitempty"`
    EndTime    time.Time `json:"endTime,omitempty"`
    Page       int32     `json:"page"`
    Limit      int32     `json:"limit"`
}
```

### 11. 系统健康检查模型

```go
type SystemHealth struct {
    Status     string              `json:"status"`     // healthy, degraded, unhealthy
    Timestamp  time.Time           `json:"timestamp"`
    Uptime     string              `json:"uptime"`
    Version    string              `json:"version"`
    Components []ComponentHealth   `json:"components,omitempty"`
}

type ComponentHealth struct {
    Name      string    `json:"name"`
    Status    string    `json:"status"`    // healthy, warning, error
    Message   string    `json:"message"`
    LastCheck time.Time `json:"lastCheck"`
    Metrics   map[string]interface{} `json:"metrics,omitempty"`
}

type SystemDependencies struct {
    Dependencies []DependencyHealth `json:"dependencies"`
}

type DependencyHealth struct {
    Name    string                 `json:"name"`
    Status  string                 `json:"status"`
    Latency string                 `json:"latency,omitempty"`
    Message string                 `json:"message,omitempty"`
    Details map[string]interface{} `json:"details,omitempty"`
}
```

## 数据访问模式

### 1. Kubernetes API 访问
```go
// 获取 Kubernetes 客户端
restConfig, _, err := client.GetKarmadaConfig()
clientset, err := kubernetes.NewForConfig(restConfig)

// 创建资源
deployment, err := clientset.AppsV1().Deployments(namespace).Create(ctx, deployment, metav1.CreateOptions{})

// 更新资源
deployment, err := clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})

// 删除资源
err := clientset.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
```

### 2. Karmada API 访问
```go
// 获取 Karmada 客户端
karmadaClient := client.InClusterKarmadaClient()

// 创建分发策略
policy, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).Create(ctx, policy, metav1.CreateOptions{})

// 获取集群列表
clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
```

### 3. 集群资源视图数据访问
```go
// 获取集群资源视图
func GetClusterResourcesView(page, limit int) (*ClustersResourceView, error) {
    karmadaClient := client.InClusterKarmadaClient()
    
    // 获取所有集群
    clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
    if err != nil {
        return nil, err
    }
    
    var resourceView ClustersResourceView
    
    for _, cluster := range clusters.Items {
        clusterInfo := ClusterResourceInfo{
            Name:         cluster.Name,
            DisplayName:  getDisplayName(cluster),
            Region:       getRegion(cluster),
            Zone:         getZone(cluster),
            Status:       string(cluster.Status.Conditions[0].Status),
            Version:      cluster.Status.KubernetesVersion,
            Provider:     getProvider(cluster),
            Labels:       cluster.Labels,
            Location:     getLocationInfo(cluster),
            JoinedTime:   cluster.CreationTimestamp.Time,
        }
        
        // 获取集群资源使用情况
        resourceMetrics, err := getClusterResourceMetrics(cluster.Name)
        if err == nil {
            clusterInfo.Resources = resourceMetrics
        }
        
        // 获取污点信息
        taints, err := getClusterTaints(cluster.Name)
        if err == nil {
            clusterInfo.Taints = taints
        }
        
        // 计算负载等级
        clusterInfo.LoadLevel = calculateLoadLevel(clusterInfo.Resources)
        
        resourceView.Clusters = append(resourceView.Clusters, clusterInfo)
    }
    
    // 分页处理
    start := (page - 1) * limit
    end := start + limit
    if start < len(resourceView.Clusters) {
        if end > len(resourceView.Clusters) {
            end = len(resourceView.Clusters)
        }
        resourceView.Clusters = resourceView.Clusters[start:end]
    }
    
    return &resourceView, nil
}
```

### 4. 实时监控数据访问
```go
// 获取实时监控数据
func GetRealtimeMonitoringData() (*RealtimeMonitoringData, error) {
    data := &RealtimeMonitoringData{
        Timestamp: time.Now(),
    }
    
    // 获取集群监控信息
    clusters, err := getClusterMonitoringInfo()
    if err != nil {
        return nil, err
    }
    data.Clusters = clusters
    
    // 获取告警信息
    alerts, err := getActiveAlerts()
    if err != nil {
        return nil, err
    }
    data.Alerts = alerts
    
    return data, nil
}

// 获取集群监控信息
func getClusterMonitoringInfo() ([]ClusterMonitoringInfo, error) {
    karmadaClient := client.InClusterKarmadaClient()
    clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
    if err != nil {
        return nil, err
    }
    
    var monitoringInfo []ClusterMonitoringInfo
    
    for _, cluster := range clusters.Items {
        info := ClusterMonitoringInfo{
            Name:   cluster.Name,
            Status: string(cluster.Status.Conditions[0].Status),
        }
        
        // 获取资源使用情况
        usage, err := getResourceUsage(cluster.Name)
        if err == nil {
            info.Resources = usage
        }
        
        monitoringInfo = append(monitoringInfo, info)
    }
    
    return monitoringInfo, nil
}
```

### 5. 事件和告警数据访问
```go
// 获取最近事件
func GetRecentEvents(limit int, severity, source string) ([]EventInfo, error) {
    // 从 Kubernetes 事件 API 获取事件
    clientset, err := getKubernetesClient()
    if err != nil {
        return nil, err
    }
    
    events, err := clientset.CoreV1().Events("").List(ctx, metav1.ListOptions{
        Limit: int64(limit),
    })
    if err != nil {
        return nil, err
    }
    
    var eventInfos []EventInfo
    
    for _, event := range events.Items {
        if severity != "" && !matchesSeverity(event, severity) {
            continue
        }
        if source != "" && !matchesSource(event, source) {
            continue
        }
        
        eventInfo := EventInfo{
            ID:        string(event.UID),
            Timestamp: event.LastTimestamp.Time,
            Type:      event.Type,
            Source:    event.Source.Component,
            Message:   event.Message,
            Severity:  determineSeverity(event),
            Category:  determineCategory(event),
            Details:   buildEventDetails(event),
        }
        
        eventInfos = append(eventInfos, eventInfo)
    }
    
    return eventInfos, nil
}

// 获取告警规则
func GetAlertRules() ([]AlertRule, error) {
    // 这里可以从配置文件或数据库读取告警规则
    // 示例实现
    rules := []AlertRule{
        {
            ID:        "rule-001",
            Name:      "CPU使用率告警",
            Condition: "cpu_usage > 80",
            Severity:  "warning",
            Enabled:   true,
        },
        {
            ID:        "rule-002",
            Name:      "内存使用率告警",
            Condition: "memory_usage > 85",
            Severity:  "warning",
            Enabled:   true,
        },
    }
    
    return rules, nil
}
```

### 6. 用户偏好设置数据访问
```go
// 用户偏好设置接口
type UserPreferencesStore interface {
    GetUserPreferences(userID string) (*UserPreferences, error)
    UpdateUserPreferences(userID string, prefs *UserPreferences) error
}

// 内存实现（生产环境可使用数据库）
type MemoryUserPreferencesStore struct {
    preferences map[string]*UserPreferences
    mutex       sync.RWMutex
}

func (s *MemoryUserPreferencesStore) GetUserPreferences(userID string) (*UserPreferences, error) {
    s.mutex.RLock()
    defer s.mutex.RUnlock()
    
    if prefs, exists := s.preferences[userID]; exists {
        return prefs, nil
    }
    
    // 返回默认偏好设置
    return &UserPreferences{
        UserID:   userID,
        Theme:    "light",
        Language: "zh-CN",
        Timezone: "Asia/Shanghai",
        DashboardLayout: DashboardLayoutConfig{
            Overview:        []string{"clusters", "resources", "policies"},
            RefreshInterval: 30,
            PageSize:        20,
        },
        Notifications: NotificationConfig{
            Email:   true,
            Browser: true,
            Sound:   false,
        },
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }, nil
}

func (s *MemoryUserPreferencesStore) UpdateUserPreferences(userID string, prefs *UserPreferences) error {
    s.mutex.Lock()
    defer s.mutex.Unlock()
    
    prefs.UserID = userID
    prefs.UpdatedAt = time.Now()
    
    if s.preferences == nil {
        s.preferences = make(map[string]*UserPreferences)
    }
    
    s.preferences[userID] = prefs
    return nil
}
```

### 7. 审计日志数据访问
```go
// 审计日志存储接口
type AuditLogStore interface {
    LogAction(log *AuditLog) error
    QueryLogs(query *AuditQuery) ([]AuditLog, int64, error)
}

// 文件存储实现
type FileAuditLogStore struct {
    logFile string
    mutex   sync.Mutex
}

func (s *FileAuditLogStore) LogAction(log *AuditLog) error {
    s.mutex.Lock()
    defer s.mutex.Unlock()
    
    log.ID = generateLogID()
    log.Timestamp = time.Now()
    
    file, err := os.OpenFile(s.logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return err
    }
    defer file.Close()
    
    logData, err := json.Marshal(log)
    if err != nil {
        return err
    }
    
    _, err = file.WriteString(string(logData) + "\n")
    return err
}

func (s *FileAuditLogStore) QueryLogs(query *AuditQuery) ([]AuditLog, int64, error) {
    file, err := os.Open(s.logFile)
    if err != nil {
        return nil, 0, err
    }
    defer file.Close()
    
    var logs []AuditLog
    scanner := bufio.NewScanner(file)
    
    for scanner.Scan() {
        var log AuditLog
        if err := json.Unmarshal(scanner.Bytes(), &log); err != nil {
            continue
        }
        
        if matchesQuery(&log, query) {
            logs = append(logs, log)
        }
    }
    
    // 分页处理
    total := int64(len(logs))
    start := (query.Page - 1) * query.Limit
    end := start + query.Limit
    
    if start < int32(len(logs)) {
        if end > int32(len(logs)) {
            end = int32(len(logs))
        }
        logs = logs[start:end]
    } else {
        logs = []AuditLog{}
    }
    
    return logs, total, nil
}
```

### 3. 缓存策略
```go
// 内存缓存接口（示例）
type Cache interface {
    Get(key string) (interface{}, bool)
    Set(key string, value interface{}, duration time.Duration)
    Delete(key string)
}

// 缓存使用模式
func GetClusterInfo(clusterName string) (*ClusterInfo, error) {
    // 先查缓存
    if cached, exists := cache.Get("cluster:" + clusterName); exists {
        return cached.(*ClusterInfo), nil
    }
    
    // 缓存未命中，查询 API
    cluster, err := karmadaClient.ClusterV1alpha1().Clusters().Get(ctx, clusterName, metav1.GetOptions{})
    if err != nil {
        return nil, err
    }
    
    info := convertToClusterInfo(cluster)
    
    // 设置缓存，5分钟过期
    cache.Set("cluster:"+clusterName, info, 5*time.Minute)
    
    return info, nil
}
```

## 数据一致性保证

### 1. 事务处理
由于基于 Kubernetes API，使用乐观锁机制：
```go
// 使用 resourceVersion 实现乐观锁
func UpdateDeploymentWithRetry(namespace, name string, updateFunc func(*appsv1.Deployment)) error {
    return retry.RetryOnConflict(retry.DefaultRetry, func() error {
        // 获取当前版本
        deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
        if err != nil {
            return err
        }
        
        // 应用更新
        updateFunc(deployment)
        
        // 提交更新（如果 resourceVersion 不匹配会返回冲突错误）
        _, err = clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
        return err
    })
}
```

### 2. 错误处理和重试
```go
type ErrorHandler struct {
    MaxRetries int
    BackoffStrategy BackoffStrategy
}

func (h *ErrorHandler) HandleAPIError(err error) error {
    if apierrors.IsConflict(err) {
        // 资源冲突，需要重试
        return h.retryWithBackoff()
    } else if apierrors.IsNotFound(err) {
        // 资源不存在
        return fmt.Errorf("resource not found: %v", err)
    } else if apierrors.IsUnauthorized(err) {
        // 权限不足
        return fmt.Errorf("unauthorized access: %v", err)
    }
    
    return err
}
```

## 性能优化策略

### 1. 批量操作
```go
// 批量获取资源
func GetMultipleDeployments(namespace string, names []string) ([]*appsv1.Deployment, error) {
    var deployments []*appsv1.Deployment
    var errs []error
    
    // 使用 goroutine 并发获取
    ch := make(chan *appsv1.Deployment, len(names))
    errCh := make(chan error, len(names))
    
    for _, name := range names {
        go func(n string) {
            deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, n, metav1.GetOptions{})
            if err != nil {
                errCh <- err
                return
            }
            ch <- deployment
        }(name)
    }
    
    // 收集结果
    for i := 0; i < len(names); i++ {
        select {
        case deployment := <-ch:
            deployments = append(deployments, deployment)
        case err := <-errCh:
            errs = append(errs, err)
        }
    }
    
    if len(errs) > 0 {
        return deployments, fmt.Errorf("部分获取失败: %v", errs)
    }
    
    return deployments, nil
}
```

### 2. 分页查询
```go
func ListResourcesWithPagination(namespace string, limit int, continueToken string) (*ResourceList, error) {
    listOptions := metav1.ListOptions{
        Limit:    int64(limit),
        Continue: continueToken,
    }
    
    result, err := clientset.AppsV1().Deployments(namespace).List(ctx, listOptions)
    if err != nil {
        return nil, err
    }
    
    return &ResourceList{
        Items:        result.Items,
        Continue:     result.Continue,
        TotalCount:   len(result.Items),
        HasMore:      result.Continue != "",
    }, nil
}
```

### 3. 字段选择器优化
```go
// 只获取需要的字段，减少网络传输
func GetDeploymentStatus(namespace, name string) (*DeploymentStatus, error) {
    deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{
        FieldSelector: "metadata.name=" + name,
        ResourceVersion: "0", // 允许从缓存读取
    })
    if err != nil {
        return nil, err
    }
    
    return &DeploymentStatus{
        Name:            deployment.Name,
        Replicas:        deployment.Status.Replicas,
        ReadyReplicas:   deployment.Status.ReadyReplicas,
        UpdatedReplicas: deployment.Status.UpdatedReplicas,
        Conditions:      deployment.Status.Conditions,
    }, nil
}
```

## 数据备份和恢复

### 1. 资源导出
```go
func ExportResources(namespace string, resourceTypes []string) ([]byte, error) {
    var resources []unstructured.Unstructured
    
    for _, resourceType := range resourceTypes {
        items, err := getResourcesByType(namespace, resourceType)
        if err != nil {
            return nil, err
        }
        resources = append(resources, items...)
    }
    
    // 序列化为 YAML
    return yaml.Marshal(resources)
}
```

### 2. 资源导入
```go
func ImportResources(yamlData []byte, dryRun bool) error {
    var resources []unstructured.Unstructured
    
    err := yaml.Unmarshal(yamlData, &resources)
    if err != nil {
        return err
    }
    
    for _, resource := range resources {
        if dryRun {
            // 验证模式，不实际创建
            err = validateResource(&resource)
        } else {
            // 实际创建资源
            err = createResource(&resource)
        }
        
        if err != nil {
            return err
        }
    }
    
    return nil
}
```

## 监控和指标

### 1. 数据访问指标
```go
type Metrics struct {
    APICallsTotal      prometheus.CounterVec
    APICallDuration    prometheus.HistogramVec
    CacheHitRate       prometheus.GaugeVec
    ActiveConnections  prometheus.Gauge
}

func (m *Metrics) RecordAPICall(method, resource string, duration time.Duration, status string) {
    m.APICallsTotal.WithLabelValues(method, resource, status).Inc()
    m.APICallDuration.WithLabelValues(method, resource).Observe(duration.Seconds())
}
```

### 2. 健康检查
```go
func HealthCheck() error {
    // 检查 Kubernetes API 连接
    if err := checkKubernetesAPI(); err != nil {
        return fmt.Errorf("kubernetes API 不可用: %v", err)
    }
    
    // 检查 Karmada API 连接
    if err := checkKarmadaAPI(); err != nil {
        return fmt.Errorf("karmada API 不可用: %v", err)
    }
    
    // 检查缓存状态
    if err := checkCacheHealth(); err != nil {
        return fmt.Errorf("缓存服务异常: %v", err)
    }
    
    return nil
}
```

## 总结

Karmada Dashboard 后端采用了基于 Kubernetes/Karmada API 的无数据库架构，具有以下特点：

1. **云原生设计** - 直接使用 Kubernetes API 作为数据存储层
2. **高可用性** - 依托 Kubernetes 集群的高可用性保证
3. **一致性保证** - 通过 Kubernetes 的 resourceVersion 机制实现乐观锁
4. **扩展性良好** - 支持多集群环境下的数据统一管理
5. **实时性强** - 直接从 API Server 获取最新数据

这种设计避免了传统关系型数据库的复杂性，同时充分利用了 Kubernetes 生态的优势。 
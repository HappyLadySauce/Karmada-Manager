/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package scheduling

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	schedulingpkg "github.com/karmada-io/dashboard/pkg/resource/scheduling"
	workv1alpha2 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha2"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
)

// 辅助函数：解析整数参数
func parseIntParameter(c *gin.Context, key string, defaultValue int) int {
	valueStr := c.Query(key)
	if valueStr == "" {
		return defaultValue
	}
	
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	
	return value
}

// 精确调度信息结构
type PreciseSchedulingInfo struct {
	WorkloadInfo      schedulingpkg.WorkloadInfo      `json:"workloadInfo"`
	PropagationPolicy *schedulingpkg.PolicyInfo       `json:"propagationPolicy,omitempty"`
	ClusterPlacements []PreciseClusterPlacement       `json:"clusterPlacements"`
	SchedulingStatus  schedulingpkg.SchedulingStatus  `json:"schedulingStatus"`
	TotalReplicas     int32                           `json:"totalReplicas"`
	ReadyReplicas     int32                           `json:"readyReplicas"`
}

// 精确集群调度信息
type PreciseClusterPlacement struct {
	ClusterName      string             `json:"clusterName"`
	PlannedReplicas  int32              `json:"plannedReplicas"`
	ActualReplicas   int32              `json:"actualReplicas"`
	Weight           int32              `json:"weight,omitempty"`
	Reason           string             `json:"reason"`
	NodePlacements   []NodePlacement    `json:"nodePlacements"`
	ClusterStatus    string             `json:"clusterStatus"`
	ClusterVersion   string             `json:"clusterVersion,omitempty"`
}

// 节点调度信息
type NodePlacement struct {
	NodeName        string      `json:"nodeName"`
	PodCount        int32       `json:"podCount"`
	RunningPods     int32       `json:"runningPods"`
	PendingPods     int32       `json:"pendingPods"`
	FailedPods      int32       `json:"failedPods"`
	NodeStatus      string      `json:"nodeStatus"`
	NodeIP          string      `json:"nodeIP,omitempty"`
	NodeRoles       []string    `json:"nodeRoles"`
	PodDetails      []PodDetail `json:"podDetails"`
	NodeResources   NodeResources `json:"nodeResources"`
}

// Pod详细信息
type PodDetail struct {
	PodName       string            `json:"podName"`
	PodNamespace  string            `json:"podNamespace"`
	PodStatus     string            `json:"podStatus"`
	PodIP         string            `json:"podIP,omitempty"`
	RestartCount  int32             `json:"restartCount"`
	CreatedTime   metav1.Time       `json:"createdTime"`
	Labels        map[string]string `json:"labels,omitempty"`
}

// 节点资源信息
type NodeResources struct {
	CPUCapacity      string `json:"cpuCapacity"`
	MemoryCapacity   string `json:"memoryCapacity"`
	CPUAllocatable   string `json:"cpuAllocatable"`
	MemoryAllocatable string `json:"memoryAllocatable"`
	PodCapacity      string `json:"podCapacity"`
	PodAllocatable   string `json:"podAllocatable"`
}

// 调度概览统计
type SchedulingOverview struct {
	TotalWorkloads      int32                      `json:"totalWorkloads"`
	ScheduledWorkloads  int32                      `json:"scheduledWorkloads"`
	PendingWorkloads    int32                      `json:"pendingWorkloads"`
	FailedWorkloads     int32                      `json:"failedWorkloads"`
	ClusterDistribution []ClusterDistribution      `json:"clusterDistribution"`
	NamespaceStats      []NamespaceSchedulingStats `json:"namespaceStats"`
}

// 集群分布统计
type ClusterDistribution struct {
	ClusterName    string `json:"clusterName"`
	WorkloadCount  int32  `json:"workloadCount"`
	TotalReplicas  int32  `json:"totalReplicas"`
	ReadyReplicas  int32  `json:"readyReplicas"`
	NodeCount      int32  `json:"nodeCount"`
	ReadyNodes     int32  `json:"readyNodes"`
	ClusterStatus  string `json:"clusterStatus"`
}

// 命名空间调度统计
type NamespaceSchedulingStats struct {
	Namespace         string `json:"namespace"`
	WorkloadCount     int32  `json:"workloadCount"`
	ScheduledCount    int32  `json:"scheduledCount"`
	PendingCount      int32  `json:"pendingCount"`
	FailedCount       int32  `json:"failedCount"`
}

// 处理获取工作负载调度信息
func handleGetWorkloadScheduling(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	kind := c.Query("kind") // 从查询参数获取kind

	if kind == "" {
		kind = "Deployment" // 默认值
	}

	karmadaClient := client.InClusterKarmadaClient()
	result, err := schedulingpkg.GetWorkloadScheduling(karmadaClient, namespace, name, kind)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

// 处理获取精确调度信息
func handleGetPreciseSchedulingInfo(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	kind := c.Query("kind")

	if kind == "" {
		kind = "Deployment"
	}

	karmadaClient := client.InClusterKarmadaClient()
	
	// 获取基础调度信息
	basicInfo, err := schedulingpkg.GetWorkloadScheduling(karmadaClient, namespace, name, kind)
	if err != nil {
		klog.ErrorS(err, "获取基础调度信息失败", "namespace", namespace, "name", name, "kind", kind)
		common.Fail(c, err)
		return
	}

	// 增强调度信息，获取节点级别详情
	preciseInfo, err := enhanceSchedulingInfo(basicInfo)
	if err != nil {
		klog.ErrorS(err, "增强调度信息失败", "namespace", namespace, "name", name)
		common.Fail(c, err)
		return
	}

	common.Success(c, preciseInfo)
}

// 处理获取调度概览信息
func handleGetSchedulingOverview(c *gin.Context) {
	namespaceFilter := c.Query("namespace")
	
	karmadaClient := client.InClusterKarmadaClient()
	
	overview, err := getSchedulingOverview(karmadaClient, namespaceFilter)
	if err != nil {
		klog.ErrorS(err, "获取调度概览失败")
		common.Fail(c, err)
		return
	}

	common.Success(c, overview)
}

// 处理批量获取命名空间工作负载调度信息
func handleGetNamespaceWorkloadsScheduling(c *gin.Context) {
	namespace := c.Param("namespace")
	page := parseIntParameter(c, "page", 1)
	pageSize := parseIntParameter(c, "pageSize", 20)
	kindFilter := c.Query("kind")

	karmadaClient := client.InClusterKarmadaClient()
	
	result, err := getNamespaceWorkloadsScheduling(karmadaClient, namespace, page, pageSize, kindFilter)
	if err != nil {
		klog.ErrorS(err, "获取命名空间工作负载调度信息失败", "namespace", namespace)
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

// 增强调度信息，获取节点级别详情
func enhanceSchedulingInfo(basicInfo *schedulingpkg.WorkloadSchedulingView) (*PreciseSchedulingInfo, error) {
	preciseInfo := &PreciseSchedulingInfo{
		WorkloadInfo:      basicInfo.WorkloadInfo,
		PropagationPolicy: basicInfo.PropagationPolicy,
		SchedulingStatus:  basicInfo.SchedulingStatus,
		TotalReplicas:     basicInfo.WorkloadInfo.Replicas,
		ReadyReplicas:     basicInfo.WorkloadInfo.ReadyReplicas,
	}

	klog.InfoS("开始增强调度信息", 
		"workload", fmt.Sprintf("%s/%s", basicInfo.WorkloadInfo.Namespace, basicInfo.WorkloadInfo.Name),
		"kind", basicInfo.WorkloadInfo.Kind,
		"status", basicInfo.SchedulingStatus.Phase,
		"basicClusterPlacements", len(basicInfo.ClusterPlacements))

	// 如果基础调度信息中有集群调度，则增强这些信息
	if len(basicInfo.ClusterPlacements) > 0 {
		klog.InfoS("处理已有的集群调度信息", "clusterCount", len(basicInfo.ClusterPlacements))
		precisePlacements := make([]PreciseClusterPlacement, 0, len(basicInfo.ClusterPlacements))

		for _, placement := range basicInfo.ClusterPlacements {
			klog.InfoS("处理集群调度", 
				"cluster", placement.ClusterName,
				"plannedReplicas", placement.PlannedReplicas,
				"actualReplicas", placement.ActualReplicas)

			precisePlacement := PreciseClusterPlacement{
				ClusterName:     placement.ClusterName,
				PlannedReplicas: placement.PlannedReplicas,
				ActualReplicas:  placement.ActualReplicas,
				Weight:          placement.Weight,
				Reason:          placement.Reason,
				ClusterStatus:   "Ready", // 默认状态，后续可从集群信息获取
			}

			// 获取集群中的节点级别调度信息
			nodePlacements, err := getNodePlacementsInCluster(placement.ClusterName, basicInfo.WorkloadInfo)
			if err != nil {
				klog.ErrorS(err, "获取集群节点调度信息失败", "cluster", placement.ClusterName)
				// 不让单个集群的错误影响整个请求
				nodePlacements = []NodePlacement{}
			}

			klog.InfoS("获取到节点调度信息", "cluster", placement.ClusterName, "nodeCount", len(nodePlacements))
			precisePlacement.NodePlacements = nodePlacements
			precisePlacements = append(precisePlacements, precisePlacement)
		}

		preciseInfo.ClusterPlacements = precisePlacements
	} else {
		// 如果没有基础调度信息，尝试从传播策略获取潜在的集群信息
		klog.InfoS("没有基础集群调度信息，尝试从传播策略获取集群信息")
		
		var targetClusters []string
		if basicInfo.PropagationPolicy != nil && basicInfo.PropagationPolicy.ClusterAffinity != nil {
			targetClusters = basicInfo.PropagationPolicy.ClusterAffinity.ClusterNames
			klog.InfoS("从传播策略获取目标集群", "clusters", targetClusters)
		}

		if len(targetClusters) > 0 {
			// 为传播策略中的集群创建占位符调度信息
			precisePlacements := make([]PreciseClusterPlacement, 0, len(targetClusters))
			
			for _, clusterName := range targetClusters {
				klog.InfoS("为目标集群创建占位符调度信息", "cluster", clusterName)
				
				precisePlacement := PreciseClusterPlacement{
					ClusterName:     clusterName,
					PlannedReplicas: 0, // 尚未调度
					ActualReplicas:  0,
					Weight:          0,
					Reason:          "工作负载尚未调度到此集群",
					ClusterStatus:   "Ready",
					NodePlacements:  []NodePlacement{}, // 空的节点调度
				}

				// 即使没有实际调度，也可以获取集群的节点信息作为潜在的调度目标
				if basicInfo.SchedulingStatus.Phase == "Pending" {
					potentialNodes, err := getPotentialNodesInCluster(clusterName)
					if err != nil {
						klog.ErrorS(err, "获取集群潜在节点失败", "cluster", clusterName)
					} else {
						klog.InfoS("获取到集群潜在节点", "cluster", clusterName, "nodeCount", len(potentialNodes))
						precisePlacement.NodePlacements = potentialNodes
					}
				}

				precisePlacements = append(precisePlacements, precisePlacement)
			}
			
			preciseInfo.ClusterPlacements = precisePlacements
		} else {
			klog.InfoS("没有传播策略集群信息，返回空的集群调度信息")
			preciseInfo.ClusterPlacements = []PreciseClusterPlacement{}
		}
	}

	klog.InfoS("完成调度信息增强", 
		"finalClusterCount", len(preciseInfo.ClusterPlacements),
		"totalReplicas", preciseInfo.TotalReplicas,
		"readyReplicas", preciseInfo.ReadyReplicas)

	return preciseInfo, nil
}

// 获取集群的潜在节点信息（用于尚未调度的工作负载）
func getPotentialNodesInCluster(clusterName string) ([]NodePlacement, error) {
	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		return nil, fmt.Errorf("无法获取集群 %s 的客户端", clusterName)
	}

	// 获取节点列表
	nodes, err := memberClient.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取节点列表失败: %w", err)
	}

	klog.InfoS("获取到集群节点", "cluster", clusterName, "nodeCount", len(nodes.Items))

	nodePlacements := make([]NodePlacement, 0, len(nodes.Items))

	for _, node := range nodes.Items {
		// 获取节点角色
		nodeRoles := getNodeRoles(&node)

		// 获取节点IP
		nodeIP := getNodeInternalIP(&node)

		// 获取节点资源信息
		nodeResources := getNodeResources(&node)

		// 创建潜在节点调度信息（没有实际的Pod）
		nodePlacement := NodePlacement{
			NodeName:      node.Name,
			PodCount:      0, // 没有实际调度的Pod
			RunningPods:   0,
			PendingPods:   0,
			FailedPods:    0,
			NodeStatus:    getNodeStatus(&node),
			NodeIP:        nodeIP,
			NodeRoles:     nodeRoles,
			PodDetails:    []PodDetail{}, // 空的Pod详情
			NodeResources: nodeResources,
		}

		nodePlacements = append(nodePlacements, nodePlacement)
	}

	klog.InfoS("创建潜在节点调度信息", "cluster", clusterName, "nodeCount", len(nodePlacements))
	return nodePlacements, nil
}

// 获取集群中的节点级别调度信息
func getNodePlacementsInCluster(clusterName string, workloadInfo schedulingpkg.WorkloadInfo) ([]NodePlacement, error) {
	klog.InfoS("开始获取集群节点调度信息", 
		"cluster", clusterName, 
		"workload", fmt.Sprintf("%s/%s", workloadInfo.Namespace, workloadInfo.Name),
		"kind", workloadInfo.Kind)

	memberClient := client.InClusterClientForMemberCluster(clusterName)
	if memberClient == nil {
		return nil, fmt.Errorf("无法获取集群 %s 的客户端", clusterName)
	}

	// 获取节点列表
	nodes, err := memberClient.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取节点列表失败: %w", err)
	}

	klog.InfoS("获取到集群节点列表", "cluster", clusterName, "nodeCount", len(nodes.Items))

	nodePlacements := make([]NodePlacement, 0, len(nodes.Items))
	totalPodsFound := 0

	for _, node := range nodes.Items {
		klog.InfoS("处理节点", "cluster", clusterName, "node", node.Name)

		// 获取节点上的相关 Pod
		pods, err := getPodsOnNodeForWorkload(memberClient, node.Name, workloadInfo)
		if err != nil {
			klog.ErrorS(err, "获取节点Pod信息失败", "cluster", clusterName, "node", node.Name)
			continue
		}

		klog.InfoS("获取到节点Pod信息", 
			"cluster", clusterName, 
			"node", node.Name, 
			"podCount", len(pods))

		totalPodsFound += len(pods)

		// 统计 Pod 状态
		runningCount, pendingCount, failedCount := countPodsByStatus(pods)

		// 获取节点角色
		nodeRoles := getNodeRoles(&node)

		// 获取节点IP
		nodeIP := getNodeInternalIP(&node)

		// 获取节点资源信息
		nodeResources := getNodeResources(&node)

		// 创建 Pod 详情
		podDetails := make([]PodDetail, 0, len(pods))
		for _, pod := range pods {
			podDetail := PodDetail{
				PodName:      pod.Name,
				PodNamespace: pod.Namespace,
				PodStatus:    string(pod.Status.Phase),
				PodIP:        pod.Status.PodIP,
				RestartCount: getTotalRestartCount(pod.Status.ContainerStatuses),
				CreatedTime:  pod.CreationTimestamp,
				Labels:       pod.Labels,
			}
			podDetails = append(podDetails, podDetail)
		}

		nodePlacement := NodePlacement{
			NodeName:      node.Name,
			PodCount:      int32(len(pods)),
			RunningPods:   runningCount,
			PendingPods:   pendingCount,
			FailedPods:    failedCount,
			NodeStatus:    getNodeStatus(&node),
			NodeIP:        nodeIP,
			NodeRoles:     nodeRoles,
			PodDetails:    podDetails,
			NodeResources: nodeResources,
		}

		nodePlacements = append(nodePlacements, nodePlacement)
	}

	klog.InfoS("完成集群节点调度信息获取", 
		"cluster", clusterName, 
		"totalNodes", len(nodePlacements),
		"totalPodsFound", totalPodsFound)

	return nodePlacements, nil
}

// 获取节点上指定工作负载的 Pod
func getPodsOnNodeForWorkload(memberClient kubernetes.Interface, nodeName string, workloadInfo schedulingpkg.WorkloadInfo) ([]corev1.Pod, error) {
	klog.InfoS("开始获取节点上的工作负载Pod", 
		"node", nodeName, 
		"workload", fmt.Sprintf("%s/%s", workloadInfo.Namespace, workloadInfo.Name),
		"kind", workloadInfo.Kind)

	// 使用字段选择器过滤节点上的 Pod
	fieldSelector := fields.OneTermEqualSelector("spec.nodeName", nodeName).String()
	
	pods, err := memberClient.CoreV1().Pods(workloadInfo.Namespace).List(context.TODO(), metav1.ListOptions{
		FieldSelector: fieldSelector,
	})
	if err != nil {
		klog.ErrorS(err, "获取节点Pod列表失败", "node", nodeName, "namespace", workloadInfo.Namespace)
		return nil, err
	}

	klog.InfoS("获取到节点上的所有Pod", 
		"node", nodeName, 
		"namespace", workloadInfo.Namespace,
		"totalPods", len(pods.Items))

	// 过滤出属于指定工作负载的 Pod
	workloadPods := make([]corev1.Pod, 0)
	for _, pod := range pods.Items {
		if isWorkloadPod(&pod, workloadInfo) {
			klog.InfoS("找到匹配的工作负载Pod", 
				"node", nodeName, 
				"pod", pod.Name,
				"status", pod.Status.Phase)
			workloadPods = append(workloadPods, pod)
		}
	}

	klog.InfoS("完成节点工作负载Pod筛选", 
		"node", nodeName, 
		"workload", fmt.Sprintf("%s/%s", workloadInfo.Namespace, workloadInfo.Name),
		"matchedPods", len(workloadPods),
		"totalPods", len(pods.Items))

	return workloadPods, nil
}

// 判断 Pod 是否属于指定工作负载
func isWorkloadPod(pod *corev1.Pod, workloadInfo schedulingpkg.WorkloadInfo) bool {
	// 首先检查标签（这是最直接的方式）
	if pod.Labels != nil {
		// 检查 app 标签
		if appName, exists := pod.Labels["app"]; exists && appName == workloadInfo.Name {
			return true
		}
		// 检查 app.kubernetes.io/name 标签
		if appName, exists := pod.Labels["app.kubernetes.io/name"]; exists && appName == workloadInfo.Name {
			return true
		}
	}

	// 检查 OwnerReference (更严格的匹配)
	for _, ownerRef := range pod.OwnerReferences {
		if ownerRef.Kind == workloadInfo.Kind && ownerRef.Name == workloadInfo.Name {
			return true
		}
		// 对于 Deployment，需要检查 ReplicaSet 的所有者
		if workloadInfo.Kind == "Deployment" && ownerRef.Kind == "ReplicaSet" {
			// 在实际应用中，这里应该查询ReplicaSet的OwnerReference
			// 暂时通过Pod的标签进行简化匹配
			if pod.Labels != nil {
				if appName, exists := pod.Labels["app"]; exists && appName == workloadInfo.Name {
					return true
				}
			}
		}
	}

	return false
}

// 统计 Pod 状态
func countPodsByStatus(pods []corev1.Pod) (running, pending, failed int32) {
	for _, pod := range pods {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			running++
		case corev1.PodPending:
			pending++
		case corev1.PodFailed:
			failed++
		}
	}
	return
}

// 获取节点角色
func getNodeRoles(node *corev1.Node) []string {
	roles := make([]string, 0)
	for labelKey := range node.Labels {
		if labelKey == "node-role.kubernetes.io/master" || labelKey == "node-role.kubernetes.io/control-plane" {
			roles = append(roles, "master")
		} else if labelKey == "node-role.kubernetes.io/worker" {
			roles = append(roles, "worker")
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker") // 默认角色
	}
	return roles
}

// 获取节点内部IP
func getNodeInternalIP(node *corev1.Node) string {
	for _, address := range node.Status.Addresses {
		if address.Type == corev1.NodeInternalIP {
			return address.Address
		}
	}
	return ""
}

// 获取节点状态
func getNodeStatus(node *corev1.Node) string {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionTrue {
			return "Ready"
		}
	}
	return "NotReady"
}

// 获取节点资源信息
func getNodeResources(node *corev1.Node) NodeResources {
	return NodeResources{
		CPUCapacity:       node.Status.Capacity.Cpu().String(),
		MemoryCapacity:    node.Status.Capacity.Memory().String(),
		CPUAllocatable:    node.Status.Allocatable.Cpu().String(),
		MemoryAllocatable: node.Status.Allocatable.Memory().String(),
		PodCapacity:       node.Status.Capacity.Pods().String(),
		PodAllocatable:    node.Status.Allocatable.Pods().String(),
	}
}

// 获取容器重启总次数
func getTotalRestartCount(containerStatuses []corev1.ContainerStatus) int32 {
	var total int32 = 0
	for _, status := range containerStatuses {
		total += status.RestartCount
	}
	return total
}

// 获取调度概览信息
func getSchedulingOverview(karmadaClient karmadaclientset.Interface, namespaceFilter string) (*SchedulingOverview, error) {
	klog.InfoS("开始获取调度概览", "namespaceFilter", namespaceFilter)
	
	// 获取所有ResourceBinding
	var resourceBindings []workv1alpha2.ResourceBinding
	if namespaceFilter != "" {
		bindings, err := karmadaClient.WorkV1alpha2().ResourceBindings(namespaceFilter).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to list resource bindings in namespace %s: %w", namespaceFilter, err)
		}
		resourceBindings = bindings.Items
	} else {
		// 获取所有命名空间的ResourceBinding
		bindings, err := karmadaClient.WorkV1alpha2().ResourceBindings("").List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to list all resource bindings: %w", err)
		}
		resourceBindings = bindings.Items
	}

	klog.InfoS("获取到ResourceBinding列表", "count", len(resourceBindings))

	// 统计概览信息
	overview := &SchedulingOverview{
		TotalWorkloads:      int32(len(resourceBindings)),
		ScheduledWorkloads:  0,
		PendingWorkloads:    0,
		FailedWorkloads:     0,
		ClusterDistribution: []ClusterDistribution{},
		NamespaceStats:      []NamespaceSchedulingStats{},
	}

	// 集群分布统计
	clusterStats := make(map[string]*ClusterDistribution)
	// 命名空间统计
	namespaceStats := make(map[string]*NamespaceSchedulingStats)

	for _, binding := range resourceBindings {
		// 统计工作负载状态
		if isWorkloadScheduled(binding) {
			overview.ScheduledWorkloads++
		} else if isWorkloadPending(binding) {
			overview.PendingWorkloads++
		} else {
			overview.FailedWorkloads++
		}

		// 统计集群分布
		for _, cluster := range binding.Spec.Clusters {
			if clusterStats[cluster.Name] == nil {
				clusterStats[cluster.Name] = &ClusterDistribution{
					ClusterName:    cluster.Name,
					WorkloadCount:  0,
					TotalReplicas:  0,
					ReadyReplicas:  0,
					ClusterStatus:  "Ready", // 简化处理
				}
			}
			clusterStats[cluster.Name].WorkloadCount++
			clusterStats[cluster.Name].TotalReplicas += cluster.Replicas
			clusterStats[cluster.Name].ReadyReplicas += getActualReplicasFromBinding(binding, cluster.Name)
		}

		// 统计命名空间分布
		namespace := binding.Namespace
		if namespaceStats[namespace] == nil {
			namespaceStats[namespace] = &NamespaceSchedulingStats{
				Namespace:      namespace,
				WorkloadCount:  0,
				ScheduledCount: 0,
				PendingCount:   0,
				FailedCount:    0,
			}
		}
		namespaceStats[namespace].WorkloadCount++
		if isWorkloadScheduled(binding) {
			namespaceStats[namespace].ScheduledCount++
		} else if isWorkloadPending(binding) {
			namespaceStats[namespace].PendingCount++
		} else {
			namespaceStats[namespace].FailedCount++
		}
	}

	// 转换map为slice
	for _, clusterStat := range clusterStats {
		overview.ClusterDistribution = append(overview.ClusterDistribution, *clusterStat)
	}
	for _, namespaceStat := range namespaceStats {
		overview.NamespaceStats = append(overview.NamespaceStats, *namespaceStat)
	}

	klog.InfoS("调度概览统计完成", 
		"totalWorkloads", overview.TotalWorkloads,
		"scheduledWorkloads", overview.ScheduledWorkloads,
		"clusterCount", len(overview.ClusterDistribution),
		"namespaceCount", len(overview.NamespaceStats))

	return overview, nil
}

// 获取命名空间工作负载调度信息
func getNamespaceWorkloadsScheduling(karmadaClient karmadaclientset.Interface, namespace string, page, pageSize int, kindFilter string) (interface{}, error) {
	klog.InfoS("开始获取命名空间工作负载调度信息", 
		"namespace", namespace, 
		"page", page, 
		"pageSize", pageSize,
		"kindFilter", kindFilter)

	// 获取指定命名空间的ResourceBinding
	bindings, err := karmadaClient.WorkV1alpha2().ResourceBindings(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list resource bindings in namespace %s: %w", namespace, err)
	}

	klog.InfoS("获取到ResourceBinding列表", "namespace", namespace, "count", len(bindings.Items))

	// 根据kindFilter过滤
	var filteredBindings []workv1alpha2.ResourceBinding
	for _, binding := range bindings.Items {
		if kindFilter == "" || binding.Spec.Resource.Kind == kindFilter {
			filteredBindings = append(filteredBindings, binding)
		}
	}

	klog.InfoS("过滤后的ResourceBinding", "filteredCount", len(filteredBindings))

	// 分页处理
	total := len(filteredBindings)
	start := (page - 1) * pageSize
	end := start + pageSize

	if start >= total {
		start = total
	}
	if end > total {
		end = total
	}

	pagedBindings := filteredBindings[start:end]

	// 转换为前端所需的格式
	workloadViews := make([]interface{}, 0, len(pagedBindings))
	for _, binding := range pagedBindings {
		workloadView, err := convertResourceBindingToWorkloadView(binding)
		if err != nil {
			klog.ErrorS(err, "转换ResourceBinding失败", "name", binding.Name)
			continue
		}
		workloadViews = append(workloadViews, workloadView)
	}

	result := map[string]interface{}{
		"data": workloadViews,
		"pagination": map[string]interface{}{
			"page":     page,
			"pageSize": pageSize,
			"total":    total,
		},
	}

	klog.InfoS("完成命名空间工作负载调度信息获取", 
		"namespace", namespace,
		"returnedCount", len(workloadViews),
		"total", total)

	return result, nil
}

// 辅助函数：判断工作负载是否已调度
func isWorkloadScheduled(binding workv1alpha2.ResourceBinding) bool {
	// 首先检查Scheduled条件
	for _, condition := range binding.Status.Conditions {
		if condition.Type == "Scheduled" && condition.Status == metav1.ConditionTrue {
			return true
		}
	}
	// 如果没有明确的Scheduled条件，但有集群分配，也认为已调度
	return len(binding.Spec.Clusters) > 0
}

// 辅助函数：判断工作负载是否处于待调度状态
func isWorkloadPending(binding workv1alpha2.ResourceBinding) bool {
	// 首先检查Scheduled条件是否为False
	for _, condition := range binding.Status.Conditions {
		if condition.Type == "Scheduled" && condition.Status == metav1.ConditionFalse {
			return true
		}
	}
	// 如果没有集群分配，也认为待调度
	if len(binding.Spec.Clusters) == 0 {
		return true
	}
	// 检查是否有FullyApplied条件为False（部分调度失败）
	for _, condition := range binding.Status.Conditions {
		if condition.Type == "FullyApplied" && condition.Status == metav1.ConditionFalse {
			return true
		}
	}
	return false
}

// 辅助函数：将ResourceBinding转换为工作负载视图
func convertResourceBindingToWorkloadView(binding workv1alpha2.ResourceBinding) (interface{}, error) {
	// 计算集群分布
	clusterPlacements := make([]schedulingpkg.ClusterPlacement, 0, len(binding.Spec.Clusters))
	totalReplicas := int32(0)
	
	for _, cluster := range binding.Spec.Clusters {
		actualReplicas := getActualReplicasFromBinding(binding, cluster.Name)
		placement := schedulingpkg.ClusterPlacement{
			ClusterName:     cluster.Name,
			PlannedReplicas: cluster.Replicas,
			ActualReplicas:  actualReplicas,
			Reason:          fmt.Sprintf("根据调度策略分配 %d 个副本", cluster.Replicas),
		}
		clusterPlacements = append(clusterPlacements, placement)
		totalReplicas += cluster.Replicas
	}

	// 确定调度状态
	var schedulingStatus schedulingpkg.SchedulingStatus
	if isWorkloadScheduled(binding) {
		schedulingStatus = schedulingpkg.SchedulingStatus{
			Phase:   "Scheduled",
			Message: "工作负载已成功调度到目标集群",
		}
	} else if isWorkloadPending(binding) {
		schedulingStatus = schedulingpkg.SchedulingStatus{
			Phase:   "Pending",
			Message: "工作负载等待调度",
		}
	} else {
		schedulingStatus = schedulingpkg.SchedulingStatus{
			Phase:   "Failed",
			Message: "工作负载调度失败",
		}
	}

	workloadInfo := schedulingpkg.WorkloadInfo{
		Name:          binding.Spec.Resource.Name,
		Namespace:     binding.Spec.Resource.Namespace,
		Kind:          binding.Spec.Resource.Kind,
		APIVersion:    binding.Spec.Resource.APIVersion,
		Replicas:      totalReplicas,
		ReadyReplicas: calculateReadyReplicasFromStatus(binding.Status.AggregatedStatus),
	}

	return map[string]interface{}{
		"workloadInfo":      workloadInfo,
		"clusterPlacements": clusterPlacements,
		"schedulingStatus":  schedulingStatus,
		"totalReplicas":     totalReplicas,
		"readyReplicas":     workloadInfo.ReadyReplicas,
		"createdTime":       binding.CreationTimestamp,
	}, nil
}

// 辅助函数：从聚合状态计算就绪副本数
func calculateReadyReplicasFromStatus(aggregatedStatus []workv1alpha2.AggregatedStatusItem) int32 {
	readyReplicas := int32(0)
	for _, status := range aggregatedStatus {
		if status.Status != nil && status.Status.Raw != nil {
			// 解析status字段，它包含具体的部署状态
			var statusMap map[string]interface{}
			if err := json.Unmarshal(status.Status.Raw, &statusMap); err != nil {
				continue
			}
			
			// 尝试获取readyReplicas字段
			if readyReplicasInterface, exists := statusMap["readyReplicas"]; exists {
				switch readyReplicasVal := readyReplicasInterface.(type) {
				case int32:
					readyReplicas += readyReplicasVal
				case int:
					readyReplicas += int32(readyReplicasVal)
				case float64:
					readyReplicas += int32(readyReplicasVal)
				}
			}
		}
	}
	return readyReplicas
}

// 辅助函数：从ResourceBinding中获取特定集群的实际副本数
func getActualReplicasFromBinding(binding workv1alpha2.ResourceBinding, clusterName string) int32 {
	for _, status := range binding.Status.AggregatedStatus {
		if status.ClusterName == clusterName && status.Status != nil && status.Status.Raw != nil {
			var statusMap map[string]interface{}
			if err := json.Unmarshal(status.Status.Raw, &statusMap); err != nil {
				continue
			}
			
			// 优先使用readyReplicas，其次使用availableReplicas
			if readyReplicasInterface, exists := statusMap["readyReplicas"]; exists {
				switch readyReplicasVal := readyReplicasInterface.(type) {
				case int32:
					return readyReplicasVal
				case int:
					return int32(readyReplicasVal)
				case float64:
					return int32(readyReplicasVal)
				}
			}
			
			if availableReplicasInterface, exists := statusMap["availableReplicas"]; exists {
				switch availableReplicasVal := availableReplicasInterface.(type) {
				case int32:
					return availableReplicasVal
				case int:
					return int32(availableReplicasVal)
				case float64:
					return int32(availableReplicasVal)
				}
			}
		}
	}
	return 0
}

func init() {
	r := router.V1()
	// 基础调度信息
	r.GET("/workloads/:namespace/:name/scheduling", handleGetWorkloadScheduling)
	// 精确调度信息（包含节点级别详情）
	r.GET("/workloads/:namespace/:name/precise-scheduling", handleGetPreciseSchedulingInfo)
	// 调度概览
	r.GET("/scheduling/overview", handleGetSchedulingOverview)
	// 批量获取命名空间工作负载调度信息
	r.GET("/scheduling/namespace/:namespace/workloads", handleGetNamespaceWorkloadsScheduling)
}

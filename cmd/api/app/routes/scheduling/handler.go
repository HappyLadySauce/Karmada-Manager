/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package scheduling

import (
	"context"
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
	// 检查 OwnerReference
	for _, ownerRef := range pod.OwnerReferences {
		if ownerRef.Kind == workloadInfo.Kind && ownerRef.Name == workloadInfo.Name {
			return true
		}
		// 对于 Deployment，Pod 的直接所有者是 ReplicaSet
		if workloadInfo.Kind == "Deployment" && ownerRef.Kind == "ReplicaSet" {
			// 可以进一步检查 ReplicaSet 的所有者是否是目标 Deployment
			return true
		}
	}

	// 检查标签
	if pod.Labels != nil {
		if appName, exists := pod.Labels["app"]; exists && appName == workloadInfo.Name {
			return true
		}
		if appName, exists := pod.Labels["app.kubernetes.io/name"]; exists && appName == workloadInfo.Name {
			return true
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
	// TODO: 实现完整的概览统计逻辑
	// 这里提供一个基础框架
	
	overview := &SchedulingOverview{
		TotalWorkloads:      0,
		ScheduledWorkloads:  0,
		PendingWorkloads:    0,
		FailedWorkloads:     0,
		ClusterDistribution: []ClusterDistribution{},
		NamespaceStats:      []NamespaceSchedulingStats{},
	}
	
	return overview, nil
}

// 获取命名空间工作负载调度信息
func getNamespaceWorkloadsScheduling(karmadaClient karmadaclientset.Interface, namespace string, page, pageSize int, kindFilter string) (interface{}, error) {
	// TODO: 实现批量获取逻辑
	// 这里提供一个基础框架
	
	result := map[string]interface{}{
		"data": []interface{}{},
		"pagination": map[string]interface{}{
			"page":     page,
			"pageSize": pageSize,
			"total":    0,
		},
	}
	
	return result, nil
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

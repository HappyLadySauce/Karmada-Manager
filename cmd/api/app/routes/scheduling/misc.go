/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package scheduling

import (
	"context"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"

	clusterv1alpha1 "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	policyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	karmada "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/cluster"
)

// GetClustersResourcesView 获取集群资源视图
func GetClustersResourcesView(ds *dataselect.DataSelectQuery) (*v1.ClustersResourceView, error) {
	karmadaClient := client.InClusterKarmadaClient()

	// 获取集群列表
	clusterList, err := cluster.GetClusterList(karmadaClient, ds)
	if err != nil {
		return nil, fmt.Errorf("获取集群列表失败: %v", err)
	}

	result := &v1.ClustersResourceView{
		Clusters: make([]v1.ClusterResourceInfo, 0),
	}

	for _, clusterItem := range clusterList.Clusters {
		clusterInfo := v1.ClusterResourceInfo{
			Name:   clusterItem.ObjectMeta.Name,
			Status: string(clusterItem.Ready),
			Labels: clusterItem.ObjectMeta.Labels,
			Resources: v1.ResourceMetrics{
				CPU: v1.ResourceMetric{
					Capacity:    clusterItem.AllocatedResources.CPUCapacity,
					Allocatable: clusterItem.AllocatedResources.CPUCapacity, // 简化，实际可能不同
					Allocated:   int64(float64(clusterItem.AllocatedResources.CPUCapacity) * clusterItem.AllocatedResources.CPUFraction / 100),
				},
				Memory: v1.ResourceMetric{
					Capacity:    clusterItem.AllocatedResources.MemoryCapacity,
					Allocatable: clusterItem.AllocatedResources.MemoryCapacity,
					Allocated:   int64(float64(clusterItem.AllocatedResources.MemoryCapacity) * clusterItem.AllocatedResources.MemoryFraction / 100),
				},
				Pod: v1.PodMetric{
					Capacity:    clusterItem.AllocatedResources.PodCapacity,
					Allocatable: clusterItem.AllocatedResources.PodCapacity,
					Allocated:   clusterItem.AllocatedResources.AllocatedPods,
				},
			},
		}

		// 设置区域和可用区信息
		if region, ok := clusterItem.ObjectMeta.Labels["cluster.karmada.io/region"]; ok {
			clusterInfo.Region = region
		}
		if zone, ok := clusterItem.ObjectMeta.Labels["cluster.karmada.io/zone"]; ok {
			clusterInfo.Zone = zone
		}

		// 计算负载等级
		cpuUsage := clusterItem.AllocatedResources.CPUFraction
		memoryUsage := clusterItem.AllocatedResources.MemoryFraction
		avgUsage := (cpuUsage + memoryUsage) / 2

		if avgUsage < 30 {
			clusterInfo.LoadLevel = "low"
		} else if avgUsage < 70 {
			clusterInfo.LoadLevel = "medium"
		} else {
			clusterInfo.LoadLevel = "high"
		}

		// 获取污点信息
		ctx := context.TODO()
		clusterObj, err := karmadaClient.ClusterV1alpha1().Clusters().Get(ctx, clusterItem.ObjectMeta.Name, metav1.GetOptions{})
		if err == nil && clusterObj.Spec.Taints != nil {
			clusterInfo.Taints = make([]v1.TaintInfo, 0)
			for _, taint := range clusterObj.Spec.Taints {
				clusterInfo.Taints = append(clusterInfo.Taints, v1.TaintInfo{
					Key:    taint.Key,
					Value:  taint.Value,
					Effect: string(taint.Effect),
				})
			}
		}

		result.Clusters = append(result.Clusters, clusterInfo)
	}

	return result, nil
}

// SimulateScheduling 模拟调度策略
func SimulateScheduling(req *v1.SchedulingSimulateRequest) (*v1.SchedulingSimulateResponse, error) {
	karmadaClient := client.InClusterKarmadaClient()

	// 获取所有集群
	clusterList, err := cluster.GetClusterList(karmadaClient, &dataselect.DataSelectQuery{})
	if err != nil {
		return nil, fmt.Errorf("获取集群列表失败: %v", err)
	}

	// 根据placement规则筛选目标集群
	targetClusters := make([]cluster.Cluster, 0)
	for _, clusterItem := range clusterList.Clusters {
		if isClusterMatchPlacement(clusterItem, req.Placement) {
			targetClusters = append(targetClusters, clusterItem)
		}
	}

	if len(targetClusters) == 0 {
		return &v1.SchedulingSimulateResponse{
			SchedulingResult: []v1.SchedulingResult{},
			Warnings:         []string{"没有匹配的目标集群"},
		}, nil
	}

	// 根据调度策略分配副本
	result := &v1.SchedulingSimulateResponse{
		SchedulingResult: make([]v1.SchedulingResult, 0),
		Warnings:         make([]string, 0),
		Errors:           make([]string, 0),
	}

	if req.Placement.ReplicaScheduling != nil && req.Placement.ReplicaScheduling.ReplicaSchedulingType == "Divided" {
		// 按权重分配
		result.SchedulingResult = simulateWeightedScheduling(targetClusters, req.Workload, req.Placement.ReplicaScheduling)
	} else {
		// 复制到所有目标集群
		for _, cluster := range targetClusters {
			result.SchedulingResult = append(result.SchedulingResult, v1.SchedulingResult{
				ClusterName: cluster.ObjectMeta.Name,
				Replicas:    req.Workload.Replicas,
				Reason:      "复制模式，所有目标集群运行相同副本数",
			})
		}
	}

	return result, nil
}

// isClusterMatchPlacement 检查集群是否匹配placement规则
func isClusterMatchPlacement(cluster cluster.Cluster, placement v1.PlacementSpec) bool {
	// 检查ClusterSelector
	if placement.ClusterSelector != nil && placement.ClusterSelector.MatchLabels != nil {
		for key, value := range placement.ClusterSelector.MatchLabels {
			if clusterValue, ok := cluster.ObjectMeta.Labels[key]; !ok || clusterValue != value {
				return false
			}
		}
	}

	// 检查ClusterAffinity
	if placement.ClusterAffinity != nil && placement.ClusterAffinity.ClusterNames != nil {
		found := false
		for _, name := range placement.ClusterAffinity.ClusterNames {
			if name == cluster.ObjectMeta.Name {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	return true
}

// simulateWeightedScheduling 模拟按权重分配调度
func simulateWeightedScheduling(clusters []cluster.Cluster, workload v1.WorkloadSpec, replicaScheduling *v1.ReplicaSchedulingSpec) []v1.SchedulingResult {
	result := make([]v1.SchedulingResult, 0)

	if replicaScheduling.WeightPreference != nil && replicaScheduling.WeightPreference.StaticWeightList != nil {
		// 按静态权重分配
		totalWeight := int32(0)
		weightMap := make(map[string]int32)

		for _, weight := range replicaScheduling.WeightPreference.StaticWeightList {
			for _, clusterName := range weight.TargetCluster.ClusterNames {
				weightMap[clusterName] = weight.Weight
				totalWeight += weight.Weight
			}
		}

		for _, cluster := range clusters {
			weight, ok := weightMap[cluster.ObjectMeta.Name]
			if !ok {
				weight = 1 // 默认权重
				totalWeight += 1
			}

			replicas := int32(float64(workload.Replicas) * float64(weight) / float64(totalWeight))
			if replicas == 0 && weight > 0 {
				replicas = 1 // 至少分配一个副本
			}

			result = append(result, v1.SchedulingResult{
				ClusterName: cluster.ObjectMeta.Name,
				Replicas:    replicas,
				Reason:      fmt.Sprintf("按权重分配，权重: %d/%d", weight, totalWeight),
			})
		}
	} else {
		// 平均分配
		replicasPerCluster := workload.Replicas / int32(len(clusters))
		remainder := workload.Replicas % int32(len(clusters))

		for i, cluster := range clusters {
			replicas := replicasPerCluster
			if int32(i) < remainder {
				replicas += 1
			}

			result = append(result, v1.SchedulingResult{
				ClusterName: cluster.ObjectMeta.Name,
				Replicas:    replicas,
				Reason:      "平均分配",
			})
		}
	}

	return result
}

// GetResourceSchedulingTree 获取资源调度关系树形图
func GetResourceSchedulingTree(req *v1.ResourceSchedulingTreeRequest) (*v1.ResourceSchedulingTreeResponse, error) {
	ctx := context.TODO()
	karmadaClient := client.InClusterKarmadaClient()
	k8sClient := client.InClusterClientForKarmadaAPIServer()

	nodes := []v1.TreeNode{}
	edges := []v1.TreeEdge{}

	// 根据请求类型构建不同的树形图
	if req.ResourceName != "" && req.Namespace != "" {
		// 单个资源的调度关系树
		tree, err := buildSingleResourceTree(ctx, karmadaClient, k8sClient, req)
		if err != nil {
			return nil, fmt.Errorf("构建单个资源调度树失败: %v", err)
		}
		nodes = append(nodes, tree.Nodes...)
		edges = append(edges, tree.Edges...)
	} else {
		// 整体资源调度关系概览
		tree, err := buildOverallSchedulingTree(ctx, karmadaClient, k8sClient, req)
		if err != nil {
			return nil, fmt.Errorf("构建整体调度树失败: %v", err)
		}
		nodes = append(nodes, tree.Nodes...)
		edges = append(edges, tree.Edges...)
	}

	return &v1.ResourceSchedulingTreeResponse{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

// buildSingleResourceTree 构建单个资源的调度关系树
func buildSingleResourceTree(ctx context.Context, karmadaClient karmada.Interface, k8sClient kubernetes.Interface, req *v1.ResourceSchedulingTreeRequest) (*v1.ResourceSchedulingTreeResponse, error) {
	nodes := []v1.TreeNode{}
	edges := []v1.TreeEdge{}

	// 1. 添加源资源节点
	resourceNode := v1.TreeNode{
		ID:        fmt.Sprintf("resource-%s-%s", req.Namespace, req.ResourceName),
		Type:      "resource",
		Name:      req.ResourceName,
		Namespace: req.Namespace,
		Status:    "ready",
		Properties: map[string]interface{}{
			"kind": req.ResourceType,
		},
		Position: &v1.NodePosition{X: 100, Y: 100},
		Style: &v1.NodeStyle{
			Color: "#1890ff",
			Icon:  getResourceIcon(req.ResourceType),
		},
	}
	nodes = append(nodes, resourceNode)

	// 2. 查找相关的PropagationPolicy
	policies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(req.Namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取PropagationPolicy失败: %v", err)
	}

	policyX := 300
	for _, policy := range policies.Items {
		// 检查策略是否影响该资源
		if isPolicyAffectingResource(&policy, req.ResourceType, req.ResourceName) {
			policyNode := v1.TreeNode{
				ID:        fmt.Sprintf("policy-%s", policy.Name),
				Type:      "policy",
				Name:      policy.Name,
				Namespace: policy.Namespace,
				Status:    getPolicyStatus(&policy),
				Properties: map[string]interface{}{
					"resourceSelectors": len(policy.Spec.ResourceSelectors),
					"clusters":          getClusterNamesCount(&policy),
				},
				Position: &v1.NodePosition{X: float64(policyX), Y: 100},
				Style: &v1.NodeStyle{
					Color: "#52c41a",
					Icon:  "policy",
				},
			}
			nodes = append(nodes, policyNode)

			// 添加资源到策略的边
			edge := v1.TreeEdge{
				ID:     fmt.Sprintf("edge-%s-%s", resourceNode.ID, policyNode.ID),
				Source: resourceNode.ID,
				Target: policyNode.ID,
				Type:   "propagate",
				Label:  "应用策略",
				Status: "active",
				Style: &v1.EdgeStyle{
					Color: "#1890ff",
					Width: 2,
				},
			}
			edges = append(edges, edge)

			// 3. 添加目标集群节点
			clusterY := 250
			clusterNames := getClusterNames(&policy)
			for j, clusterName := range clusterNames {
				clusterNode := v1.TreeNode{
					ID:     fmt.Sprintf("cluster-%s", clusterName),
					Type:   "cluster",
					Name:   clusterName,
					Status: getClusterStatus(clusterName),
					Properties: map[string]interface{}{
						"ready": true,
					},
					Position: &v1.NodePosition{X: float64(policyX), Y: float64(clusterY + j*80)},
					Style: &v1.NodeStyle{
						Color: "#722ed1",
						Icon:  "cluster",
					},
				}
				nodes = append(nodes, clusterNode)

				// 添加策略到集群的边
				scheduleEdge := v1.TreeEdge{
					ID:     fmt.Sprintf("edge-%s-%s", policyNode.ID, clusterNode.ID),
					Source: policyNode.ID,
					Target: clusterNode.ID,
					Type:   "schedule",
					Label:  "调度到集群",
					Status: "active",
					Style: &v1.EdgeStyle{
						Color: "#52c41a",
						Width: 2,
					},
				}
				edges = append(edges, scheduleEdge)
			}

			policyX += 250
		}
	}

	return &v1.ResourceSchedulingTreeResponse{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

// buildOverallSchedulingTree 构建整体资源调度关系概览
func buildOverallSchedulingTree(ctx context.Context, karmadaClient karmada.Interface, k8sClient kubernetes.Interface, req *v1.ResourceSchedulingTreeRequest) (*v1.ResourceSchedulingTreeResponse, error) {
	nodes := []v1.TreeNode{}
	edges := []v1.TreeEdge{}

	// 1. 获取所有集群
	clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取集群列表失败: %v", err)
	}

	// 添加集群节点
	clusterY := 100
	for i, cluster := range clusters.Items {
		clusterNode := v1.TreeNode{
			ID:     fmt.Sprintf("cluster-%s", cluster.Name),
			Type:   "cluster",
			Name:   cluster.Name,
			Status: getClusterReadyStatus(&cluster),
			Properties: map[string]interface{}{
				"ready":             getClusterReady(&cluster),
				"kubernetesVersion": cluster.Status.KubernetesVersion,
			},
			Position: &v1.NodePosition{X: 100, Y: float64(clusterY + i*100)},
			Style: &v1.NodeStyle{
				Color: "#722ed1",
				Icon:  "cluster",
			},
		}
		nodes = append(nodes, clusterNode)
	}

	// 2. 获取所有PropagationPolicy
	namespace := req.Namespace
	if namespace == "" {
		namespace = metav1.NamespaceAll
	}

	policies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取PropagationPolicy失败: %v", err)
	}

	policyX := 300
	for i, policy := range policies.Items {
		policyNode := v1.TreeNode{
			ID:        fmt.Sprintf("policy-%s-%s", policy.Namespace, policy.Name),
			Type:      "policy",
			Name:      policy.Name,
			Namespace: policy.Namespace,
			Status:    getPolicyStatus(&policy),
			Properties: map[string]interface{}{
				"resourceSelectors": len(policy.Spec.ResourceSelectors),
				"targetClusters":    getClusterNamesCount(&policy),
			},
			Position: &v1.NodePosition{X: float64(policyX), Y: float64(100 + i*120)},
			Style: &v1.NodeStyle{
				Color: "#52c41a",
				Icon:  "policy",
			},
		}
		nodes = append(nodes, policyNode)

		// 连接策略到目标集群
		clusterNames := getClusterNames(&policy)
		for _, clusterName := range clusterNames {
			edge := v1.TreeEdge{
				ID:     fmt.Sprintf("edge-%s-cluster-%s", policyNode.ID, clusterName),
				Source: policyNode.ID,
				Target: fmt.Sprintf("cluster-%s", clusterName),
				Type:   "schedule",
				Label:  "调度",
				Status: "active",
				Style: &v1.EdgeStyle{
					Color: "#52c41a",
					Width: 2,
				},
			}
			edges = append(edges, edge)
		}
	}

	// 3. 添加资源统计节点
	resourceNode := v1.TreeNode{
		ID:     "resources-summary",
		Type:   "summary",
		Name:   "资源概览",
		Status: "active",
		Properties: map[string]interface{}{
			"totalPolicies": len(policies.Items),
			"totalClusters": len(clusters.Items),
		},
		Position: &v1.NodePosition{X: 500, Y: 50},
		Style: &v1.NodeStyle{
			Color: "#1890ff",
			Icon:  "dashboard",
		},
	}
	nodes = append(nodes, resourceNode)

	return &v1.ResourceSchedulingTreeResponse{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

// 辅助函数
func getResourceIcon(resourceType string) string {
	icons := map[string]string{
		"deployment":  "deployment",
		"service":     "service",
		"statefulset": "statefulset",
		"daemonset":   "daemonset",
		"job":         "job",
		"cronjob":     "cronjob",
	}
	if icon, exists := icons[resourceType]; exists {
		return icon
	}
	return "resource"
}

func isPolicyAffectingResource(policy *policyv1alpha1.PropagationPolicy, resourceType, resourceName string) bool {
	for _, selector := range policy.Spec.ResourceSelectors {
		if strings.EqualFold(selector.Kind, resourceType) &&
			(selector.Name == "" || selector.Name == resourceName) {
			return true
		}
	}
	return false
}

func getPolicyStatus(policy *policyv1alpha1.PropagationPolicy) string {
	// 根据实际状态判断，这里简化处理
	return "ready"
}

func getClusterStatus(clusterName string) string {
	// 根据实际集群状态判断，这里简化处理
	return "ready"
}

// 辅助函数获取集群名称列表
func getClusterNames(policy *policyv1alpha1.PropagationPolicy) []string {
	if policy.Spec.Placement.ClusterAffinity != nil {
		return policy.Spec.Placement.ClusterAffinity.ClusterNames
	}
	return []string{}
}

// 获取集群名称数量
func getClusterNamesCount(policy *policyv1alpha1.PropagationPolicy) int {
	return len(getClusterNames(policy))
}

// 获取集群就绪状态
func getClusterReady(cluster *clusterv1alpha1.Cluster) bool {
	// Karmada集群状态检查，这里简化处理
	return true
}

// 获取集群就绪状态字符串
func getClusterReadyStatus(cluster *clusterv1alpha1.Cluster) string {
	if getClusterReady(cluster) {
		return "ready"
	}
	return "not-ready"
}

// GetVisualClusters 获取可视化调度集群信息
func GetVisualClusters() (*v1.VisualClustersResponse, error) {
	klog.V(4).InfoS("Getting visual clusters for scheduling")

	karmadaClient := client.InClusterKarmadaClient()
	clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取集群列表失败: %v", err)
	}

	var visualClusters []v1.VisualClusterInfo

	for _, cluster := range clusters.Items {
		visualCluster := v1.VisualClusterInfo{
			Name:         cluster.Name,
			DisplayName:  getClusterDisplayName(cluster.Name),
			Region:       getClusterRegion(&cluster),
			Zone:         getClusterZone(&cluster),
			Status:       getClusterReadyStatus(&cluster),
			Resources:    getVisualClusterResources(&cluster),
			Labels:       cluster.Labels,
			Capabilities: getClusterCapabilities(&cluster),
		}

		visualClusters = append(visualClusters, visualCluster)
	}

	return &v1.VisualClustersResponse{
		Clusters: visualClusters,
	}, nil
}

// SimulateVisualScheduling 可视化调度模拟
func SimulateVisualScheduling(req *v1.VisualSchedulingSimulateRequest) (*v1.VisualSchedulingSimulateResponse, error) {
	klog.V(4).InfoS("Simulating visual scheduling", "strategy", req.Strategy, "replicas", req.Workload.Replicas)

	response := &v1.VisualSchedulingSimulateResponse{
		Allocation: []v1.VisualAllocationResult{},
		Warnings:   []string{},
		Feasible:   true,
	}

	totalReplicas := req.Workload.Replicas

	switch req.Strategy {
	case "Divided":
		// 分割策略 - 按权重分配
		allocation := simulateWeightedAllocation(req.Clusters, totalReplicas, req.Weights)
		response.Allocation = allocation

	case "Duplicated":
		// 复制策略 - 每个集群都部署所有副本
		for _, clusterName := range req.Clusters {
			result := v1.VisualAllocationResult{
				ClusterName: clusterName,
				Replicas:    totalReplicas,
				Reason:      "复制策略，每个集群部署全部副本",
			}
			response.Allocation = append(response.Allocation, result)
		}

	default:
		response.Feasible = false
		response.Warnings = append(response.Warnings, fmt.Sprintf("不支持的调度策略: %s", req.Strategy))
	}

	// 检查资源约束（模拟）
	for i, allocation := range response.Allocation {
		if allocation.Replicas == 0 {
			response.Warnings = append(response.Warnings, fmt.Sprintf("集群 %s 未分配到副本", allocation.ClusterName))
		}

		// 模拟资源检查
		if !checkClusterCapacity(allocation.ClusterName, allocation.Replicas) {
			response.Warnings = append(response.Warnings, fmt.Sprintf("集群 %s 资源可能不足", allocation.ClusterName))
			response.Allocation[i].Reason += "（资源告警）"
		}
	}

	return response, nil
}

// 辅助函数
func getClusterDisplayName(clusterName string) string {
	// 简单的显示名称映射
	displayNames := map[string]string{
		"cluster-beijing":   "北京生产集群",
		"cluster-shanghai":  "上海开发集群",
		"cluster-shenzhen":  "深圳测试集群",
		"cluster-guangzhou": "广州灾备集群",
	}

	if displayName, exists := displayNames[clusterName]; exists {
		return displayName
	}
	return clusterName
}

func getClusterRegion(cluster *clusterv1alpha1.Cluster) string {
	if cluster.Labels != nil {
		if region, ok := cluster.Labels["region"]; ok {
			return region
		}
		if region, ok := cluster.Labels["cluster.karmada.io/region"]; ok {
			return region
		}
	}

	// 从集群名称推断地区
	if strings.Contains(cluster.Name, "beijing") {
		return "beijing"
	} else if strings.Contains(cluster.Name, "shanghai") {
		return "shanghai"
	} else if strings.Contains(cluster.Name, "shenzhen") {
		return "shenzhen"
	}

	return "unknown"
}

func getClusterZone(cluster *clusterv1alpha1.Cluster) string {
	if cluster.Labels != nil {
		if zone, ok := cluster.Labels["zone"]; ok {
			return zone
		}
		if zone, ok := cluster.Labels["cluster.karmada.io/zone"]; ok {
			return zone
		}
	}
	return "zone-a"
}

func getVisualClusterResources(cluster *clusterv1alpha1.Cluster) v1.VisualClusterResources {
	// 模拟集群资源信息
	return v1.VisualClusterResources{
		CPU: v1.VisualResourceInfo{
			Total:     1000,
			Used:      600,
			Available: 400,
		},
		Memory: v1.VisualResourceInfo{
			Total:     2048000,
			Used:      1024000,
			Available: 1024000,
		},
		Nodes: v1.VisualNodeInfo{
			Total: 12,
			Ready: 12,
		},
	}
}

func getClusterCapabilities(cluster *clusterv1alpha1.Cluster) []string {
	capabilities := []string{}

	if cluster.Labels != nil {
		if _, hasGPU := cluster.Labels["gpu"]; hasGPU {
			capabilities = append(capabilities, "gpu")
		}
		if _, hasSSD := cluster.Labels["ssd-storage"]; hasSSD {
			capabilities = append(capabilities, "ssd-storage")
		}
		if _, hasHighMemory := cluster.Labels["high-memory"]; hasHighMemory {
			capabilities = append(capabilities, "high-memory")
		}
	}

	// 默认基础能力
	if len(capabilities) == 0 {
		capabilities = append(capabilities, "basic-compute")
	}

	return capabilities
}

func simulateWeightedAllocation(clusters []string, totalReplicas int32, weights map[string]int32) []v1.VisualAllocationResult {
	var results []v1.VisualAllocationResult

	// 计算总权重
	totalWeight := int32(0)
	for _, clusterName := range clusters {
		if weight, exists := weights[clusterName]; exists {
			totalWeight += weight
		} else {
			totalWeight += 1 // 默认权重为1
		}
	}

	allocated := int32(0)
	for i, clusterName := range clusters {
		var weight int32 = 1
		if w, exists := weights[clusterName]; exists {
			weight = w
		}

		var replicas int32
		if i == len(clusters)-1 {
			// 最后一个集群分配剩余的副本
			replicas = totalReplicas - allocated
		} else {
			replicas = (totalReplicas * weight) / totalWeight
			allocated += replicas
		}

		reason := fmt.Sprintf("按权重分配，权重比例 %d/%d", weight, totalWeight)

		result := v1.VisualAllocationResult{
			ClusterName: clusterName,
			Replicas:    replicas,
			Reason:      reason,
		}
		results = append(results, result)
	}

	return results
}

func checkClusterCapacity(clusterName string, replicas int32) bool {
	// 模拟集群容量检查
	// 假设每个集群最多支持100个副本
	return replicas <= 100
}

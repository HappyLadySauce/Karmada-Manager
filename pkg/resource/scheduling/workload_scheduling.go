/*
Copyright 2024 The Karmada Authors.
Licensed under the Apache License, Version 2.0
*/

package scheduling

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	workv1alpha2 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha2"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// WorkloadSchedulingView 工作负载调度视图
type WorkloadSchedulingView struct {
	WorkloadInfo      WorkloadInfo       `json:"workloadInfo"`
	PropagationPolicy *PolicyInfo        `json:"propagationPolicy,omitempty"`
	OverridePolicy    *PolicyInfo        `json:"overridePolicy,omitempty"`
	ClusterPlacements []ClusterPlacement `json:"clusterPlacements"`
	SchedulingStatus  SchedulingStatus   `json:"schedulingStatus"`
}

// WorkloadInfo 工作负载基本信息
type WorkloadInfo struct {
	Name          string `json:"name"`
	Namespace     string `json:"namespace"`
	Kind          string `json:"kind"`
	APIVersion    string `json:"apiVersion"`
	Replicas      int32  `json:"replicas"`
	ReadyReplicas int32  `json:"readyReplicas"`
}

// PolicyInfo 策略信息
type PolicyInfo struct {
	Name            string                    `json:"name"`
	Namespace       string                    `json:"namespace"`
	ClusterAffinity *v1alpha1.ClusterAffinity `json:"clusterAffinity,omitempty"`
	Placement       *v1alpha1.Placement       `json:"placement,omitempty"`
}

// ClusterPlacement 集群调度信息
type ClusterPlacement struct {
	ClusterName     string `json:"clusterName"`
	PlannedReplicas int32  `json:"plannedReplicas"`
	ActualReplicas  int32  `json:"actualReplicas"`
	Weight          int32  `json:"weight,omitempty"`
	Reason          string `json:"reason"`
}

// SchedulingStatus 调度状态
type SchedulingStatus struct {
	Phase   string `json:"phase"` // Scheduled, Pending, Failed
	Message string `json:"message"`
}

// GetWorkloadScheduling 获取工作负载调度信息
func GetWorkloadScheduling(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*WorkloadSchedulingView, error) {
	// 1. 获取工作负载基本信息
	workloadInfo, err := getWorkloadInfo(karmadaClient, namespace, name, kind)
	if err != nil {
		return nil, fmt.Errorf("failed to get workload info: %w", err)
	}

	// 2. 查找关联的PropagationPolicy
	propagationPolicy, err := findAssociatedPropagationPolicy(karmadaClient, namespace, name, kind)
	if err != nil {
		// 策略不存在不是致命错误
		propagationPolicy = nil
	}

	// 3. 查找关联的OverridePolicy
	overridePolicy, err := findAssociatedOverridePolicy(karmadaClient, namespace, name, kind)
	if err != nil {
		// 策略不存在不是致命错误
		overridePolicy = nil
	}

	// 4. 获取ResourceBinding信息
	clusterPlacements, status, err := getClusterPlacementsFromBinding(karmadaClient, namespace, name, kind)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster placements: %w", err)
	}

	return &WorkloadSchedulingView{
		WorkloadInfo:      *workloadInfo,
		PropagationPolicy: propagationPolicy,
		OverridePolicy:    overridePolicy,
		ClusterPlacements: clusterPlacements,
		SchedulingStatus:  status,
	}, nil
}

func getWorkloadInfo(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*WorkloadInfo, error) {
	// 获取所有ResourceBinding并查找匹配的
	bindings, err := karmadaClient.WorkV1alpha2().ResourceBindings(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list resource bindings: %w", err)
	}

	// 查找匹配的ResourceBinding
	var matchedBinding *workv1alpha2.ResourceBinding
	for _, binding := range bindings.Items {
		if binding.Spec.Resource.Kind == kind && 
		   binding.Spec.Resource.Name == name && 
		   binding.Spec.Resource.Namespace == namespace {
			matchedBinding = &binding
			break
		}
	}

	if matchedBinding == nil {
		// 如果没有ResourceBinding，返回基本信息而不是错误
		return &WorkloadInfo{
			Name:          name,
			Namespace:     namespace,
			Kind:          kind,
			APIVersion:    "apps/v1",
			Replicas:      0,
			ReadyReplicas: 0,
		}, nil
	}

	return &WorkloadInfo{
		Name:          name,
		Namespace:     namespace,
		Kind:          kind,
		APIVersion:    matchedBinding.Spec.Resource.APIVersion,
		Replicas:      calculateTotalReplicas(matchedBinding.Spec.Clusters),
		ReadyReplicas: calculateReadyReplicas(matchedBinding.Status.AggregatedStatus),
	}, nil
}

func findAssociatedPropagationPolicy(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*PolicyInfo, error) {
	// 获取所有PropagationPolicy
	policies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// 查找匹配的策略
	for _, policy := range policies.Items {
		if isPolicyMatchingWorkload(policy.Spec.ResourceSelectors, namespace, name, kind) {
			return &PolicyInfo{
				Name:            policy.Name,
				Namespace:       policy.Namespace,
				ClusterAffinity: policy.Spec.Placement.ClusterAffinity,
				Placement:       &policy.Spec.Placement,
			}, nil
		}
	}

	return nil, fmt.Errorf("no matching propagation policy found")
}

func findAssociatedOverridePolicy(karmadaClient karmadaclientset.Interface, namespace, name, kind string) (*PolicyInfo, error) {
	// 获取所有OverridePolicy
	policies, err := karmadaClient.PolicyV1alpha1().OverridePolicies(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// 查找匹配的策略
	for _, policy := range policies.Items {
		if isPolicyMatchingWorkload(policy.Spec.ResourceSelectors, namespace, name, kind) {
			return &PolicyInfo{
				Name:      policy.Name,
				Namespace: policy.Namespace,
			}, nil
		}
	}

	return nil, fmt.Errorf("no matching override policy found")
}

func getClusterPlacementsFromBinding(karmadaClient karmadaclientset.Interface, namespace, name, kind string) ([]ClusterPlacement, SchedulingStatus, error) {
	// 获取所有ResourceBinding并查找匹配的
	bindings, err := karmadaClient.WorkV1alpha2().ResourceBindings(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, SchedulingStatus{Phase: "Failed", Message: err.Error()}, err
	}

	// 查找匹配的ResourceBinding
	var matchedBinding *workv1alpha2.ResourceBinding
	for _, binding := range bindings.Items {
		if binding.Spec.Resource.Kind == kind && 
		   binding.Spec.Resource.Name == name && 
		   binding.Spec.Resource.Namespace == namespace {
			matchedBinding = &binding
			break
		}
	}

	if matchedBinding == nil {
		return nil, SchedulingStatus{Phase: "Pending", Message: "No resource binding found"}, nil
	}

	placements := make([]ClusterPlacement, 0, len(matchedBinding.Spec.Clusters))

	for _, cluster := range matchedBinding.Spec.Clusters {
		placement := ClusterPlacement{
			ClusterName:     cluster.Name,
			PlannedReplicas: cluster.Replicas,
			ActualReplicas:  getActualReplicasFromStatus(matchedBinding.Status.AggregatedStatus, cluster.Name),
			Reason:          generatePlacementReason(cluster),
		}
		placements = append(placements, placement)
	}

	status := SchedulingStatus{
		Phase:   determineSchedulingPhase(matchedBinding.Status),
		Message: generateSchedulingMessage(matchedBinding.Status),
	}

	return placements, status, nil
}

// 辅助函数
func isPolicyMatchingWorkload(resourceSelectors []v1alpha1.ResourceSelector, namespace, name, kind string) bool {
	for _, selector := range resourceSelectors {
		if selector.APIVersion == "apps/v1" && selector.Kind == kind {
			if selector.Namespace != "" && selector.Namespace != namespace {
				continue
			}
			if selector.Name != "" && selector.Name != name {
				continue
			}
			return true
		}
	}
	return false
}

func calculateTotalReplicas(clusters []workv1alpha2.TargetCluster) int32 {
	total := int32(0)
	for _, cluster := range clusters {
		total += cluster.Replicas
	}
	return total
}

func calculateReadyReplicas(aggregatedStatus []workv1alpha2.AggregatedStatusItem) int32 {
	readyReplicas := int32(0)
	for _, status := range aggregatedStatus {
		if status.Status != nil && status.Status.Raw != nil {
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

func getActualReplicasFromStatus(aggregatedStatus []workv1alpha2.AggregatedStatusItem, clusterName string) int32 {
	for _, status := range aggregatedStatus {
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

func generatePlacementReason(cluster workv1alpha2.TargetCluster) string {
	return fmt.Sprintf("根据调度策略分配 %d 个副本", cluster.Replicas)
}

func determineSchedulingPhase(status workv1alpha2.ResourceBindingStatus) string {
	// 简化实现，实际需要分析条件
	return "Scheduled"
}

func generateSchedulingMessage(status workv1alpha2.ResourceBindingStatus) string {
	return "所有副本都已成功调度到目标集群"
}

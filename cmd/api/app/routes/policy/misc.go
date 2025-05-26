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

package policy

import (
	"context"
	"fmt"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
	policyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	workv1alpha1 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha1"

	"github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// CreatePolicyByForm 通过表单创建策略
func CreatePolicyByForm(req *v1.PolicyFormRequest) (*v1.PolicyStatusResponse, error) {
	karmadaClient := client.InClusterKarmadaClient()
	
	// 构建策略对象
	if req.Namespace == "" {
		// 创建 ClusterPropagationPolicy
		clusterPolicy := &policyv1alpha1.ClusterPropagationPolicy{
			ObjectMeta: metav1.ObjectMeta{
				Name: req.Name,
			},
			Spec: policyv1alpha1.PropagationSpec{
				ResourceSelectors: buildResourceSelectors(req.ResourceSelectors),
				Placement:         buildPlacement(req.Placement),
			},
		}
		
		if req.Scheduling != "" {
			clusterPolicy.Spec.Placement.ReplicaScheduling = &policyv1alpha1.ReplicaSchedulingStrategy{
				ReplicaSchedulingType: policyv1alpha1.ReplicaSchedulingType(req.Scheduling),
			}
		}
		
		createdPolicy, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().Create(
			context.TODO(), clusterPolicy, metav1.CreateOptions{},
		)
		if err != nil {
			return nil, fmt.Errorf("创建集群级分发策略失败: %v", err)
		}
		
		return &v1.PolicyStatusResponse{
			Name:        createdPolicy.Name,
			Type:        "ClusterPropagationPolicy",
			Status:      "Active",
			LastApplied: createdPolicy.CreationTimestamp.Format(time.RFC3339),
		}, nil
	} else {
		// 创建 PropagationPolicy
		namespacedPolicy := &policyv1alpha1.PropagationPolicy{
			ObjectMeta: metav1.ObjectMeta{
				Name:      req.Name,
				Namespace: req.Namespace,
			},
			Spec: policyv1alpha1.PropagationSpec{
				ResourceSelectors: buildResourceSelectors(req.ResourceSelectors),
				Placement:         buildPlacement(req.Placement),
			},
		}
		
		if req.Scheduling != "" {
			namespacedPolicy.Spec.Placement.ReplicaScheduling = &policyv1alpha1.ReplicaSchedulingStrategy{
				ReplicaSchedulingType: policyv1alpha1.ReplicaSchedulingType(req.Scheduling),
			}
		}
		
		createdPolicy, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(req.Namespace).Create(
			context.TODO(), namespacedPolicy, metav1.CreateOptions{},
		)
		if err != nil {
			return nil, fmt.Errorf("创建命名空间级分发策略失败: %v", err)
		}
		
		return &v1.PolicyStatusResponse{
			Name:        createdPolicy.Name,
			Namespace:   createdPolicy.Namespace,
			Type:        "PropagationPolicy",
			Status:      "Active",
			LastApplied: createdPolicy.CreationTimestamp.Format(time.RFC3339),
		}, nil
	}
}

// GeneratePolicyTemplate 生成策略模板
func GeneratePolicyTemplate(req *v1.PolicyTemplateRequest) (*v1.PolicyTemplateResponse, error) {
	var template string
	
	if req.PolicyType == "propagation" {
		if req.IsClusterScope {
			template = generateClusterPropagationPolicyTemplate(req)
		} else {
			template = generatePropagationPolicyTemplate(req)
		}
	} else if req.PolicyType == "override" {
		if req.IsClusterScope {
			template = generateClusterOverridePolicyTemplate(req)
		} else {
			template = generateOverridePolicyTemplate(req)
		}
	} else {
		return nil, fmt.Errorf("不支持的策略类型: %s", req.PolicyType)
	}
	
	return &v1.PolicyTemplateResponse{
		Template: template,
	}, nil
}

// ValidatePolicy 验证策略
func ValidatePolicy(req *v1.PolicyValidateRequest) (*v1.PolicyValidateResponse, error) {
	response := &v1.PolicyValidateResponse{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}
	
	// 尝试解析YAML
	var obj interface{}
	if err := yaml.Unmarshal([]byte(req.PolicyYAML), &obj); err != nil {
		response.Valid = false
		response.Errors = append(response.Errors, fmt.Sprintf("YAML格式错误: %v", err))
		return response, nil
	}
	
	// 根据策略类型进行验证
	switch req.PolicyType {
	case "propagation":
		if err := validatePropagationPolicy(req.PolicyYAML); err != nil {
			response.Valid = false
			response.Errors = append(response.Errors, err.Error())
		}
	case "override":
		if err := validateOverridePolicy(req.PolicyYAML); err != nil {
			response.Valid = false
			response.Errors = append(response.Errors, err.Error())
		}
	default:
		response.Valid = false
		response.Errors = append(response.Errors, fmt.Sprintf("不支持的策略类型: %s", req.PolicyType))
	}
	
	// 添加一些通用警告
	if strings.Contains(req.PolicyYAML, "clusterNames: []") {
		response.Warnings = append(response.Warnings, "未指定目标集群，策略可能不会生效")
	}
	
	return response, nil
}

// GetPolicyStatus 获取策略状态
func GetPolicyStatus(name, namespace, policyType string) (*v1.PolicyStatusResponse, error) {
	karmadaClient := client.InClusterKarmadaClient()
	
	response := &v1.PolicyStatusResponse{
		Name:      name,
		Namespace: namespace,
		Type:      policyType,
		Clusters:  []v1.PolicyClusterStatus{},
		Resources: []v1.PolicyResourceStatus{},
	}
	
	if policyType == "ClusterPropagationPolicy" || (policyType == "" && namespace == "") {
		// 获取集群级策略
		policy, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().Get(
			context.TODO(), name, metav1.GetOptions{},
		)
		if err != nil {
			return nil, fmt.Errorf("获取集群级分发策略失败: %v", err)
		}
		
		response.Type = "ClusterPropagationPolicy"
		response.Status = "Active"
		response.LastApplied = policy.CreationTimestamp.Format(time.RFC3339)
		
		// 获取关联的Work资源状态
		works, err := karmadaClient.WorkV1alpha1().Works("").List(context.TODO(), metav1.ListOptions{
			LabelSelector: fmt.Sprintf("propagationpolicy.karmada.io/name=%s", name),
		})
		if err == nil {
			response.Clusters = buildClusterStatusFromWorks(works.Items)
		}
		
	} else {
		// 获取命名空间级策略
		if namespace == "" {
			return nil, fmt.Errorf("命名空间级策略需要指定命名空间")
		}
		
		policy, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).Get(
			context.TODO(), name, metav1.GetOptions{},
		)
		if err != nil {
			return nil, fmt.Errorf("获取分发策略失败: %v", err)
		}
		
		response.Type = "PropagationPolicy"
		response.Status = "Active"
		response.LastApplied = policy.CreationTimestamp.Format(time.RFC3339)
		
		// 获取关联的Work资源状态
		works, err := karmadaClient.WorkV1alpha1().Works("").List(context.TODO(), metav1.ListOptions{
			LabelSelector: fmt.Sprintf("propagationpolicy.karmada.io/name=%s,propagationpolicy.karmada.io/namespace=%s", name, namespace),
		})
		if err == nil {
			response.Clusters = buildClusterStatusFromWorks(works.Items)
		}
	}
	
	return response, nil
}

// BatchPolicyOperation 批量策略操作
func BatchPolicyOperation(req *v1.BatchPolicyRequest) (*v1.BatchPolicyResponse, error) {
	karmadaClient := client.InClusterKarmadaClient()
	
	response := &v1.BatchPolicyResponse{
		Succeeded: []string{},
		Failed:    []v1.BatchFailItem{},
	}
	
	for _, policyName := range req.PolicyNames {
		var err error
		
		switch req.Action {
		case "delete":
			if req.Namespace == "" {
				// 删除集群级策略
				err = karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().Delete(
					context.TODO(), policyName, metav1.DeleteOptions{},
				)
			} else {
				// 删除命名空间级策略
				err = karmadaClient.PolicyV1alpha1().PropagationPolicies(req.Namespace).Delete(
					context.TODO(), policyName, metav1.DeleteOptions{},
				)
			}
		default:
			err = fmt.Errorf("不支持的操作: %s", req.Action)
		}
		
		if err != nil {
			response.Failed = append(response.Failed, v1.BatchFailItem{
				Name:   policyName,
				Reason: err.Error(),
			})
		} else {
			response.Succeeded = append(response.Succeeded, policyName)
		}
	}
	
	return response, nil
}

// GetEnhancedPolicyList 获取增强策略列表
func GetEnhancedPolicyList(namespace, policyType string, dataSelect *dataselect.DataSelectQuery) (*common.PolicyList, error) {
	karmadaClient := client.InClusterKarmadaClient()
	
	var allPolicies []common.Policy
	
	// 获取分发策略
	if policyType == "" || policyType == "propagation" || policyType == "all" {
		if namespace == "" {
			// 获取所有集群级分发策略
			clusterPolicies, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().List(
				context.TODO(), metav1.ListOptions{},
			)
			if err != nil {
				return nil, fmt.Errorf("获取集群级分发策略列表失败: %v", err)
			}
			
			for _, policy := range clusterPolicies.Items {
				allPolicies = append(allPolicies, common.Policy{
					ObjectMeta: common.ObjectMeta{
						Name:              policy.Name,
						Namespace:         "",
						CreationTimestamp: policy.CreationTimestamp,
						Labels:            policy.Labels,
					},
					TypeMeta: common.TypeMeta{
						Kind:       "ClusterPropagationPolicy",
						APIVersion: "policy.karmada.io/v1alpha1",
					},
				})
			}
		} else {
			// 获取指定命名空间的分发策略
			namespacedPolicies, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).List(
				context.TODO(), metav1.ListOptions{},
			)
			if err != nil {
				return nil, fmt.Errorf("获取分发策略列表失败: %v", err)
			}
			
			for _, policy := range namespacedPolicies.Items {
				allPolicies = append(allPolicies, common.Policy{
					ObjectMeta: common.ObjectMeta{
						Name:              policy.Name,
						Namespace:         policy.Namespace,
						CreationTimestamp: policy.CreationTimestamp,
						Labels:            policy.Labels,
					},
					TypeMeta: common.TypeMeta{
						Kind:       "PropagationPolicy",
						APIVersion: "policy.karmada.io/v1alpha1",
					},
				})
			}
		}
	}
	
	// 应用数据选择和分页
	policyCells, filteredTotal := dataselect.GenericDataSelectWithFilter(toCells(allPolicies), dataSelect)
	policies := fromCells(policyCells)
	
	return &common.PolicyList{
		ListMeta: common.ListMeta{TotalItems: filteredTotal},
		Policies: policies,
	}, nil
}

// 辅助函数

func buildResourceSelectors(selectors []v1.PolicyResourceSelector) []policyv1alpha1.ResourceSelector {
	var result []policyv1alpha1.ResourceSelector
	
	for _, sel := range selectors {
		resourceSelector := policyv1alpha1.ResourceSelector{
			APIVersion: sel.APIVersion,
			Kind:       sel.Kind,
			Name:       sel.Name,
			Namespace:  sel.Namespace,
		}
		
		if len(sel.LabelSelector) > 0 {
			resourceSelector.LabelSelector = &metav1.LabelSelector{
				MatchLabels: sel.LabelSelector,
			}
		}
		
		result = append(result, resourceSelector)
	}
	
	return result
}

func buildPlacement(placement v1.PlacementSpec) policyv1alpha1.Placement {
	result := policyv1alpha1.Placement{}
	
	if placement.ClusterSelector != nil && len(placement.ClusterSelector.MatchLabels) > 0 {
		result.ClusterAffinity = &policyv1alpha1.ClusterAffinity{
			LabelSelector: &metav1.LabelSelector{
				MatchLabels: placement.ClusterSelector.MatchLabels,
			},
		}
	}
	
	if placement.ClusterAffinity != nil && len(placement.ClusterAffinity.ClusterNames) > 0 {
		if result.ClusterAffinity == nil {
			result.ClusterAffinity = &policyv1alpha1.ClusterAffinity{}
		}
		result.ClusterAffinity.ClusterNames = placement.ClusterAffinity.ClusterNames
	}
	
	return result
}



func buildClusterStatusFromWorks(works []workv1alpha1.Work) []v1.PolicyClusterStatus {
	var result []v1.PolicyClusterStatus
	
	for _, work := range works {
		clusterName := work.Namespace // Work的namespace就是集群名
		status := "Pending"
		message := ""
		
		// 检查Work状态
		for _, condition := range work.Status.Conditions {
			if condition.Type == workv1alpha1.WorkApplied {
				if condition.Status == metav1.ConditionTrue {
					status = "Applied"
				} else {
					status = "Failed"
					message = condition.Message
				}
				break
			}
		}
		
		result = append(result, v1.PolicyClusterStatus{
			ClusterName: clusterName,
			Status:      status,
			Message:     message,
		})
	}
	
	return result
}

func generateClusterPropagationPolicyTemplate(req *v1.PolicyTemplateRequest) string {
	// 基础元数据
	policyName := "policy-template"
	if req.Name != "" {
		policyName = req.Name
	}
	
	template := fmt.Sprintf(`apiVersion: policy.karmada.io/v1alpha1
kind: ClusterPropagationPolicy
metadata:
  name: %s`, policyName)
	
	// 添加标签
	if len(req.Labels) > 0 {
		template += `
  labels:`
		for key, value := range req.Labels {
			template += fmt.Sprintf(`
    %s: %s`, key, value)
		}
	}
	
	template += `
spec:
  resourceSelectors:`
	
	// 资源选择器
	if len(req.ResourceSelectors) > 0 {
		for _, sel := range req.ResourceSelectors {
			template += fmt.Sprintf(`
  - apiVersion: %s
    kind: %s`, sel.APIVersion, sel.Kind)
			if sel.Name != "" {
				template += fmt.Sprintf(`
    name: %s`, sel.Name)
			}
			if sel.Namespace != "" {
				template += fmt.Sprintf(`
    namespace: %s`, sel.Namespace)
			}
			if len(sel.LabelSelector) > 0 {
				template += `
    labelSelector:
      matchLabels:`
				for key, value := range sel.LabelSelector {
					template += fmt.Sprintf(`
        %s: %s`, key, value)
				}
			}
		}
	} else {
		template += `
  - apiVersion: apps/v1
    kind: Deployment`
	}
	
	// 放置策略
	template += `
  placement:`
	
	// 集群亲和性
	if len(req.Clusters) > 0 || len(req.ClusterLabels) > 0 {
		template += `
    clusterAffinity:`
		
		if len(req.Clusters) > 0 {
			template += `
      clusterNames:`
			for _, cluster := range req.Clusters {
				template += fmt.Sprintf(`
      - %s`, cluster)
			}
		}
		
		if len(req.ClusterLabels) > 0 {
			template += `
      labelSelector:
        matchLabels:`
			for key, value := range req.ClusterLabels {
				template += fmt.Sprintf(`
          %s: %s`, key, value)
			}
		}
	} else {
		// 提供示例集群
		template += `
    clusterAffinity:
      clusterNames:
      - member1
      - member2`
	}
	
	// 副本调度
	if req.SchedulingType != "" {
		template += fmt.Sprintf(`
    replicaScheduling:
      replicaSchedulingType: %s`, req.SchedulingType)
		
		// 如果是 Divided 调度且有权重偏好
		if req.SchedulingType == "Divided" && len(req.StaticWeightList) > 0 {
			template += `
      weightPreference:
        staticWeightList:`
			for _, wp := range req.StaticWeightList {
				template += fmt.Sprintf(`
        - targetCluster:
            clusterNames:`)
				for _, cluster := range wp.TargetCluster.ClusterNames {
					template += fmt.Sprintf(`
            - %s`, cluster)
				}
				template += fmt.Sprintf(`
          weight: %d`, wp.Weight)
			}
		}
	}
	
	return template
}

func generatePropagationPolicyTemplate(req *v1.PolicyTemplateRequest) string {
	// 基础元数据
	policyName := "policy-template"
	if req.Name != "" {
		policyName = req.Name
	}
	
	namespace := "default"
	if req.Namespace != "" {
		namespace = req.Namespace
	}
	
	template := fmt.Sprintf(`apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: %s
  namespace: %s`, policyName, namespace)
	
	// 添加标签
	if len(req.Labels) > 0 {
		template += `
  labels:`
		for key, value := range req.Labels {
			template += fmt.Sprintf(`
    %s: %s`, key, value)
		}
	}
	
	template += `
spec:
  resourceSelectors:`
	
	// 资源选择器
	if len(req.ResourceSelectors) > 0 {
		for _, sel := range req.ResourceSelectors {
			template += fmt.Sprintf(`
  - apiVersion: %s
    kind: %s`, sel.APIVersion, sel.Kind)
			if sel.Name != "" {
				template += fmt.Sprintf(`
    name: %s`, sel.Name)
			}
			if sel.Namespace != "" {
				template += fmt.Sprintf(`
    namespace: %s`, sel.Namespace)
			}
			if len(sel.LabelSelector) > 0 {
				template += `
    labelSelector:
      matchLabels:`
				for key, value := range sel.LabelSelector {
					template += fmt.Sprintf(`
        %s: %s`, key, value)
				}
			}
		}
	} else {
		template += `
  - apiVersion: apps/v1
    kind: Deployment`
	}
	
	// 放置策略
	template += `
  placement:`
	
	// 集群亲和性
	if len(req.Clusters) > 0 || len(req.ClusterLabels) > 0 {
		template += `
    clusterAffinity:`
		
		if len(req.Clusters) > 0 {
			template += `
      clusterNames:`
			for _, cluster := range req.Clusters {
				template += fmt.Sprintf(`
      - %s`, cluster)
			}
		}
		
		if len(req.ClusterLabels) > 0 {
			template += `
      labelSelector:
        matchLabels:`
			for key, value := range req.ClusterLabels {
				template += fmt.Sprintf(`
          %s: %s`, key, value)
			}
		}
	} else {
		// 提供示例集群
		template += `
    clusterAffinity:
      clusterNames:
      - member1
      - member2`
	}
	
	// 副本调度
	if req.SchedulingType != "" {
		template += fmt.Sprintf(`
    replicaScheduling:
      replicaSchedulingType: %s`, req.SchedulingType)
		
		// 如果是 Divided 调度且有权重偏好
		if req.SchedulingType == "Divided" && len(req.StaticWeightList) > 0 {
			template += `
      weightPreference:
        staticWeightList:`
			for _, wp := range req.StaticWeightList {
				template += fmt.Sprintf(`
        - targetCluster:
            clusterNames:`)
				for _, cluster := range wp.TargetCluster.ClusterNames {
					template += fmt.Sprintf(`
            - %s`, cluster)
				}
				template += fmt.Sprintf(`
          weight: %d`, wp.Weight)
			}
		}
	}
	
	return template
}

func generateClusterOverridePolicyTemplate(req *v1.PolicyTemplateRequest) string {
	// 基础元数据
	policyName := "override-template"
	if req.Name != "" {
		policyName = req.Name
	}
	
	template := fmt.Sprintf(`apiVersion: policy.karmada.io/v1alpha1
kind: ClusterOverridePolicy
metadata:
  name: %s`, policyName)
	
	// 添加标签
	if len(req.Labels) > 0 {
		template += `
  labels:`
		for key, value := range req.Labels {
			template += fmt.Sprintf(`
    %s: %s`, key, value)
		}
	}
	
	template += `
spec:
  resourceSelectors:`
	
	// 资源选择器
	if len(req.ResourceSelectors) > 0 {
		for _, sel := range req.ResourceSelectors {
			template += fmt.Sprintf(`
  - apiVersion: %s
    kind: %s`, sel.APIVersion, sel.Kind)
			if sel.Name != "" {
				template += fmt.Sprintf(`
    name: %s`, sel.Name)
			}
			if sel.Namespace != "" {
				template += fmt.Sprintf(`
    namespace: %s`, sel.Namespace)
			}
			if len(sel.LabelSelector) > 0 {
				template += `
    labelSelector:
      matchLabels:`
				for key, value := range sel.LabelSelector {
					template += fmt.Sprintf(`
        %s: %s`, key, value)
				}
			}
		}
	} else {
		template += `
  - apiVersion: apps/v1
    kind: Deployment`
	}
	
	// 目标集群
	if req.TargetCluster != nil {
		template += `
  targetCluster:`
		if len(req.TargetCluster.ClusterNames) > 0 {
			template += `
    clusterNames:`
			for _, cluster := range req.TargetCluster.ClusterNames {
				template += fmt.Sprintf(`
    - %s`, cluster)
			}
		}
		if len(req.TargetCluster.ClusterLabels) > 0 {
			template += `
    labelSelector:
      matchLabels:`
			for key, value := range req.TargetCluster.ClusterLabels {
				template += fmt.Sprintf(`
        %s: %s`, key, value)
			}
		}
	} else if len(req.Clusters) > 0 {
		template += `
  targetCluster:
    clusterNames:`
		for _, cluster := range req.Clusters {
			template += fmt.Sprintf(`
    - %s`, cluster)
		}
	} else {
		template += `
  targetCluster:
    clusterNames:
    - member1`
	}
	
	// 覆盖规则
	if req.OverrideRules != nil {
		template += `
  overrideRules:`
		
		if len(req.OverrideRules.ImageOverrides) > 0 {
			template += `
  - imageOverriders:`
			for _, img := range req.OverrideRules.ImageOverrides {
				template += fmt.Sprintf(`
    - component: %s
      replicas:`, img.Component)
				for cluster, image := range img.Replicas {
					template += fmt.Sprintf(`
        %s: %s`, cluster, image)
				}
			}
		}
		
		if len(req.OverrideRules.Args) > 0 {
			template += `
  - argsOverriders:`
			for _, arg := range req.OverrideRules.Args {
				template += fmt.Sprintf(`
    - containerName: "*"
      value:
      - %s`, arg)
			}
		}
		
		if len(req.OverrideRules.Command) > 0 {
			template += `
  - commandOverriders:`
			for _, cmd := range req.OverrideRules.Command {
				template += fmt.Sprintf(`
    - containerName: "*"
      value:
      - %s`, cmd)
			}
		}
	} else {
		// 提供示例覆盖规则
		template += `
  overrideRules:
  - imageOverriders:
    - component: nginx
      replicas: 
        member1: nginx:1.19`
	}
	
	return template
}

func generateOverridePolicyTemplate(req *v1.PolicyTemplateRequest) string {
	// 基础元数据
	policyName := "override-template"
	if req.Name != "" {
		policyName = req.Name
	}
	
	namespace := "default"
	if req.Namespace != "" {
		namespace = req.Namespace
	}
	
	template := fmt.Sprintf(`apiVersion: policy.karmada.io/v1alpha1
kind: OverridePolicy
metadata:
  name: %s
  namespace: %s`, policyName, namespace)
	
	// 添加标签
	if len(req.Labels) > 0 {
		template += `
  labels:`
		for key, value := range req.Labels {
			template += fmt.Sprintf(`
    %s: %s`, key, value)
		}
	}
	
	template += `
spec:
  resourceSelectors:`
	
	// 资源选择器
	if len(req.ResourceSelectors) > 0 {
		for _, sel := range req.ResourceSelectors {
			template += fmt.Sprintf(`
  - apiVersion: %s
    kind: %s`, sel.APIVersion, sel.Kind)
			if sel.Name != "" {
				template += fmt.Sprintf(`
    name: %s`, sel.Name)
			}
			if sel.Namespace != "" {
				template += fmt.Sprintf(`
    namespace: %s`, sel.Namespace)
			}
			if len(sel.LabelSelector) > 0 {
				template += `
    labelSelector:
      matchLabels:`
				for key, value := range sel.LabelSelector {
					template += fmt.Sprintf(`
        %s: %s`, key, value)
				}
			}
		}
	} else {
		template += `
  - apiVersion: apps/v1
    kind: Deployment`
	}
	
	// 目标集群
	if req.TargetCluster != nil {
		template += `
  targetCluster:`
		if len(req.TargetCluster.ClusterNames) > 0 {
			template += `
    clusterNames:`
			for _, cluster := range req.TargetCluster.ClusterNames {
				template += fmt.Sprintf(`
    - %s`, cluster)
			}
		}
		if len(req.TargetCluster.ClusterLabels) > 0 {
			template += `
    labelSelector:
      matchLabels:`
			for key, value := range req.TargetCluster.ClusterLabels {
				template += fmt.Sprintf(`
        %s: %s`, key, value)
			}
		}
	} else if len(req.Clusters) > 0 {
		template += `
  targetCluster:
    clusterNames:`
		for _, cluster := range req.Clusters {
			template += fmt.Sprintf(`
    - %s`, cluster)
		}
	} else {
		template += `
  targetCluster:
    clusterNames:
    - member1`
	}
	
	// 覆盖规则
	if req.OverrideRules != nil {
		template += `
  overrideRules:`
		
		if len(req.OverrideRules.ImageOverrides) > 0 {
			template += `
  - imageOverriders:`
			for _, img := range req.OverrideRules.ImageOverrides {
				template += fmt.Sprintf(`
    - component: %s
      replicas:`, img.Component)
				for cluster, image := range img.Replicas {
					template += fmt.Sprintf(`
        %s: %s`, cluster, image)
				}
			}
		}
		
		if len(req.OverrideRules.Args) > 0 {
			template += `
  - argsOverriders:`
			for _, arg := range req.OverrideRules.Args {
				template += fmt.Sprintf(`
    - containerName: "*"
      value:
      - %s`, arg)
			}
		}
		
		if len(req.OverrideRules.Command) > 0 {
			template += `
  - commandOverriders:`
			for _, cmd := range req.OverrideRules.Command {
				template += fmt.Sprintf(`
    - containerName: "*"
      value:
      - %s`, cmd)
			}
		}
	} else {
		// 提供示例覆盖规则
		template += `
  overrideRules:
  - imageOverriders:
    - component: nginx
      replicas: 
        member1: nginx:1.19`
	}
	
	return template
}

func validatePropagationPolicy(policyYAML string) error {
	var policy policyv1alpha1.PropagationPolicy
	if err := yaml.Unmarshal([]byte(policyYAML), &policy); err != nil {
		return fmt.Errorf("解析PropagationPolicy失败: %v", err)
	}
	
	if len(policy.Spec.ResourceSelectors) == 0 {
		return fmt.Errorf("ResourceSelectors不能为空")
	}
	
	return nil
}

func validateOverridePolicy(policyYAML string) error {
	// 这里可以添加OverridePolicy的具体验证逻辑
	return nil
}

func toCells(policies []common.Policy) []dataselect.DataCell {
	cells := make([]dataselect.DataCell, len(policies))
	for i := range policies {
		cells[i] = common.PolicyCell(policies[i])
	}
	return cells
}

func fromCells(cells []dataselect.DataCell) []common.Policy {
	policies := make([]common.Policy, len(cells))
	for i := range cells {
		policies[i] = common.Policy(cells[i].(common.PolicyCell))
	}
	return policies
} 
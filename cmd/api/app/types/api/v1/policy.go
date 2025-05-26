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

package v1

// PolicyFormRequest 表单方式创建策略的请求
type PolicyFormRequest struct {
	Name              string                    `json:"name" binding:"required"`
	Namespace         string                    `json:"namespace,omitempty"` // 为空时创建ClusterPropagationPolicy
	ResourceSelectors []PolicyResourceSelector  `json:"resourceSelectors" binding:"required,min=1"`
	Placement         PlacementSpec             `json:"placement" binding:"required"`
	Override          *OverrideRulesSpec        `json:"override,omitempty"`
	DependsOn         []ObjectReferenceSpec     `json:"dependsOn,omitempty"`
	Scheduling        string                    `json:"scheduling,omitempty"` // Duplicated, Divided
}

// PolicyResourceSelector 策略资源选择器
type PolicyResourceSelector struct {
	APIVersion    string            `json:"apiVersion" binding:"required"`
	Kind          string            `json:"kind" binding:"required"`
	Name          string            `json:"name,omitempty"`
	Namespace     string            `json:"namespace,omitempty"`
	LabelSelector map[string]string `json:"labelSelector,omitempty"`
}

// OverrideRulesSpec 覆盖规则规格
type OverrideRulesSpec struct {
	ImageOverrides []ImageOverride `json:"imageOverrides,omitempty"`
	Args           []string        `json:"args,omitempty"`
	Command        []string        `json:"command,omitempty"`
}

// ImageOverride 镜像覆盖
type ImageOverride struct {
	Component string              `json:"component"`
	Replicas  map[string]string   `json:"replicas"`
}

// ObjectReferenceSpec 对象引用规格
type ObjectReferenceSpec struct {
	APIVersion string `json:"apiVersion"`
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace,omitempty"`
}

// PolicyTemplateRequest 策略模板生成请求
type PolicyTemplateRequest struct {
	// 基础信息
	PolicyType     string `json:"policyType" binding:"required"` // propagation, override
	IsClusterScope bool   `json:"isClusterScope"`
	
	// 自定义元数据
	Name      string            `json:"name,omitempty"`      // 策略名称，默认为 "policy-template"
	Namespace string            `json:"namespace,omitempty"` // 命名空间，仅对非集群级策略有效
	Labels    map[string]string `json:"labels,omitempty"`    // 标签
	
	// 资源选择器
	ResourceSelectors []PolicyResourceSelector `json:"resourceSelectors"`
	
	// 放置策略
	Clusters       []string          `json:"clusters,omitempty"`       // 目标集群列表
	ClusterLabels  map[string]string `json:"clusterLabels,omitempty"`  // 集群标签选择器
	SchedulingType string            `json:"schedulingType,omitempty"` // Duplicated, Divided
	
	// 副本调度配置（仅当 SchedulingType 为 Divided 时）
	StaticWeightList []StaticWeightSpec `json:"staticWeightList,omitempty"`
	
	// 覆盖策略配置（仅当 PolicyType 为 override 时）
	OverrideRules *OverrideRulesSpec `json:"overrideRules,omitempty"`
	TargetCluster *ClusterTarget     `json:"targetCluster,omitempty"`
}



// ClusterTarget 覆盖策略的目标集群
type ClusterTarget struct {
	ClusterNames  []string          `json:"clusterNames,omitempty"`
	ClusterLabels map[string]string `json:"clusterLabels,omitempty"`
}

// PolicyTemplateResponse 策略模板响应
type PolicyTemplateResponse struct {
	Template string `json:"template"` // YAML格式的策略模板
}

// PolicyValidateRequest 策略验证请求
type PolicyValidateRequest struct {
	PolicyYAML string `json:"policyYAML" binding:"required"`
	PolicyType string `json:"policyType" binding:"required"` // propagation, override
}

// PolicyValidateResponse 策略验证响应
type PolicyValidateResponse struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

// PolicyStatusResponse 策略状态响应
type PolicyStatusResponse struct {
	Name        string                  `json:"name"`
	Namespace   string                  `json:"namespace,omitempty"`
	Type        string                  `json:"type"`        // PropagationPolicy, ClusterPropagationPolicy, OverridePolicy, ClusterOverridePolicy
	Status      string                  `json:"status"`      // Active, Inactive, Failed
	Clusters    []PolicyClusterStatus   `json:"clusters"`
	Resources   []PolicyResourceStatus  `json:"resources"`
	LastApplied string                  `json:"lastApplied"`
}

// PolicyClusterStatus 策略集群状态
type PolicyClusterStatus struct {
	ClusterName string `json:"clusterName"`
	Status      string `json:"status"` // Applied, Failed, Pending
	Message     string `json:"message,omitempty"`
}

// PolicyResourceStatus 策略资源状态  
type PolicyResourceStatus struct {
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace,omitempty"`
	Status     string `json:"status"` // Propagated, Failed, Pending
	Clusters   int    `json:"clusters"`
}

// BatchPolicyRequest 批量策略操作请求
type BatchPolicyRequest struct {
	PolicyNames []string `json:"policyNames" binding:"required,min=1"`
	Namespace   string   `json:"namespace,omitempty"`
	Action      string   `json:"action" binding:"required"` // delete, enable, disable
}

// BatchPolicyResponse 批量策略操作响应
type BatchPolicyResponse struct {
	Succeeded []string         `json:"succeeded"`
	Failed    []BatchFailItem  `json:"failed,omitempty"`
}

// BatchFailItem 批量操作失败项
type BatchFailItem struct {
	Name   string `json:"name"`
	Reason string `json:"reason"`
} 
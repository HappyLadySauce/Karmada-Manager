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

package templates

import (
	"fmt"
	"strings"
	"time"

	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
)

// GetPolicyTemplates 获取策略模板列表
func GetPolicyTemplates(category, policyType string) (*v1.PolicyTemplatesResponse, error) {
	klog.V(4).InfoS("Getting policy templates", "category", category, "type", policyType)

	// 模拟策略模板数据
	templates := []v1.PolicyTemplate{
		{
			ID:          "template-001",
			Name:        "多区域部署模板",
			Description: "将工作负载部署到多个地理区域",
			Category:    "workload",
			Type:        "propagation",
			Template: `apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: {{ .name }}
  namespace: {{ .namespace }}
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: {{ .deploymentName }}
  placement:
    clusterAffinity:
      clusterNames: {{ .clusters }}`,
			Variables: []v1.TemplateVariable{
				{
					Name:        "name",
					Type:        "string",
					Description: "策略名称",
					Required:    true,
				},
				{
					Name:        "namespace",
					Type:        "string",
					Description: "命名空间",
					Required:    true,
				},
				{
					Name:        "deploymentName",
					Type:        "string",
					Description: "Deployment名称",
					Required:    true,
				},
				{
					Name:        "clusters",
					Type:        "array",
					Description: "目标集群列表",
					Required:    true,
				},
			},
			Tags:      []string{"multi-region", "workload"},
			CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-7 * 24 * time.Hour),
		},
		{
			ID:          "template-002",
			Name:        "服务分发模板",
			Description: "将服务分发到指定集群",
			Category:    "service",
			Type:        "propagation",
			Template: `apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: {{ .name }}
  namespace: {{ .namespace }}
spec:
  resourceSelectors:
  - apiVersion: v1
    kind: Service
    name: {{ .serviceName }}
  placement:
    clusterSelector:
      matchLabels:
        {{ .clusterLabels }}`,
			Variables: []v1.TemplateVariable{
				{
					Name:        "name",
					Type:        "string",
					Description: "策略名称",
					Required:    true,
				},
				{
					Name:        "namespace",
					Type:        "string",
					Description: "命名空间",
					Required:    true,
				},
				{
					Name:        "serviceName",
					Type:        "string",
					Description: "服务名称",
					Required:    true,
				},
				{
					Name:        "clusterLabels",
					Type:        "object",
					Description: "集群标签选择器",
					Required:    true,
				},
			},
			Tags:      []string{"service", "network"},
			CreatedAt: time.Now().Add(-20 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-5 * 24 * time.Hour),
		},
		{
			ID:          "template-003",
			Name:        "镜像覆盖模板",
			Description: "为不同集群设置不同的镜像",
			Category:    "config",
			Type:        "override",
			Template: `apiVersion: policy.karmada.io/v1alpha1
kind: OverridePolicy
metadata:
  name: {{ .name }}
  namespace: {{ .namespace }}
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: {{ .deploymentName }}
  targetCluster:
    clusterNames: {{ .clusters }}
  overrideRules:
  - imageOverrides:
    - component: {{ .component }}
      replicas:
        {{ .imageReplicas }}`,
			Variables: []v1.TemplateVariable{
				{
					Name:        "name",
					Type:        "string",
					Description: "策略名称",
					Required:    true,
				},
				{
					Name:        "namespace",
					Type:        "string",
					Description: "命名空间",
					Required:    true,
				},
				{
					Name:        "deploymentName",
					Type:        "string",
					Description: "Deployment名称",
					Required:    true,
				},
				{
					Name:        "component",
					Type:        "string",
					Description: "容器组件名称",
					Required:    true,
				},
				{
					Name:        "clusters",
					Type:        "array",
					Description: "目标集群列表",
					Required:    true,
				},
				{
					Name:        "imageReplicas",
					Type:        "object",
					Description: "镜像映射配置",
					Required:    true,
				},
			},
			Tags:      []string{"override", "image"},
			CreatedAt: time.Now().Add(-15 * 24 * time.Hour),
			UpdatedAt: time.Now().Add(-3 * 24 * time.Hour),
		},
	}

	// 应用过滤条件
	var filteredTemplates []v1.PolicyTemplate
	for _, template := range templates {
		if category != "" && template.Category != category {
			continue
		}
		if policyType != "" && template.Type != policyType {
			continue
		}
		filteredTemplates = append(filteredTemplates, template)
	}

	return &v1.PolicyTemplatesResponse{
		Templates: filteredTemplates,
	}, nil
}

// ValidatePolicyYAML 验证策略YAML
func ValidatePolicyYAML(req *v1.PolicyValidationRequest) (*v1.PolicyValidationResult, error) {
	klog.V(4).InfoS("Validating policy YAML", "type", req.Type)

	result := &v1.PolicyValidationResult{
		Valid:       true,
		Errors:      []string{},
		Warnings:    []string{},
		Suggestions: []string{},
	}

	// 基础YAML格式验证
	var yamlDoc interface{}
	if err := yaml.Unmarshal([]byte(req.YAML), &yamlDoc); err != nil {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("YAML格式错误: %v", err))
		return result, nil
	}

	// 检查必要字段
	errors, warnings, suggestions := validatePolicyFields(req.YAML, req.Type)
	result.Errors = append(result.Errors, errors...)
	result.Warnings = append(result.Warnings, warnings...)
	result.Suggestions = append(result.Suggestions, suggestions...)

	if len(result.Errors) > 0 {
		result.Valid = false
	}

	return result, nil
}

// validatePolicyFields 验证策略字段
func validatePolicyFields(yamlContent, policyType string) ([]string, []string, []string) {
	var errors []string
	var warnings []string
	var suggestions []string

	// 检查apiVersion和kind
	if !strings.Contains(yamlContent, "apiVersion: policy.karmada.io/v1alpha1") {
		errors = append(errors, "apiVersion必须为 policy.karmada.io/v1alpha1")
	}

	if policyType == "propagation" {
		if !strings.Contains(yamlContent, "kind: PropagationPolicy") &&
			!strings.Contains(yamlContent, "kind: ClusterPropagationPolicy") {
			errors = append(errors, "传播策略的kind必须为 PropagationPolicy 或 ClusterPropagationPolicy")
		}

		if !strings.Contains(yamlContent, "resourceSelectors:") {
			errors = append(errors, "传播策略必须包含 resourceSelectors 字段")
		}

		if !strings.Contains(yamlContent, "placement:") {
			errors = append(errors, "传播策略必须包含 placement 字段")
		} else {
			if !strings.Contains(yamlContent, "clusterNames") &&
				!strings.Contains(yamlContent, "clusterSelector") {
				warnings = append(warnings, "建议指定目标集群或集群选择器")
			}
		}
	} else if policyType == "override" {
		if !strings.Contains(yamlContent, "kind: OverridePolicy") &&
			!strings.Contains(yamlContent, "kind: ClusterOverridePolicy") {
			errors = append(errors, "覆盖策略的kind必须为 OverridePolicy 或 ClusterOverridePolicy")
		}

		if !strings.Contains(yamlContent, "resourceSelectors:") {
			errors = append(errors, "覆盖策略必须包含 resourceSelectors 字段")
		}

		if !strings.Contains(yamlContent, "overrideRules:") {
			errors = append(errors, "覆盖策略必须包含 overrideRules 字段")
		}
	}

	// 通用建议
	if !strings.Contains(yamlContent, "name:") {
		warnings = append(warnings, "建议在metadata中设置name字段")
	}

	if strings.Contains(yamlContent, "namespace:") && strings.Contains(yamlContent, "ClusterPropagationPolicy") {
		warnings = append(warnings, "集群级策略不需要设置namespace字段")
	}

	suggestions = append(suggestions, "建议添加适当的标签(labels)以便管理")
	suggestions = append(suggestions, "考虑设置合适的副本调度策略(replicaScheduling)")

	return errors, warnings, suggestions
}

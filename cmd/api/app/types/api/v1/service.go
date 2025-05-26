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

// ServiceFormRequest 表单方式创建Service的请求
type ServiceFormRequest struct {
	Name      string            `json:"name" binding:"required"`
	Namespace string            `json:"namespace" binding:"required"`
	Labels    map[string]string `json:"labels,omitempty"`
	Type      string            `json:"type" binding:"required"`      // ClusterIP, NodePort, LoadBalancer
	Selector  map[string]string `json:"selector" binding:"required"` // 选择器
	Ports     []ServicePortSpec `json:"ports" binding:"required,min=1"`
	PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

// ServicePortSpec Service端口规格
type ServicePortSpec struct {
	Name       string `json:"name,omitempty"`
	Port       int32  `json:"port" binding:"required"`       // Service端口
	TargetPort int32  `json:"targetPort" binding:"required"` // 目标端口
	NodePort   int32  `json:"nodePort,omitempty"`            // NodePort（当Type为NodePort时）
	Protocol   string `json:"protocol,omitempty"`            // TCP, UDP
}

// UpdateServiceRequest 更新Service请求
type UpdateServiceRequest struct {
	Namespace string             `json:"namespace" binding:"required"`
	Name      string             `json:"name" binding:"required"`
	Spec      ServiceFormRequest `json:"spec"`
}

// CreateServiceResponse Service创建响应
type CreateServiceResponse struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Message   string `json:"message"`
}
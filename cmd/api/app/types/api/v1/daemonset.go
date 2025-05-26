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

// DaemonSetFormRequest 表单方式创建DaemonSet的请求
type DaemonSetFormRequest struct {
	Name              string                      `json:"name" binding:"required"`
	Namespace         string                      `json:"namespace" binding:"required"`
	Labels            map[string]string           `json:"labels,omitempty"`
	Containers        []ContainerSpec             `json:"containers" binding:"required,min=1"`
	InitContainers    []ContainerSpec             `json:"initContainers,omitempty"`
	Volumes           []VolumeSpec                `json:"volumes,omitempty"`
	NodeSelector      map[string]string           `json:"nodeSelector,omitempty"`
	Tolerations       []TolerationSpec            `json:"tolerations,omitempty"`
	UpdateStrategy    *DaemonSetUpdateStrategy    `json:"updateStrategy,omitempty"`
	PropagationPolicy *PropagationPolicyConfig    `json:"propagationPolicy,omitempty"`
}

// TolerationSpec 容忍规格
type TolerationSpec struct {
	Key      string `json:"key,omitempty"`
	Operator string `json:"operator,omitempty"` // Equal, Exists
	Value    string `json:"value,omitempty"`
	Effect   string `json:"effect,omitempty"`   // NoSchedule, PreferNoSchedule, NoExecute
}

// DaemonSetUpdateStrategy DaemonSet更新策略
type DaemonSetUpdateStrategy struct {
	Type          string                              `json:"type,omitempty"` // RollingUpdate, OnDelete
	RollingUpdate *DaemonSetRollingUpdateStrategy     `json:"rollingUpdate,omitempty"`
}

// DaemonSetRollingUpdateStrategy DaemonSet滚动更新策略
type DaemonSetRollingUpdateStrategy struct {
	MaxUnavailable string `json:"maxUnavailable,omitempty"` // 如 "1" 或 "25%"
}

// UpdateDaemonSetRequest 更新DaemonSet请求
type UpdateDaemonSetRequest struct {
	Namespace string               `json:"namespace" binding:"required"`
	Name      string               `json:"name" binding:"required"`
	Spec      DaemonSetFormRequest `json:"spec"`
} 
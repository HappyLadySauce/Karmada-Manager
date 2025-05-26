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

// StatefulSetFormRequest 表单方式创建StatefulSet的请求
type StatefulSetFormRequest struct {
	Name               string                       `json:"name" binding:"required"`
	Namespace          string                       `json:"namespace" binding:"required"`
	Labels             map[string]string            `json:"labels,omitempty"`
	Replicas           int32                        `json:"replicas" binding:"required"`
	ServiceName        string                       `json:"serviceName" binding:"required"` // StatefulSet需要headless service
	Containers         []ContainerSpec              `json:"containers" binding:"required,min=1"`
	InitContainers     []ContainerSpec              `json:"initContainers,omitempty"`
	Volumes            []VolumeSpec                 `json:"volumes,omitempty"`
	VolumeClaimTemplates []PersistentVolumeClaimSpec `json:"volumeClaimTemplates,omitempty"`
	UpdateStrategy     *StatefulSetUpdateStrategy   `json:"updateStrategy,omitempty"`
	PropagationPolicy  *PropagationPolicyConfig     `json:"propagationPolicy,omitempty"`
}

// PersistentVolumeClaimSpec PVC模板规格
type PersistentVolumeClaimSpec struct {
	Name         string            `json:"name" binding:"required"`
	AccessModes  []string          `json:"accessModes" binding:"required"`
	StorageClass string            `json:"storageClass,omitempty"`
	Size         string            `json:"size" binding:"required"` // 如 "10Gi"
	Labels       map[string]string `json:"labels,omitempty"`
}

// StatefulSetUpdateStrategy StatefulSet更新策略
type StatefulSetUpdateStrategy struct {
	Type              string                             `json:"type,omitempty"` // RollingUpdate, OnDelete
	RollingUpdate     *StatefulSetRollingUpdateStrategy  `json:"rollingUpdate,omitempty"`
}

// StatefulSetRollingUpdateStrategy StatefulSet滚动更新策略
type StatefulSetRollingUpdateStrategy struct {
	Partition *int32 `json:"partition,omitempty"`
}

// UpdateStatefulSetRequest 更新StatefulSet请求
type UpdateStatefulSetRequest struct {
	Namespace string                  `json:"namespace" binding:"required"`
	Name      string                  `json:"name" binding:"required"`
	Spec      StatefulSetFormRequest  `json:"spec"`
}

// ScaleStatefulSetRequest 扩缩容StatefulSet请求
type ScaleStatefulSetRequest struct {
	Replicas int32 `json:"replicas" binding:"required"`
} 
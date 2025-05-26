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

// JobFormRequest 表单方式创建Job的请求
type JobFormRequest struct {
	Name              string                   `json:"name" binding:"required"`
	Namespace         string                   `json:"namespace" binding:"required"`
	Labels            map[string]string        `json:"labels,omitempty"`
	Containers        []ContainerSpec          `json:"containers" binding:"required,min=1"`
	InitContainers    []ContainerSpec          `json:"initContainers,omitempty"`
	Volumes           []VolumeSpec             `json:"volumes,omitempty"`
	RestartPolicy     string                   `json:"restartPolicy,omitempty"` // Never, OnFailure
	Completions       *int32                   `json:"completions,omitempty"`
	Parallelism       *int32                   `json:"parallelism,omitempty"`
	BackoffLimit      *int32                   `json:"backoffLimit,omitempty"`
	ActiveDeadlineSeconds *int64               `json:"activeDeadlineSeconds,omitempty"`
	PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

// UpdateJobRequest 更新Job请求
type UpdateJobRequest struct {
	Namespace string         `json:"namespace" binding:"required"`
	Name      string         `json:"name" binding:"required"`
	Spec      JobFormRequest `json:"spec"`
} 
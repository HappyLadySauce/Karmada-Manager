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

// CreateDeploymentRequest defines the request structure for creating a deployment.
type CreateDeploymentRequest struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Content   string `json:"content"`
}

// CreateDeploymentResponse defines the response structure for creating a deployment.
type CreateDeploymentResponse struct{}

// DeploymentFormRequest 表单方式创建Deployment的请求
type DeploymentFormRequest struct {
	Name              string                    `json:"name" binding:"required"`
	Namespace         string                    `json:"namespace" binding:"required"`
	Labels            map[string]string         `json:"labels,omitempty"`
	Replicas          int32                     `json:"replicas" binding:"min=1"`
	Containers        []ContainerSpec           `json:"containers" binding:"required,min=1"`
	InitContainers    []ContainerSpec           `json:"initContainers,omitempty"`
	Volumes           []VolumeSpec              `json:"volumes,omitempty"`
	Strategy          *DeploymentStrategySpec   `json:"strategy,omitempty"`
	PropagationPolicy *PropagationPolicyConfig `json:"propagationPolicy,omitempty"`
}

// ContainerSpec 容器规格
type ContainerSpec struct {
	Name         string                  `json:"name" binding:"required"`
	Image        string                  `json:"image" binding:"required"`
	Ports        []ContainerPortSpec     `json:"ports,omitempty"`
	Env          []EnvVarSpec            `json:"env,omitempty"`
	Resources    *ResourceRequirementsSpec `json:"resources,omitempty"`
	VolumeMounts []VolumeMountSpec       `json:"volumeMounts,omitempty"`
	LivenessProbe  *ProbeSpec            `json:"livenessProbe,omitempty"`
	ReadinessProbe *ProbeSpec            `json:"readinessProbe,omitempty"`
}

// ContainerPortSpec 容器端口规格
type ContainerPortSpec struct {
	Name          string `json:"name,omitempty"`
	ContainerPort int32  `json:"containerPort" binding:"required"`
	Protocol      string `json:"protocol,omitempty"`
}

// EnvVarSpec 环境变量规格
type EnvVarSpec struct {
	Name  string `json:"name" binding:"required"`
	Value string `json:"value"`
}

// ResourceRequirementsSpec 资源需求规格
type ResourceRequirementsSpec struct {
	Requests ResourceListSpec `json:"requests,omitempty"`
	Limits   ResourceListSpec `json:"limits,omitempty"`
}

// ResourceListSpec 资源列表规格
type ResourceListSpec struct {
	CPU    string `json:"cpu,omitempty"`
	Memory string `json:"memory,omitempty"`
}

// VolumeMountSpec 卷挂载规格
type VolumeMountSpec struct {
	Name      string `json:"name" binding:"required"`
	MountPath string `json:"mountPath" binding:"required"`
	ReadOnly  bool   `json:"readOnly,omitempty"`
}

// VolumeSpec 卷规格
type VolumeSpec struct {
	Name      string          `json:"name" binding:"required"`
	ConfigMap *ConfigMapVolumeSource `json:"configMap,omitempty"`
	Secret    *SecretVolumeSource    `json:"secret,omitempty"`
	EmptyDir  *EmptyDirVolumeSource  `json:"emptyDir,omitempty"`
}

// ConfigMapVolumeSource ConfigMap卷源
type ConfigMapVolumeSource struct {
	Name string `json:"name" binding:"required"`
}

// SecretVolumeSource Secret卷源
type SecretVolumeSource struct {
	SecretName string `json:"secretName" binding:"required"`
}

// EmptyDirVolumeSource EmptyDir卷源
type EmptyDirVolumeSource struct {
	SizeLimit string `json:"sizeLimit,omitempty"`
}

// ProbeSpec 探针规格
type ProbeSpec struct {
	HTTPGet             *HTTPGetAction `json:"httpGet,omitempty"`
	InitialDelaySeconds int32          `json:"initialDelaySeconds,omitempty"`
	PeriodSeconds       int32          `json:"periodSeconds,omitempty"`
	TimeoutSeconds      int32          `json:"timeoutSeconds,omitempty"`
}

// HTTPGetAction HTTP GET动作
type HTTPGetAction struct {
	Path string `json:"path"`
	Port int32  `json:"port"`
}

// DeploymentStrategySpec 部署策略规格
type DeploymentStrategySpec struct {
	Type          string                      `json:"type,omitempty"` // RollingUpdate, Recreate
	RollingUpdate *RollingUpdateDeployment    `json:"rollingUpdate,omitempty"`
}

// RollingUpdateDeployment 滚动更新部署
type RollingUpdateDeployment struct {
	MaxSurge       string `json:"maxSurge,omitempty"`
	MaxUnavailable string `json:"maxUnavailable,omitempty"`
}

// PropagationPolicyConfig 分发策略配置
type PropagationPolicyConfig struct {
	Create bool             `json:"create"`               // 是否创建新的策略
	Name   string           `json:"name,omitempty"`       // 策略名称
	Placement PlacementSpec `json:"placement,omitempty"` // 分发策略
}

// UpdateDeploymentRequest 更新Deployment请求
type UpdateDeploymentRequest struct {
	Namespace string              `json:"namespace" binding:"required"`
	Name      string              `json:"name" binding:"required"`
	Spec      DeploymentFormRequest `json:"spec"`
}

// ScaleDeploymentRequest 扩缩容Deployment请求
type ScaleDeploymentRequest struct {
	Replicas int32 `json:"replicas" binding:"min=0"`
}

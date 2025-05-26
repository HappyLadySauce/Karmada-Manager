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

// ClustersResourceView 集群资源视图响应
type ClustersResourceView struct {
	Clusters []ClusterResourceInfo `json:"clusters"`
}

// ClusterResourceInfo 集群资源信息
type ClusterResourceInfo struct {
	Name        string           `json:"name"`
	Region      string           `json:"region,omitempty"`
	Zone        string           `json:"zone,omitempty"`
	Status      string           `json:"status"`
	Resources   ResourceMetrics  `json:"resources"`
	Labels      map[string]string `json:"labels"`
	Taints      []TaintInfo      `json:"taints"`
	LoadLevel   string           `json:"loadLevel"` // low, medium, high
}

// ResourceMetrics 资源指标
type ResourceMetrics struct {
	CPU    ResourceMetric `json:"cpu"`
	Memory ResourceMetric `json:"memory"`
	Pod    PodMetric      `json:"pod"`
}

// ResourceMetric 资源指标
type ResourceMetric struct {
	Capacity    int64 `json:"capacity"`
	Allocatable int64 `json:"allocatable"`
	Allocated   int64 `json:"allocated"`
	Usage       int64 `json:"usage,omitempty"`
}

// PodMetric Pod指标
type PodMetric struct {
	Capacity    int64 `json:"capacity"`
	Allocatable int64 `json:"allocatable"`
	Allocated   int64 `json:"allocated"`
}

// TaintInfo 污点信息
type TaintInfo struct {
	Key    string `json:"key"`
	Value  string `json:"value,omitempty"`
	Effect string `json:"effect"`
}

// SchedulingSimulateRequest 调度模拟请求
type SchedulingSimulateRequest struct {
	Workload  WorkloadSpec  `json:"workload"`
	Placement PlacementSpec `json:"placement"`
}

// WorkloadSpec 工作负载规格
type WorkloadSpec struct {
	Kind      string                 `json:"kind"`
	Replicas  int32                  `json:"replicas"`
	Resources WorkloadResourceSpec   `json:"resources,omitempty"`
}

// WorkloadResourceSpec 工作负载资源规格
type WorkloadResourceSpec struct {
	Requests ResourceRequirements `json:"requests,omitempty"`
}

// ResourceRequirements 资源需求
type ResourceRequirements struct {
	CPU    string `json:"cpu,omitempty"`
	Memory string `json:"memory,omitempty"`
}

// PlacementSpec 分发规格
type PlacementSpec struct {
	ClusterAffinity    *ClusterAffinitySpec    `json:"clusterAffinity,omitempty"`
	ClusterSelector    *LabelSelector          `json:"clusterSelector,omitempty"`
	SpreadConstraints  []SpreadConstraintSpec  `json:"spreadConstraints,omitempty"`
	ReplicaScheduling  *ReplicaSchedulingSpec  `json:"replicaScheduling,omitempty"`
}

// ClusterAffinitySpec 集群亲和性规格
type ClusterAffinitySpec struct {
	ClusterNames []string `json:"clusterNames,omitempty"`
}

// LabelSelector 标签选择器
type LabelSelector struct {
	MatchLabels map[string]string `json:"matchLabels,omitempty"`
}

// SpreadConstraintSpec 分布约束规格
type SpreadConstraintSpec struct {
	SpreadByField       string `json:"spreadByField"`
	MaxSkew             int32  `json:"maxSkew,omitempty"`
	MinGroups           int32  `json:"minGroups,omitempty"`
	WhenUnsatisfiable   string `json:"whenUnsatisfiable"`
}

// ReplicaSchedulingSpec 副本调度规格
type ReplicaSchedulingSpec struct {
	ReplicaSchedulingType string              `json:"replicaSchedulingType"` // Duplicated, Divided
	WeightPreference      *WeightPreference   `json:"weightPreference,omitempty"`
}

// WeightPreference 权重偏好
type WeightPreference struct {
	StaticWeightList []StaticWeightSpec `json:"staticWeightList,omitempty"`
}

// StaticWeightSpec 静态权重规格
type StaticWeightSpec struct {
	TargetCluster TargetClusterSpec `json:"targetCluster"`
	Weight        int32             `json:"weight"`
}

// TargetClusterSpec 目标集群规格
type TargetClusterSpec struct {
	ClusterNames []string `json:"clusterNames"`
}

// SchedulingSimulateResponse 调度模拟响应
type SchedulingSimulateResponse struct {
	SchedulingResult []SchedulingResult `json:"schedulingResult"`
	Warnings         []string           `json:"warnings"`
	Errors           []string           `json:"errors"`
}

// SchedulingResult 调度结果
type SchedulingResult struct {
	ClusterName string `json:"clusterName"`
	Replicas    int32  `json:"replicas"`
	Reason      string `json:"reason"`
}

// ResourceSchedulingTreeRequest 资源调度关系树请求
type ResourceSchedulingTreeRequest struct {
	ResourceType string `json:"resourceType,omitempty"` // deployment, service, all
	Namespace    string `json:"namespace,omitempty"`
	ResourceName string `json:"resourceName,omitempty"`
}

// ResourceSchedulingTreeResponse 资源调度关系树响应
type ResourceSchedulingTreeResponse struct {
	Nodes []TreeNode `json:"nodes"`
	Edges []TreeEdge `json:"edges"`
}

// TreeNode 树节点
type TreeNode struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`        // cluster, policy, resource, binding
	Name        string                 `json:"name"`
	Namespace   string                 `json:"namespace,omitempty"`
	Status      string                 `json:"status"`      // ready, pending, failed
	Properties  map[string]interface{} `json:"properties,omitempty"`
	Position    *NodePosition          `json:"position,omitempty"`
	Style       *NodeStyle             `json:"style,omitempty"`
}

// TreeEdge 树边
type TreeEdge struct {
	ID       string     `json:"id"`
	Source   string     `json:"source"`
	Target   string     `json:"target"`
	Type     string     `json:"type"`     // propagate, schedule, bind
	Label    string     `json:"label,omitempty"`
	Status   string     `json:"status"`   // active, inactive, failed
	Style    *EdgeStyle `json:"style,omitempty"`
}

// NodePosition 节点位置
type NodePosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// NodeStyle 节点样式
type NodeStyle struct {
	Width       int    `json:"width,omitempty"`
	Height      int    `json:"height,omitempty"`
	Color       string `json:"color,omitempty"`
	BorderColor string `json:"borderColor,omitempty"`
	Icon        string `json:"icon,omitempty"`
}

// EdgeStyle 边样式
type EdgeStyle struct {
	Color     string `json:"color,omitempty"`
	Width     int    `json:"width,omitempty"`
	DashArray string `json:"dashArray,omitempty"`
} 
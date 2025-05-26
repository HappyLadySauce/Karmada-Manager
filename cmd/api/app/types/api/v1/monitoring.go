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

import "time"

// RealtimeMonitoringData 实时监控数据响应
type RealtimeMonitoringData struct {
	Timestamp time.Time               `json:"timestamp"`
	Clusters  []ClusterMonitoringInfo `json:"clusters"`
	Alerts    []AlertInfo             `json:"alerts"`
}

// ClusterMonitoringInfo 集群监控信息
type ClusterMonitoringInfo struct {
	Name      string               `json:"name"`
	Status    string               `json:"status"`
	Resources ClusterResourceUsage `json:"resources"`
}

// ClusterResourceUsage 集群资源使用情况
type ClusterResourceUsage struct {
	CPU    ResourceUsageInfo `json:"cpu"`
	Memory ResourceUsageInfo `json:"memory"`
	Pods   PodUsageInfo      `json:"pods"`
}

// ResourceUsageInfo 资源使用信息
type ResourceUsageInfo struct {
	Usage float64 `json:"usage"` // 使用率百分比
	Trend string  `json:"trend"` // up, down, stable
}

// PodUsageInfo Pod使用信息
type PodUsageInfo struct {
	Count int32  `json:"count"`
	Trend string `json:"trend"`
}

// AlertInfo 告警信息
type AlertInfo struct {
	Level     string    `json:"level"` // info, warning, error
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Source    string    `json:"source"`
}

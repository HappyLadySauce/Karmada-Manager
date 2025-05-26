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

package monitoring

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

// GetRealtimeMonitoringData 获取实时监控数据
func GetRealtimeMonitoringData(monitorType string, interval int) (*v1.RealtimeMonitoringData, error) {
	klog.V(4).InfoS("Getting realtime monitoring data", "type", monitorType, "interval", interval)

	data := &v1.RealtimeMonitoringData{
		Timestamp: time.Now(),
	}

	// 获取集群监控信息
	clusters, err := getClusterMonitoringInfo()
	if err != nil {
		klog.ErrorS(err, "Failed to get cluster monitoring info")
		return nil, fmt.Errorf("获取集群监控信息失败: %v", err)
	}
	data.Clusters = clusters

	// 获取告警信息
	alerts, err := getActiveAlerts()
	if err != nil {
		klog.ErrorS(err, "Failed to get active alerts")
		// 告警失败不影响主要数据，继续执行
	}
	data.Alerts = alerts

	return data, nil
}

// getClusterMonitoringInfo 获取集群监控信息
func getClusterMonitoringInfo() ([]v1.ClusterMonitoringInfo, error) {
	karmadaClient := client.InClusterKarmadaClient()
	clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	var monitoringInfo []v1.ClusterMonitoringInfo

	for _, cluster := range clusters.Items {
		info := v1.ClusterMonitoringInfo{
			Name:   cluster.Name,
			Status: "Ready",
		}

		// 获取资源使用情况（模拟数据）
		usage := getResourceUsage(cluster.Name)
		info.Resources = usage

		// 判断集群状态
		if len(cluster.Status.Conditions) > 0 {
			condition := cluster.Status.Conditions[0]
			if condition.Type == "Ready" {
				info.Status = string(condition.Status)
			}
		}

		monitoringInfo = append(monitoringInfo, info)
	}

	return monitoringInfo, nil
}

// getResourceUsage 获取资源使用情况（模拟实现）
func getResourceUsage(clusterName string) v1.ClusterResourceUsage {
	// 模拟实时资源使用率数据
	rand.Seed(time.Now().UnixNano())

	// 根据集群名称生成不同的基础值，保持一定的一致性
	hash := 0
	for _, c := range clusterName {
		hash += int(c)
	}
	rand.Seed(int64(hash))

	baseUsage := float64(rand.Intn(30) + 40) // 40-70%的基础使用率

	return v1.ClusterResourceUsage{
		CPU: v1.ResourceUsageInfo{
			Usage: baseUsage + float64(rand.Intn(10)) - 5, // ±5%的波动
			Trend: getTrend(),
		},
		Memory: v1.ResourceUsageInfo{
			Usage: baseUsage + float64(rand.Intn(15)) - 7.5, // ±7.5%的波动
			Trend: getTrend(),
		},
		Pods: v1.PodUsageInfo{
			Count: int32(rand.Intn(100) + 50), // 50-150个Pod
			Trend: getTrend(),
		},
	}
}

// getTrend 获取趋势（模拟）
func getTrend() string {
	trends := []string{"up", "down", "stable"}
	return trends[rand.Intn(len(trends))]
}

// getActiveAlerts 获取活跃告警（模拟实现）
func getActiveAlerts() ([]v1.AlertInfo, error) {
	alerts := []v1.AlertInfo{
		{
			Level:     "warning",
			Message:   "集群 cluster-beijing CPU 使用率过高",
			Timestamp: time.Now().Add(-5 * time.Minute),
			Source:    "cluster-beijing",
		},
		{
			Level:     "info",
			Message:   "集群 cluster-shanghai 新增节点",
			Timestamp: time.Now().Add(-2 * time.Minute),
			Source:    "cluster-shanghai",
		},
	}

	return alerts, nil
}

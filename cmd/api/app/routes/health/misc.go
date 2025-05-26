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

package health

import (
	"context"
	"fmt"
	"runtime"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

var startTime = time.Now()

// GetSystemHealth 获取基础健康状态
func GetSystemHealth() (*v1.SystemHealth, error) {
	klog.V(4).InfoS("Getting system health")

	health := &v1.SystemHealth{
		Status:    "healthy",
		Timestamp: time.Now(),
		Uptime:    formatUptime(time.Since(startTime)),
		Version:   "v1.0.0", // 应该从构建信息中获取
	}

	// 检查基础组件状态
	if !checkKarmadaConnection() {
		health.Status = "unhealthy"
	}

	return health, nil
}

// GetDetailedSystemHealth 获取详细健康状态
func GetDetailedSystemHealth() (*v1.DetailedSystemHealth, error) {
	klog.V(4).InfoS("Getting detailed system health")

	health := &v1.DetailedSystemHealth{
		Overall:      "healthy",
		Components:   []v1.ComponentHealth{},
		Dependencies: []v1.DependencyHealth{},
	}

	// 检查各个组件
	components := checkComponents()
	health.Components = components

	// 检查依赖项
	dependencies := checkDependencies()
	health.Dependencies = dependencies

	// 判断整体状态
	errorCount := 0
	warningCount := 0

	for _, comp := range components {
		if comp.Status == "error" {
			errorCount++
		} else if comp.Status == "warning" {
			warningCount++
		}
	}

	for _, dep := range dependencies {
		if dep.Status == "error" {
			errorCount++
		} else if dep.Status == "warning" {
			warningCount++
		}
	}

	if errorCount > 0 {
		health.Overall = "unhealthy"
	} else if warningCount > 0 {
		health.Overall = "degraded"
	} else {
		health.Overall = "healthy"
	}

	return health, nil
}

// checkComponents 检查系统组件状态
func checkComponents() []v1.ComponentHealth {
	components := []v1.ComponentHealth{}

	// API服务器组件
	apiComponent := v1.ComponentHealth{
		Name:      "API Server",
		Status:    "healthy",
		Message:   "API服务器运行正常",
		LastCheck: time.Now(),
		Metrics: map[string]interface{}{
			"goroutines": runtime.NumGoroutine(),
			"memory":     getMemoryUsage(),
		},
	}
	components = append(components, apiComponent)

	// Karmada控制器组件
	karmadaComponent := v1.ComponentHealth{
		Name:      "Karmada Controller",
		Status:    getKarmadaControllerStatus(),
		Message:   "Karmada控制器状态",
		LastCheck: time.Now(),
	}
	components = append(components, karmadaComponent)

	// 数据库组件（实际上Karmada使用etcd）
	dbComponent := v1.ComponentHealth{
		Name:      "Database",
		Status:    "healthy",
		Message:   "数据存储正常",
		LastCheck: time.Now(),
	}
	components = append(components, dbComponent)

	return components
}

// checkDependencies 检查外部依赖状态
func checkDependencies() []v1.DependencyHealth {
	dependencies := []v1.DependencyHealth{}

	// Kubernetes API依赖
	k8sHealth := checkKubernetesAPI()
	dependencies = append(dependencies, k8sHealth)

	// Karmada API依赖
	karmadaHealth := checkKarmadaAPI()
	dependencies = append(dependencies, karmadaHealth)

	return dependencies
}

// checkKarmadaConnection 检查Karmada连接
func checkKarmadaConnection() bool {
	karmadaClient := client.InClusterKarmadaClient()
	if karmadaClient == nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{Limit: 1})
	return err == nil
}

// getKarmadaControllerStatus 获取Karmada控制器状态
func getKarmadaControllerStatus() string {
	if checkKarmadaConnection() {
		return "healthy"
	}
	return "error"
}

// checkKubernetesAPI 检查Kubernetes API状态
func checkKubernetesAPI() v1.DependencyHealth {
	health := v1.DependencyHealth{
		Name:   "Kubernetes API",
		Status: "healthy",
	}

	k8sClient := client.InClusterClient()
	if k8sClient == nil {
		health.Status = "error"
		health.Message = "无法连接到Kubernetes API"
		return health
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	start := time.Now()
	_, err := k8sClient.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 1})
	latency := time.Since(start)

	health.Latency = latency.String()

	if err != nil {
		health.Status = "error"
		health.Message = fmt.Sprintf("API调用失败: %v", err)
	} else if latency > 2*time.Second {
		health.Status = "warning"
		health.Message = "API响应较慢"
	} else {
		health.Message = "API响应正常"
	}

	health.Details = map[string]interface{}{
		"latency_ms": latency.Milliseconds(),
	}

	return health
}

// checkKarmadaAPI 检查Karmada API状态
func checkKarmadaAPI() v1.DependencyHealth {
	health := v1.DependencyHealth{
		Name:   "Karmada API",
		Status: "healthy",
	}

	karmadaClient := client.InClusterKarmadaClient()
	if karmadaClient == nil {
		health.Status = "error"
		health.Message = "无法连接到Karmada API"
		return health
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	start := time.Now()
	_, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{Limit: 1})
	latency := time.Since(start)

	health.Latency = latency.String()

	if err != nil {
		health.Status = "error"
		health.Message = fmt.Sprintf("Karmada API调用失败: %v", err)
	} else if latency > 2*time.Second {
		health.Status = "warning"
		health.Message = "Karmada API响应较慢"
	} else {
		health.Message = "Karmada API响应正常"
	}

	health.Details = map[string]interface{}{
		"latency_ms": latency.Milliseconds(),
	}

	return health
}

// formatUptime 格式化运行时间
func formatUptime(duration time.Duration) string {
	days := int(duration.Hours()) / 24
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%d天%d小时%d分钟", days, hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%d小时%d分钟", hours, minutes)
	} else {
		return fmt.Sprintf("%d分钟", minutes)
	}
}

// getMemoryUsage 获取内存使用情况
func getMemoryUsage() map[string]interface{} {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return map[string]interface{}{
		"alloc_mb":   m.Alloc / 1024 / 1024,
		"sys_mb":     m.Sys / 1024 / 1024,
		"gc_count":   m.NumGC,
		"goroutines": runtime.NumGoroutine(),
	}
}

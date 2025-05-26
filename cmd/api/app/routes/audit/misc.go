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

package audit

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
)

// 简单的内存存储实现
var (
	auditLogs   = []v1.AuditLog{}
	auditMutex  = sync.RWMutex{}
	initialized = false
)

// GetAuditLogs 获取审计日志
func GetAuditLogs(query *v1.AuditQuery) (*v1.AuditLogsResponse, error) {
	klog.V(4).InfoS("Getting audit logs", "query", query)

	// 初始化模拟数据
	if !initialized {
		initMockAuditLogs()
		initialized = true
	}

	auditMutex.RLock()
	defer auditMutex.RUnlock()

	// 过滤日志
	filteredLogs := filterAuditLogs(auditLogs, query)

	// 分页
	total := int64(len(filteredLogs))
	startIndex := (query.Page - 1) * query.Limit
	endIndex := startIndex + query.Limit

	if startIndex >= int32(len(filteredLogs)) {
		filteredLogs = []v1.AuditLog{}
	} else {
		if endIndex > int32(len(filteredLogs)) {
			endIndex = int32(len(filteredLogs))
		}
		filteredLogs = filteredLogs[startIndex:endIndex]
	}

	return &v1.AuditLogsResponse{
		Logs:  filteredLogs,
		Total: total,
		Page:  query.Page,
		Limit: query.Limit,
	}, nil
}

// filterAuditLogs 过滤审计日志
func filterAuditLogs(logs []v1.AuditLog, query *v1.AuditQuery) []v1.AuditLog {
	var filtered []v1.AuditLog

	for _, log := range logs {
		// 时间范围过滤
		if log.Timestamp.Before(query.StartTime) || log.Timestamp.After(query.EndTime) {
			continue
		}

		// 用户过滤
		if query.User != "" && !strings.Contains(strings.ToLower(log.User), strings.ToLower(query.User)) {
			continue
		}

		// 操作过滤
		if query.Action != "" && !strings.EqualFold(log.Action, query.Action) {
			continue
		}

		// 资源过滤
		if query.Resource != "" && !strings.Contains(strings.ToLower(log.Resource), strings.ToLower(query.Resource)) {
			continue
		}

		filtered = append(filtered, log)
	}

	return filtered
}

// initMockAuditLogs 初始化模拟审计日志数据
func initMockAuditLogs() {
	now := time.Now()

	mockLogs := []v1.AuditLog{
		{
			ID:           "audit-001",
			Timestamp:    now.Add(-1 * time.Hour),
			User:         "admin",
			Action:       "create",
			Resource:     "deployment",
			ResourceName: "nginx-deployment",
			Namespace:    "default",
			Cluster:      "cluster-beijing",
			Result:       "success",
			Details: map[string]interface{}{
				"replicas": 3,
				"image":    "nginx:1.20",
			},
			ClientIP:  "192.168.1.100",
			UserAgent: "kubectl/v1.24.0",
		},
		{
			ID:           "audit-002",
			Timestamp:    now.Add(-2 * time.Hour),
			User:         "developer",
			Action:       "update",
			Resource:     "propagationpolicy",
			ResourceName: "nginx-policy",
			Namespace:    "default",
			Result:       "success",
			Details: map[string]interface{}{
				"clusters":    []string{"cluster-beijing", "cluster-shanghai"},
				"replicaType": "Divided",
			},
			ClientIP:  "192.168.1.101",
			UserAgent: "dashboard/v1.0.0",
		},
		{
			ID:           "audit-003",
			Timestamp:    now.Add(-3 * time.Hour),
			User:         "admin",
			Action:       "delete",
			Resource:     "service",
			ResourceName: "old-service",
			Namespace:    "kube-system",
			Cluster:      "cluster-shanghai",
			Result:       "success",
			Details: map[string]interface{}{
				"type": "ClusterIP",
			},
			ClientIP:  "192.168.1.100",
			UserAgent: "kubectl/v1.24.0",
		},
		{
			ID:           "audit-004",
			Timestamp:    now.Add(-4 * time.Hour),
			User:         "operator",
			Action:       "create",
			Resource:     "overridepolicy",
			ResourceName: "image-override",
			Namespace:    "production",
			Result:       "failure",
			Details: map[string]interface{}{
				"reason": "validation failed",
				"error":  "invalid image tag",
			},
			ClientIP:  "192.168.1.102",
			UserAgent: "dashboard/v1.0.0",
		},
		{
			ID:           "audit-005",
			Timestamp:    now.Add(-5 * time.Hour),
			User:         "admin",
			Action:       "get",
			Resource:     "cluster",
			ResourceName: "cluster-beijing",
			Result:       "success",
			Details: map[string]interface{}{
				"status": "Ready",
			},
			ClientIP:  "192.168.1.100",
			UserAgent: "dashboard/v1.0.0",
		},
		{
			ID:           "audit-006",
			Timestamp:    now.Add(-6 * time.Hour),
			User:         "developer",
			Action:       "create",
			Resource:     "configmap",
			ResourceName: "app-config",
			Namespace:    "development",
			Cluster:      "cluster-shenzhen",
			Result:       "success",
			Details: map[string]interface{}{
				"keys": []string{"database.url", "redis.host"},
			},
			ClientIP:  "192.168.1.103",
			UserAgent: "kubectl/v1.23.0",
		},
		{
			ID:           "audit-007",
			Timestamp:    now.Add(-12 * time.Hour),
			User:         "admin",
			Action:       "update",
			Resource:     "deployment",
			ResourceName: "api-server",
			Namespace:    "kube-system",
			Cluster:      "cluster-beijing",
			Result:       "success",
			Details: map[string]interface{}{
				"oldImage": "api-server:v1.0.0",
				"newImage": "api-server:v1.1.0",
				"reason":   "security update",
			},
			ClientIP:  "192.168.1.100",
			UserAgent: "kubectl/v1.24.0",
		},
		{
			ID:           "audit-008",
			Timestamp:    now.Add(-18 * time.Hour),
			User:         "operator",
			Action:       "delete",
			Resource:     "propagationpolicy",
			ResourceName: "deprecated-policy",
			Namespace:    "legacy",
			Result:       "success",
			Details: map[string]interface{}{
				"reason": "policy cleanup",
			},
			ClientIP:  "192.168.1.102",
			UserAgent: "dashboard/v1.0.0",
		},
		{
			ID:           "audit-009",
			Timestamp:    now.Add(-24 * time.Hour),
			User:         "admin",
			Action:       "create",
			Resource:     "cluster",
			ResourceName: "cluster-guangzhou",
			Result:       "success",
			Details: map[string]interface{}{
				"region":     "south-china",
				"kubeconfig": "provided",
			},
			ClientIP:  "192.168.1.100",
			UserAgent: "karmadactl/v1.5.0",
		},
		{
			ID:           "audit-010",
			Timestamp:    now.Add(-30 * time.Hour),
			User:         "security-admin",
			Action:       "update",
			Resource:     "rbac",
			ResourceName: "cluster-admin-binding",
			Result:       "success",
			Details: map[string]interface{}{
				"subjects": []string{"admin", "operator"},
				"role":     "cluster-admin",
			},
			ClientIP:  "192.168.1.200",
			UserAgent: "kubectl/v1.24.0",
		},
	}

	auditMutex.Lock()
	auditLogs = mockLogs
	auditMutex.Unlock()

	klog.V(4).InfoS("Initialized mock audit logs", "count", len(mockLogs))
}

// AddAuditLog 添加审计日志（用于实际的操作审计）
func AddAuditLog(userID, action, resource, resourceName, namespace, cluster, result string, details map[string]interface{}, clientIP, userAgent string) {
	auditMutex.Lock()
	defer auditMutex.Unlock()

	log := v1.AuditLog{
		ID:           fmt.Sprintf("audit-%d", time.Now().UnixNano()),
		Timestamp:    time.Now(),
		User:         userID,
		Action:       action,
		Resource:     resource,
		ResourceName: resourceName,
		Namespace:    namespace,
		Cluster:      cluster,
		Result:       result,
		Details:      details,
		ClientIP:     clientIP,
		UserAgent:    userAgent,
	}

	auditLogs = append([]v1.AuditLog{log}, auditLogs...) // 新日志添加到开头

	// 保留最近1000条日志
	if len(auditLogs) > 1000 {
		auditLogs = auditLogs[:1000]
	}
}

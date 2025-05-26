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

package events

import (
	"context"
	"fmt"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

// GetRecentEvents 获取最近事件
func GetRecentEvents(limit int, severity, source string) (*v1.EventsResponse, error) {
	klog.V(4).InfoS("Getting recent events", "limit", limit, "severity", severity, "source", source)

	clientset := client.InClusterClient()
	events, err := clientset.CoreV1().Events("").List(context.TODO(), metav1.ListOptions{
		Limit: int64(limit),
	})
	if err != nil {
		return nil, fmt.Errorf("获取事件失败: %v", err)
	}

	var eventInfos []v1.EventInfo

	for _, event := range events.Items {
		// 应用过滤条件
		if severity != "" && !matchesSeverity(event, severity) {
			continue
		}
		if source != "" && !matchesSource(event, source) {
			continue
		}

		eventInfo := v1.EventInfo{
			ID:        string(event.UID),
			Timestamp: event.LastTimestamp.Time,
			Type:      event.Type,
			Source:    event.Source.Component,
			Message:   event.Message,
			Severity:  determineSeverity(event),
			Category:  determineCategory(event),
			Details:   buildEventDetails(event),
		}

		eventInfos = append(eventInfos, eventInfo)
	}

	return &v1.EventsResponse{
		Events: eventInfos,
		Total:  int64(len(eventInfos)),
	}, nil
}

// GetAlertRules 获取告警规则
func GetAlertRules() (*v1.AlertRulesResponse, error) {
	klog.V(4).InfoS("Getting alert rules")

	// 模拟告警规则配置
	rules := []v1.AlertRule{
		{
			ID:        "rule-001",
			Name:      "CPU使用率告警",
			Condition: "cpu_usage > 80",
			Severity:  "warning",
			Enabled:   true,
			Actions: []v1.AlertAction{
				{
					Type: "email",
					Config: map[string]interface{}{
						"to": "admin@example.com",
					},
				},
			},
		},
		{
			ID:        "rule-002",
			Name:      "内存使用率告警",
			Condition: "memory_usage > 85",
			Severity:  "warning",
			Enabled:   true,
		},
		{
			ID:        "rule-003",
			Name:      "集群节点离线告警",
			Condition: "node_status == 'NotReady'",
			Severity:  "error",
			Enabled:   true,
		},
	}

	return &v1.AlertRulesResponse{
		Rules: rules,
	}, nil
}

// matchesSeverity 检查事件是否匹配严重程度
func matchesSeverity(event corev1.Event, severity string) bool {
	eventSeverity := determineSeverity(event)
	return strings.EqualFold(eventSeverity, severity)
}

// matchesSource 检查事件是否匹配来源
func matchesSource(event corev1.Event, source string) bool {
	return strings.Contains(strings.ToLower(event.Source.Component), strings.ToLower(source))
}

// determineSeverity 确定事件严重程度
func determineSeverity(event corev1.Event) string {
	switch event.Type {
	case "Warning":
		if strings.Contains(strings.ToLower(event.Reason), "failed") ||
			strings.Contains(strings.ToLower(event.Reason), "error") {
			return "high"
		}
		return "medium"
	case "Normal":
		return "low"
	default:
		return "medium"
	}
}

// determineCategory 确定事件分类
func determineCategory(event corev1.Event) string {
	reason := strings.ToLower(event.Reason)

	if strings.Contains(reason, "schedule") || strings.Contains(reason, "pull") {
		return "resource"
	}
	if strings.Contains(reason, "network") || strings.Contains(reason, "dns") {
		return "network"
	}
	if strings.Contains(reason, "volume") || strings.Contains(reason, "mount") {
		return "storage"
	}

	return "system"
}

// buildEventDetails 构建事件详情
func buildEventDetails(event corev1.Event) map[string]interface{} {
	details := make(map[string]interface{})

	if event.InvolvedObject.Name != "" {
		details["objectName"] = event.InvolvedObject.Name
	}
	if event.InvolvedObject.Namespace != "" {
		details["objectNamespace"] = event.InvolvedObject.Namespace
	}
	if event.InvolvedObject.Kind != "" {
		details["objectKind"] = event.InvolvedObject.Kind
	}
	if event.Reason != "" {
		details["reason"] = event.Reason
	}
	if event.Count > 0 {
		details["count"] = event.Count
	}

	return details
}

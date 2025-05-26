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

// EventInfo 事件信息
type EventInfo struct {
	ID        string                 `json:"id"`
	Timestamp time.Time              `json:"timestamp"`
	Type      string                 `json:"type"`   // Info, Warning, Error
	Source    string                 `json:"source"` // 事件源
	Message   string                 `json:"message"`
	Severity  string                 `json:"severity"` // low, medium, high, critical
	Category  string                 `json:"category"` // resource, network, storage, etc.
	Details   map[string]interface{} `json:"details,omitempty"`
}

// EventsResponse 事件列表响应
type EventsResponse struct {
	Events []EventInfo `json:"events"`
	Total  int64       `json:"total"`
}

// AlertRule 告警规则
type AlertRule struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Condition string        `json:"condition"`
	Severity  string        `json:"severity"`
	Enabled   bool          `json:"enabled"`
	Actions   []AlertAction `json:"actions,omitempty"`
}

// AlertAction 告警动作
type AlertAction struct {
	Type   string                 `json:"type"` // email, webhook, slack
	Config map[string]interface{} `json:"config"`
}

// AlertRulesResponse 告警规则列表响应
type AlertRulesResponse struct {
	Rules []AlertRule `json:"rules"`
}

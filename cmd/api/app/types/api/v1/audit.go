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

// AuditLog 审计日志
type AuditLog struct {
	ID           string                 `json:"id"`
	Timestamp    time.Time              `json:"timestamp"`
	User         string                 `json:"user"`
	Action       string                 `json:"action"`   // create, update, delete, get
	Resource     string                 `json:"resource"` // deployment, service, policy
	ResourceName string                 `json:"resourceName"`
	Namespace    string                 `json:"namespace,omitempty"`
	Cluster      string                 `json:"cluster,omitempty"`
	Result       string                 `json:"result"` // success, failure
	Details      map[string]interface{} `json:"details,omitempty"`
	ClientIP     string                 `json:"clientIP,omitempty"`
	UserAgent    string                 `json:"userAgent,omitempty"`
}

// AuditLogsResponse 审计日志列表响应
type AuditLogsResponse struct {
	Logs  []AuditLog `json:"logs"`
	Total int64      `json:"total"`
	Page  int32      `json:"page"`
	Limit int32      `json:"limit"`
}

// AuditQuery 审计日志查询条件
type AuditQuery struct {
	User      string    `form:"user"`
	Action    string    `form:"action"`
	Resource  string    `form:"resource"`
	StartTime time.Time `form:"startTime"`
	EndTime   time.Time `form:"endTime"`
	Page      int32     `form:"page"`
	Limit     int32     `form:"limit"`
}

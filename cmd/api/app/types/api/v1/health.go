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

// SystemHealth 系统健康状态
type SystemHealth struct {
	Status    string    `json:"status"` // healthy, degraded, unhealthy
	Timestamp time.Time `json:"timestamp"`
	Uptime    string    `json:"uptime"`
	Version   string    `json:"version"`
}

// DetailedSystemHealth 详细系统健康状态
type DetailedSystemHealth struct {
	Overall      string             `json:"overall"`
	Components   []ComponentHealth  `json:"components"`
	Dependencies []DependencyHealth `json:"dependencies"`
}

// ComponentHealth 组件健康信息
type ComponentHealth struct {
	Name      string                 `json:"name"`
	Status    string                 `json:"status"` // healthy, warning, error
	Message   string                 `json:"message"`
	LastCheck time.Time              `json:"lastCheck"`
	Metrics   map[string]interface{} `json:"metrics,omitempty"`
}

// DependencyHealth 依赖项健康状态
type DependencyHealth struct {
	Name    string                 `json:"name"`
	Status  string                 `json:"status"`
	Latency string                 `json:"latency,omitempty"`
	Message string                 `json:"message,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

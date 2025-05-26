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

// UserPreferences 用户偏好设置
type UserPreferences struct {
	UserID          string                `json:"userId"`
	Theme           string                `json:"theme"`           // light, dark, auto
	Language        string                `json:"language"`        // zh-CN, en-US, etc.
	Timezone        string                `json:"timezone"`        // Asia/Shanghai, UTC, etc.
	DefaultCluster  string                `json:"defaultCluster,omitempty"`
	DashboardLayout DashboardLayoutConfig `json:"dashboardLayout"`
	Notifications   NotificationConfig    `json:"notifications"`
	CreatedAt       time.Time             `json:"createdAt"`
	UpdatedAt       time.Time             `json:"updatedAt"`
}

// DashboardLayoutConfig 仪表盘布局配置
type DashboardLayoutConfig struct {
	Overview        []string `json:"overview"`        // 概览页组件顺序
	RefreshInterval int32    `json:"refreshInterval"` // 自动刷新间隔（秒）
	PageSize        int32    `json:"pageSize"`        // 默认分页大小
}

// NotificationConfig 通知配置
type NotificationConfig struct {
	Email   bool `json:"email"`
	Browser bool `json:"browser"`
	Sound   bool `json:"sound"`
}

// UserPreferencesUpdateRequest 用户偏好设置更新请求
type UserPreferencesUpdateRequest struct {
	Theme           string                `json:"theme,omitempty"`
	Language        string                `json:"language,omitempty"`
	Timezone        string                `json:"timezone,omitempty"`
	DefaultCluster  string                `json:"defaultCluster,omitempty"`
	DashboardLayout *DashboardLayoutConfig `json:"dashboardLayout,omitempty"`
	Notifications   *NotificationConfig    `json:"notifications,omitempty"`
} 
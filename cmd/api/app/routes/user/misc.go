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

package user

import (
	"fmt"
	"sync"
	"time"

	"k8s.io/klog/v2"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
)

// 简单的内存存储实现
var (
	userPreferencesStore = make(map[string]*v1.UserPreferences)
	storeMutex           = sync.RWMutex{}
)

// GetUserPreferences 获取用户偏好设置
func GetUserPreferences(userID string) (*v1.UserPreferences, error) {
	klog.V(4).InfoS("Getting user preferences", "userID", userID)

	storeMutex.RLock()
	defer storeMutex.RUnlock()

	// 如果用户偏好不存在，返回默认设置
	if preferences, exists := userPreferencesStore[userID]; exists {
		return preferences, nil
	}

	// 返回默认偏好设置
	defaultPreferences := &v1.UserPreferences{
		UserID:   userID,
		Theme:    "light",
		Language: "zh-CN",
		Timezone: "Asia/Shanghai",
		DashboardLayout: v1.DashboardLayoutConfig{
			Overview:        []string{"cluster-overview", "resource-overview", "event-overview"},
			RefreshInterval: 30,
			PageSize:        20,
		},
		Notifications: v1.NotificationConfig{
			Email:   true,
			Browser: true,
			Sound:   false,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// 保存默认设置
	userPreferencesStore[userID] = defaultPreferences

	return defaultPreferences, nil
}

// UpdateUserPreferences 更新用户偏好设置
func UpdateUserPreferences(userID string, req *v1.UserPreferencesUpdateRequest) (*v1.UserPreferences, error) {
	klog.V(4).InfoS("Updating user preferences", "userID", userID)

	storeMutex.Lock()
	defer storeMutex.Unlock()

	// 获取现有偏好设置，如果不存在则获取默认设置
	var preferences *v1.UserPreferences
	if existing, exists := userPreferencesStore[userID]; exists {
		preferences = existing
	} else {
		preferences = &v1.UserPreferences{
			UserID:   userID,
			Theme:    "light",
			Language: "zh-CN",
			Timezone: "Asia/Shanghai",
			DashboardLayout: v1.DashboardLayoutConfig{
				Overview:        []string{"cluster-overview", "resource-overview", "event-overview"},
				RefreshInterval: 30,
				PageSize:        20,
			},
			Notifications: v1.NotificationConfig{
				Email:   true,
				Browser: true,
				Sound:   false,
			},
			CreatedAt: time.Now(),
		}
	}

	// 更新字段
	if req.Theme != "" {
		if !isValidTheme(req.Theme) {
			return nil, fmt.Errorf("无效的主题设置: %s", req.Theme)
		}
		preferences.Theme = req.Theme
	}

	if req.Language != "" {
		if !isValidLanguage(req.Language) {
			return nil, fmt.Errorf("无效的语言设置: %s", req.Language)
		}
		preferences.Language = req.Language
	}

	if req.Timezone != "" {
		if !isValidTimezone(req.Timezone) {
			return nil, fmt.Errorf("无效的时区设置: %s", req.Timezone)
		}
		preferences.Timezone = req.Timezone
	}

	if req.DefaultCluster != "" {
		preferences.DefaultCluster = req.DefaultCluster
	}

	if req.DashboardLayout != nil {
		if req.DashboardLayout.Overview != nil {
			preferences.DashboardLayout.Overview = req.DashboardLayout.Overview
		}
		if req.DashboardLayout.RefreshInterval > 0 {
			if req.DashboardLayout.RefreshInterval < 5 || req.DashboardLayout.RefreshInterval > 300 {
				return nil, fmt.Errorf("刷新间隔必须在5-300秒之间")
			}
			preferences.DashboardLayout.RefreshInterval = req.DashboardLayout.RefreshInterval
		}
		if req.DashboardLayout.PageSize > 0 {
			if req.DashboardLayout.PageSize < 10 || req.DashboardLayout.PageSize > 100 {
				return nil, fmt.Errorf("分页大小必须在10-100之间")
			}
			preferences.DashboardLayout.PageSize = req.DashboardLayout.PageSize
		}
	}

	if req.Notifications != nil {
		preferences.Notifications.Email = req.Notifications.Email
		preferences.Notifications.Browser = req.Notifications.Browser
		preferences.Notifications.Sound = req.Notifications.Sound
	}

	preferences.UpdatedAt = time.Now()
	userPreferencesStore[userID] = preferences

	return preferences, nil
}

// 验证函数
func isValidTheme(theme string) bool {
	validThemes := []string{"light", "dark", "auto"}
	for _, valid := range validThemes {
		if theme == valid {
			return true
		}
	}
	return false
}

func isValidLanguage(language string) bool {
	validLanguages := []string{"zh-CN", "en-US", "ja-JP", "ko-KR"}
	for _, valid := range validLanguages {
		if language == valid {
			return true
		}
	}
	return false
}

func isValidTimezone(timezone string) bool {
	validTimezones := []string{
		"Asia/Shanghai", "Asia/Beijing", "UTC",
		"America/New_York", "Europe/London", "Asia/Tokyo",
	}
	for _, valid := range validTimezones {
		if timezone == valid {
			return true
		}
	}
	return false
}

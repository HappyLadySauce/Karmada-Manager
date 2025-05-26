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

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handleGetUserPreferences 获取用户偏好设置
func handleGetUserPreferences(c *gin.Context) {
	userID := c.GetString("userID") // 从JWT token中获取
	if userID == "" {
		userID = "default-user" // 默认用户ID
	}

	result, err := GetUserPreferences(userID)
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

// handleUpdateUserPreferences 更新用户偏好设置
func handleUpdateUserPreferences(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		userID = "default-user"
	}

	var req v1.UserPreferencesUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}

	result, err := UpdateUserPreferences(userID, &req)
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

func init() {
	r := router.V1()

	// 用户偏好设置相关接口
	user := r.Group("/user")
	{
		user.GET("/preferences", handleGetUserPreferences)
		user.PUT("/preferences", handleUpdateUserPreferences)
	}
}

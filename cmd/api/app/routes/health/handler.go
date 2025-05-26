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
	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handleGetHealth 获取基础健康状态
func handleGetHealth(c *gin.Context) {
	result, err := GetSystemHealth()
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

// handleGetDetailedHealth 获取详细健康状态
func handleGetDetailedHealth(c *gin.Context) {
	result, err := GetDetailedSystemHealth()
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

func init() {
	r := router.V1()

	// 健康检查相关接口
	health := r.Group("/health")
	{
		health.GET("", handleGetHealth)
		health.GET("/detailed", handleGetDetailedHealth)
	}
}

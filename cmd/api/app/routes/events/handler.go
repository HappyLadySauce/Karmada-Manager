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
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handleGetRecentEvents 获取最近事件
func handleGetRecentEvents(c *gin.Context) {
	limitStr := c.Query("limit")
	severity := c.Query("severity")
	source := c.Query("source")

	limit := 50 // 默认50个事件
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}

	result, err := GetRecentEvents(limit, severity, source)
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

// handleGetAlertRules 获取告警规则
func handleGetAlertRules(c *gin.Context) {
	result, err := GetAlertRules()
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

func init() {
	r := router.V1()

	// 事件相关接口
	events := r.Group("/events")
	{
		events.GET("/recent", handleGetRecentEvents)
	}

	// 告警相关接口
	alerts := r.Group("/alerts")
	{
		alerts.GET("/rules", handleGetAlertRules)
	}
}

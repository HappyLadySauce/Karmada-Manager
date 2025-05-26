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
	"time"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handleGetAuditLogs 获取审计日志
func handleGetAuditLogs(c *gin.Context) {
	var query v1.AuditQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		common.Fail(c, err)
		return
	}
	
	// 设置默认值
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.Limit <= 0 {
		query.Limit = 50
	}
	if query.Limit > 200 {
		query.Limit = 200 // 限制最大页数
	}
	
	// 时间范围处理
	if query.EndTime.IsZero() {
		query.EndTime = time.Now()
	}
	if query.StartTime.IsZero() {
		query.StartTime = query.EndTime.Add(-24 * time.Hour) // 默认最近24小时
	}
	
	result, err := GetAuditLogs(&query)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

func init() {
	r := router.V1()
	
	// 审计日志相关接口
	audit := r.Group("/audit")
	{
		audit.GET("/logs", handleGetAuditLogs)
	}
} 
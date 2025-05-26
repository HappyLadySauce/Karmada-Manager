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

package scheduling

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handleGetClustersResources 获取集群资源视图
func handleGetClustersResources(c *gin.Context) {
	dataSelect := common.ParseDataSelectPathParameter(c)
	
	result, err := GetClustersResourcesView(dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handleSchedulingSimulate 调度策略模拟
func handleSchedulingSimulate(c *gin.Context) {
	var req v1.SchedulingSimulateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := SimulateScheduling(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handleGetResourceSchedulingTree 获取资源调度关系树形图
func handleGetResourceSchedulingTree(c *gin.Context) {
	var req v1.ResourceSchedulingTreeRequest
	
	// 获取查询参数
	req.ResourceType = c.Query("resourceType")
	req.Namespace = c.Query("namespace")
	req.ResourceName = c.Query("resourceName")
	
	result, err := GetResourceSchedulingTree(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

func init() {
	r := router.V1()
	
	// 可视化调度相关接口
	scheduling := r.Group("/scheduling")
	{
		scheduling.GET("/clusters/resources", handleGetClustersResources)
		scheduling.POST("/simulate", handleSchedulingSimulate)
		scheduling.GET("/tree", handleGetResourceSchedulingTree)
	}
} 
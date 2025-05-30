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

package cronjob

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/cronjob"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handleGetCronJobs(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := cronjob.GetCronJobList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetCronJobDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("cronjob")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := cronjob.GetCronJobDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetCronJobEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("cronjob")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

// handlerCreateCronJobByForm 通过表单创建CronJob
func handlerCreateCronJobByForm(c *gin.Context) {
	var req v1.CronJobFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := CreateCronJobByForm(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerUpdateCronJob 更新CronJob
func handlerUpdateCronJob(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("cronjob")
	
	var req v1.UpdateCronJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	req.Namespace = namespace
	req.Name = name
	
	result, err := UpdateCronJob(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerDeleteCronJob 删除CronJob
func handlerDeleteCronJob(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("cronjob")
	
	err := DeleteCronJob(namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, gin.H{"message": "删除成功"})
}

func init() {
	r := router.V1()
	r.GET("/cronjob", handleGetCronJobs)
	r.GET("/cronjob/:namespace", handleGetCronJobs)
	r.GET("/cronjob/:namespace/:cronjob", handleGetCronJobDetail)
	r.GET("/cronjob/:namespace/:cronjob/event", handleGetCronJobEvents)
	r.POST("/cronjob/form", handlerCreateCronJobByForm)
	r.PUT("/cronjob/:namespace/:cronjob", handlerUpdateCronJob)
	r.DELETE("/cronjob/:namespace/:cronjob", handlerDeleteCronJob)
}

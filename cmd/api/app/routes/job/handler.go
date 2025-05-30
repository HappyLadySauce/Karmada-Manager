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

package job

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	"github.com/karmada-io/dashboard/pkg/resource/job"
)

func handleGetJobs(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := job.GetJobList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetJobDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("job")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := job.GetJobDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetJobEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("job")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

// handlerCreateJobByForm 通过表单创建Job
func handlerCreateJobByForm(c *gin.Context) {
	var req v1.JobFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := CreateJobByForm(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerUpdateJob 更新Job
func handlerUpdateJob(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("job")
	
	var req v1.UpdateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	req.Namespace = namespace
	req.Name = name
	
	result, err := UpdateJob(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerDeleteJob 删除Job
func handlerDeleteJob(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("job")
	
	err := DeleteJob(namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, gin.H{"message": "删除成功"})
}

func init() {
	r := router.V1()
	r.GET("/job", handleGetJobs)
	r.GET("/job/:namespace", handleGetJobs)
	r.GET("/job/:namespace/:job", handleGetJobDetail)
	r.GET("/job/:namespace/:job/event", handleGetJobEvents)
	r.POST("/job/form", handlerCreateJobByForm)
	r.PUT("/job/:namespace/:job", handlerUpdateJob)
	r.DELETE("/job/:namespace/:job", handlerDeleteJob)
}

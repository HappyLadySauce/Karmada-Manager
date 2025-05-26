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

package daemonset

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/daemonset"
	"github.com/karmada-io/dashboard/pkg/resource/event"
)

func handleGetDaemonsets(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := daemonset.GetDaemonSetList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDaemonsetDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("daemonset")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := daemonset.GetDaemonSetDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetDaemonsetEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("daemonset")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

// handlerCreateDaemonSetByForm 通过表单创建DaemonSet
func handlerCreateDaemonSetByForm(c *gin.Context) {
	var req v1.DaemonSetFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := CreateDaemonSetByForm(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerUpdateDaemonSet 更新DaemonSet
func handlerUpdateDaemonSet(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("daemonset")
	
	var req v1.UpdateDaemonSetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	req.Namespace = namespace
	req.Name = name
	
	result, err := UpdateDaemonSet(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerDeleteDaemonSet 删除DaemonSet
func handlerDeleteDaemonSet(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("daemonset")
	
	err := DeleteDaemonSet(namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, gin.H{"message": "删除成功"})
}

func init() {
	r := router.V1()
	r.GET("/daemonset", handleGetDaemonsets)
	r.GET("/daemonset/:namespace", handleGetDaemonsets)
	r.GET("/daemonset/:namespace/:daemonset", handleGetDaemonsetDetail)
	r.GET("/daemonset/:namespace/:daemonset/event", handleGetDaemonsetEvents)
	r.POST("/daemonset/form", handlerCreateDaemonSetByForm)
	r.PUT("/daemonset/:namespace/:daemonset", handlerUpdateDaemonSet)
	r.DELETE("/daemonset/:namespace/:daemonset", handlerDeleteDaemonSet)
}

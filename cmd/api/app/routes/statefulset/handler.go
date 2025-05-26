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

package statefulset

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	"github.com/karmada-io/dashboard/pkg/resource/statefulset"
)

func handleGetStatefulsets(c *gin.Context) {
	namespace := common.ParseNamespacePathParameter(c)
	dataSelect := common.ParseDataSelectPathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := statefulset.GetStatefulSetList(k8sClient, namespace, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetStatefulsetDetail(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	result, err := statefulset.GetStatefulSetDetail(k8sClient, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handleGetStatefulsetEvents(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	dataSelect := common.ParseDataSelectPathParameter(c)
	result, err := event.GetResourceEvents(k8sClient, dataSelect, namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

// handlerCreateStatefulSetByForm 通过表单创建StatefulSet
func handlerCreateStatefulSetByForm(c *gin.Context) {
	var req v1.StatefulSetFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := CreateStatefulSetByForm(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerUpdateStatefulSet 更新StatefulSet
func handlerUpdateStatefulSet(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	
	var req v1.UpdateStatefulSetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	req.Namespace = namespace
	req.Name = name
	
	result, err := UpdateStatefulSet(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerScaleStatefulSet 扩缩容StatefulSet
func handlerScaleStatefulSet(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	
	var req v1.ScaleStatefulSetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := ScaleStatefulSet(namespace, name, req.Replicas)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerDeleteStatefulSet 删除StatefulSet
func handlerDeleteStatefulSet(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("statefulset")
	
	err := DeleteStatefulSet(namespace, name)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, gin.H{"message": "删除成功"})
}

func init() {
	r := router.V1()
	r.GET("/statefulset", handleGetStatefulsets)
	r.GET("/statefulset/:namespace", handleGetStatefulsets)
	r.GET("/statefulset/:namespace/:statefulset", handleGetStatefulsetDetail)
	r.GET("/statefulset/:namespace/:statefulset/event", handleGetStatefulsetEvents)
	r.POST("/statefulset/form", handlerCreateStatefulSetByForm)
	r.PUT("/statefulset/:namespace/:statefulset", handlerUpdateStatefulSet)
	r.PUT("/statefulset/:namespace/:statefulset/scale", handlerScaleStatefulSet)
	r.DELETE("/statefulset/:namespace/:statefulset", handlerDeleteStatefulSet)
}

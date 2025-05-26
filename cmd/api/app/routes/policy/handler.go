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

package policy

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handlerCreatePolicyByForm 通过表单创建策略
func handlerCreatePolicyByForm(c *gin.Context) {
	var req v1.PolicyFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := CreatePolicyByForm(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerGeneratePolicyTemplate 生成策略模板
func handlerGeneratePolicyTemplate(c *gin.Context) {
	var req v1.PolicyTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := GeneratePolicyTemplate(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerValidatePolicy 验证策略
func handlerValidatePolicy(c *gin.Context) {
	var req v1.PolicyValidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := ValidatePolicy(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerGetPolicyStatus 获取策略状态
func handlerGetPolicyStatus(c *gin.Context) {
	name := c.Param("name")
	namespace := c.Query("namespace")
	policyType := c.Query("type")
	
	result, err := GetPolicyStatus(name, namespace, policyType)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerBatchPolicyOperation 批量策略操作
func handlerBatchPolicyOperation(c *gin.Context) {
	var req v1.BatchPolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}
	
	result, err := BatchPolicyOperation(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

// handlerGetPolicyList 获取策略列表（增强版）
func handlerGetPolicyList(c *gin.Context) {
	namespace := c.Query("namespace")
	policyType := c.Query("type") // propagation, override, all
	dataSelect := common.ParseDataSelectPathParameter(c)
	
	result, err := GetEnhancedPolicyList(namespace, policyType, dataSelect)
	if err != nil {
		common.Fail(c, err)
		return
	}
	
	common.Success(c, result)
}

func init() {
	r := router.V1()
	
	// 策略管理增强接口
	policy := r.Group("/policy")
	{
		policy.GET("/list", handlerGetPolicyList)
		policy.GET("/:name/status", handlerGetPolicyStatus)
		policy.POST("/form", handlerCreatePolicyByForm)
		policy.POST("/template", handlerGeneratePolicyTemplate)
		policy.POST("/validate", handlerValidatePolicy)
		policy.POST("/batch", handlerBatchPolicyOperation)
	}
} 
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

package templates

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
)

// handleGetPolicyTemplates 获取策略模板列表
func handleGetPolicyTemplates(c *gin.Context) {
	category := c.Query("category")
	policyType := c.Query("type")

	result, err := GetPolicyTemplates(category, policyType)
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

// handleValidateYAML 验证策略YAML
func handleValidateYAML(c *gin.Context) {
	var req v1.PolicyValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, fmt.Errorf("请求参数格式错误: %v", err))
		return
	}

	result, err := ValidatePolicyYAML(&req)
	if err != nil {
		common.Fail(c, err)
		return
	}

	common.Success(c, result)
}

func init() {
	r := router.V1()

	// 策略模板相关接口
	policy := r.Group("/policy")
	{
		policy.GET("/templates", handleGetPolicyTemplates)
		policy.POST("/validate-yaml", handleValidateYAML)
	}
}

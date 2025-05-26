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

package v1

import "time"

// PolicyTemplate 策略模板
type PolicyTemplate struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    string             `json:"category"` // workload, service, config
	Type        string             `json:"type"`     // propagation, override
	Template    string             `json:"template"` // YAML模板内容
	Variables   []TemplateVariable `json:"variables"`
	Tags        []string           `json:"tags,omitempty"`
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
}

// TemplateVariable 模板变量
type TemplateVariable struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"` // string, number, boolean, array, object
	Description string      `json:"description"`
	Required    bool        `json:"required"`
	Default     interface{} `json:"default,omitempty"`
	Options     []string    `json:"options,omitempty"` // 枚举选项
}

// PolicyTemplatesResponse 策略模板列表响应
type PolicyTemplatesResponse struct {
	Templates []PolicyTemplate `json:"templates"`
}

// PolicyValidationRequest YAML验证请求
type PolicyValidationRequest struct {
	YAML string `json:"yaml" binding:"required"`
	Type string `json:"type" binding:"required"` // propagation, override
}

// PolicyValidationResult YAML验证结果
type PolicyValidationResult struct {
	Valid       bool     `json:"valid"`
	Errors      []string `json:"errors"`
	Warnings    []string `json:"warnings"`
	Suggestions []string `json:"suggestions"`
}

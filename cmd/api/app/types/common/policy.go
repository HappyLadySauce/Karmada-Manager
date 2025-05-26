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

package common

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	
	"github.com/karmada-io/dashboard/pkg/dataselect"
)

// TypeMeta is a subset of the k8s.io/apimachinery/pkg/apis/meta/v1.TypeMeta
type TypeMeta struct {
	Kind       string `json:"kind,omitempty"`
	APIVersion string `json:"apiVersion,omitempty"`
}

// ObjectMeta is a subset of the k8s.io/apimachinery/pkg/apis/meta/v1.ObjectMeta
type ObjectMeta struct {
	Name              string            `json:"name,omitempty"`
	Namespace         string            `json:"namespace,omitempty"`
	Labels            map[string]string `json:"labels,omitempty"`
	Annotations       map[string]string `json:"annotations,omitempty"`
	CreationTimestamp metav1.Time       `json:"creationTimestamp,omitempty"`
}

// Policy represents a policy resource
type Policy struct {
	ObjectMeta ObjectMeta `json:"objectMeta"`
	TypeMeta   TypeMeta   `json:"typeMeta"`
}

// PolicyList represents a list of policies
type PolicyList struct {
	ListMeta ListMeta `json:"listMeta"`
	Policies []Policy `json:"policies"`
}

// ListMeta holds pagination information
type ListMeta struct {
	TotalItems int `json:"totalItems"`
}

// PolicyCell implements DataCell interface for policy data
type PolicyCell Policy

// GetProperty implements DataCell interface
func (self PolicyCell) GetProperty(name dataselect.PropertyName) dataselect.ComparableValue {
	switch name {
	case dataselect.NameProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	case dataselect.CreationTimestampProperty:
		return dataselect.StdComparableTime(self.ObjectMeta.CreationTimestamp.Time)
	case dataselect.NamespaceProperty:
		return dataselect.StdComparableString(self.ObjectMeta.Namespace)
	default:
		// Default - name
		return dataselect.StdComparableString(self.ObjectMeta.Name)
	}
} 
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

package service

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"

	policyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

// CreateServiceByForm 通过表单创建Service
func CreateServiceByForm(req *v1.ServiceFormRequest) (*v1.CreateServiceResponse, error) {
	ctx := context.TODO()
	
	// 获取Kubernetes客户端
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 构建Service对象
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels:    req.Labels,
		},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceType(req.Type),
			Selector: req.Selector,
			Ports:    buildServicePorts(req.Ports),
		},
	}

	// 创建Service
	_, err = clientset.CoreV1().Services(req.Namespace).Create(ctx, service, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("创建Service失败: %v", err)
	}

	// 如果需要创建PropagationPolicy
	if req.PropagationPolicy != nil && req.PropagationPolicy.Create {
		err = createServicePropagationPolicy(req.PropagationPolicy, req.Name, req.Namespace)
		if err != nil {
			// 记录警告但不影响Service创建
			fmt.Printf("警告: 创建PropagationPolicy失败: %v\n", err)
		}
	}

	return &v1.CreateServiceResponse{
		Name:      req.Name,
		Namespace: req.Namespace,
		Message:   "Service创建成功",
	}, nil
}

// UpdateService 更新Service
func UpdateService(req *v1.UpdateServiceRequest) (*v1.CreateServiceResponse, error) {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 获取现有Service
	service, err := clientset.CoreV1().Services(req.Namespace).Get(ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取Service失败: %v", err)
	}

	// 更新规格
	service.Spec.Type = corev1.ServiceType(req.Spec.Type)
	service.Spec.Selector = req.Spec.Selector
	service.Spec.Ports = buildServicePorts(req.Spec.Ports)

	// 更新标签
	if req.Spec.Labels != nil {
		if service.ObjectMeta.Labels == nil {
			service.ObjectMeta.Labels = make(map[string]string)
		}
		for k, v := range req.Spec.Labels {
			service.ObjectMeta.Labels[k] = v
		}
	}

	// 执行更新
	_, err = clientset.CoreV1().Services(req.Namespace).Update(ctx, service, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新Service失败: %v", err)
	}

	return &v1.CreateServiceResponse{
		Name:      req.Name,
		Namespace: req.Namespace,
		Message:   "Service更新成功",
	}, nil
}

// DeleteService 删除Service
func DeleteService(namespace, name string) error {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 删除Service
	err = clientset.CoreV1().Services(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("删除Service失败: %v", err)
	}

	return nil
}

// buildServicePorts 构建Service端口
func buildServicePorts(portSpecs []v1.ServicePortSpec) []corev1.ServicePort {
	ports := make([]corev1.ServicePort, 0, len(portSpecs))
	
	for _, spec := range portSpecs {
		port := corev1.ServicePort{
			Name:       spec.Name,
			Port:       spec.Port,
			TargetPort: intstr.FromInt(int(spec.TargetPort)),
		}
		
		if spec.Protocol != "" {
			port.Protocol = corev1.Protocol(spec.Protocol)
		} else {
			port.Protocol = corev1.ProtocolTCP
		}
		
		if spec.NodePort > 0 {
			port.NodePort = spec.NodePort
		}
		
		ports = append(ports, port)
	}

	return ports
}

// createServicePropagationPolicy 创建Service的分发策略
func createServicePropagationPolicy(config *v1.PropagationPolicyConfig, resourceName, namespace string) error {
	if config.Name == "" {
		config.Name = resourceName + "-service-propagation"
	}

	karmadaClient := client.InClusterKarmadaClient()
	ctx := context.TODO()

	// 构建PropagationPolicy
	policy := &policyv1alpha1.PropagationPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      config.Name,
			Namespace: namespace,
		},
		Spec: policyv1alpha1.PropagationSpec{
			ResourceSelectors: []policyv1alpha1.ResourceSelector{
				{
					APIVersion: "v1",
					Kind:       "Service",
					Name:       resourceName,
				},
			},
		},
	}

	// 设置分发规则
	if config.Placement.ClusterSelector != nil {
		policy.Spec.Placement.ClusterAffinity = &policyv1alpha1.ClusterAffinity{
			LabelSelector: &metav1.LabelSelector{
				MatchLabels: config.Placement.ClusterSelector.MatchLabels,
			},
		}
	}

	if config.Placement.ClusterAffinity != nil && len(config.Placement.ClusterAffinity.ClusterNames) > 0 {
		if policy.Spec.Placement.ClusterAffinity == nil {
			policy.Spec.Placement.ClusterAffinity = &policyv1alpha1.ClusterAffinity{}
		}
		policy.Spec.Placement.ClusterAffinity.ClusterNames = config.Placement.ClusterAffinity.ClusterNames
	}

	// 创建策略
	_, err := karmadaClient.PolicyV1alpha1().PropagationPolicies(namespace).Create(ctx, policy, metav1.CreateOptions{})
	return err
} 
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
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"

	policyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

// CreateStatefulSetByForm 通过表单创建StatefulSet
func CreateStatefulSetByForm(req *v1.StatefulSetFormRequest) (*appsv1.StatefulSet, error) {
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

	// 构建StatefulSet对象
	statefulSet := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels:    req.Labels,
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas:    &req.Replicas,
			ServiceName: req.ServiceName,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": req.Name,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": req.Name,
					},
				},
				Spec: corev1.PodSpec{
					Containers:     buildContainers(req.Containers),
					InitContainers: buildContainers(req.InitContainers),
					Volumes:        buildVolumes(req.Volumes),
				},
			},
			VolumeClaimTemplates: buildVolumeClaimTemplates(req.VolumeClaimTemplates),
		},
	}

	// 设置更新策略
	if req.UpdateStrategy != nil {
		statefulSet.Spec.UpdateStrategy = buildStatefulSetUpdateStrategy(req.UpdateStrategy)
	}

	// 创建StatefulSet
	result, err := clientset.AppsV1().StatefulSets(req.Namespace).Create(ctx, statefulSet, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("创建StatefulSet失败: %v", err)
	}

	// 如果需要创建PropagationPolicy
	if req.PropagationPolicy != nil && req.PropagationPolicy.Create {
		err = createStatefulSetPropagationPolicy(req.PropagationPolicy, req.Name, req.Namespace)
		if err != nil {
			// 记录警告但不影响StatefulSet创建
			fmt.Printf("警告: 创建PropagationPolicy失败: %v\n", err)
		}
	}

	return result, nil
}

// UpdateStatefulSet 更新StatefulSet
func UpdateStatefulSet(req *v1.UpdateStatefulSetRequest) (*appsv1.StatefulSet, error) {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 获取现有StatefulSet
	statefulSet, err := clientset.AppsV1().StatefulSets(req.Namespace).Get(ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取StatefulSet失败: %v", err)
	}

	// 更新规格
	statefulSet.Spec.Replicas = &req.Spec.Replicas
	statefulSet.Spec.ServiceName = req.Spec.ServiceName
	statefulSet.Spec.Template.Spec.Containers = buildContainers(req.Spec.Containers)
	statefulSet.Spec.Template.Spec.InitContainers = buildContainers(req.Spec.InitContainers)
	statefulSet.Spec.Template.Spec.Volumes = buildVolumes(req.Spec.Volumes)
	statefulSet.Spec.VolumeClaimTemplates = buildVolumeClaimTemplates(req.Spec.VolumeClaimTemplates)

	if req.Spec.UpdateStrategy != nil {
		statefulSet.Spec.UpdateStrategy = buildStatefulSetUpdateStrategy(req.Spec.UpdateStrategy)
	}

	// 更新标签
	if req.Spec.Labels != nil {
		if statefulSet.ObjectMeta.Labels == nil {
			statefulSet.ObjectMeta.Labels = make(map[string]string)
		}
		for k, v := range req.Spec.Labels {
			statefulSet.ObjectMeta.Labels[k] = v
		}
	}

	// 执行更新
	result, err := clientset.AppsV1().StatefulSets(req.Namespace).Update(ctx, statefulSet, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新StatefulSet失败: %v", err)
	}

	return result, nil
}

// ScaleStatefulSet 扩缩容StatefulSet
func ScaleStatefulSet(namespace, name string, replicas int32) (*appsv1.StatefulSet, error) {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 获取现有StatefulSet
	statefulSet, err := clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取StatefulSet失败: %v", err)
	}

	// 更新副本数
	statefulSet.Spec.Replicas = &replicas

	// 执行更新
	result, err := clientset.AppsV1().StatefulSets(namespace).Update(ctx, statefulSet, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("扩缩容StatefulSet失败: %v", err)
	}

	return result, nil
}

// DeleteStatefulSet 删除StatefulSet
func DeleteStatefulSet(namespace, name string) error {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 删除StatefulSet
	err = clientset.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("删除StatefulSet失败: %v", err)
	}

	return nil
}

// buildContainers 构建容器规格 (复用deployment的逻辑)
func buildContainers(containerSpecs []v1.ContainerSpec) []corev1.Container {
	containers := make([]corev1.Container, 0, len(containerSpecs))
	
	for _, spec := range containerSpecs {
		container := corev1.Container{
			Name:  spec.Name,
			Image: spec.Image,
			Ports: buildContainerPorts(spec.Ports),
			Env:   buildEnvVars(spec.Env),
			VolumeMounts: buildVolumeMounts(spec.VolumeMounts),
		}

		// 设置资源需求
		if spec.Resources != nil {
			container.Resources = buildResourceRequirements(spec.Resources)
		}

		// 设置探针
		if spec.LivenessProbe != nil {
			container.LivenessProbe = buildProbe(spec.LivenessProbe)
		}
		if spec.ReadinessProbe != nil {
			container.ReadinessProbe = buildProbe(spec.ReadinessProbe)
		}

		containers = append(containers, container)
	}

	return containers
}

// buildVolumeClaimTemplates 构建PVC模板
func buildVolumeClaimTemplates(pvcSpecs []v1.PersistentVolumeClaimSpec) []corev1.PersistentVolumeClaim {
	pvcs := make([]corev1.PersistentVolumeClaim, 0, len(pvcSpecs))
	
	for _, spec := range pvcSpecs {
		pvc := corev1.PersistentVolumeClaim{
			ObjectMeta: metav1.ObjectMeta{
				Name:   spec.Name,
				Labels: spec.Labels,
			},
					Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: buildAccessModes(spec.AccessModes),
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse(spec.Size),
				},
			},
		},
		}
		
		if spec.StorageClass != "" {
			pvc.Spec.StorageClassName = &spec.StorageClass
		}
		
		pvcs = append(pvcs, pvc)
	}

	return pvcs
}

// buildAccessModes 构建访问模式
func buildAccessModes(modes []string) []corev1.PersistentVolumeAccessMode {
	accessModes := make([]corev1.PersistentVolumeAccessMode, 0, len(modes))
	for _, mode := range modes {
		accessModes = append(accessModes, corev1.PersistentVolumeAccessMode(mode))
	}
	return accessModes
}

// buildStatefulSetUpdateStrategy 构建StatefulSet更新策略
func buildStatefulSetUpdateStrategy(spec *v1.StatefulSetUpdateStrategy) appsv1.StatefulSetUpdateStrategy {
	strategy := appsv1.StatefulSetUpdateStrategy{}

	if spec.Type != "" {
		strategy.Type = appsv1.StatefulSetUpdateStrategyType(spec.Type)
	} else {
		strategy.Type = appsv1.RollingUpdateStatefulSetStrategyType
	}

	if spec.RollingUpdate != nil && strategy.Type == appsv1.RollingUpdateStatefulSetStrategyType {
		strategy.RollingUpdate = &appsv1.RollingUpdateStatefulSetStrategy{}
		if spec.RollingUpdate.Partition != nil {
			strategy.RollingUpdate.Partition = spec.RollingUpdate.Partition
		}
	}

	return strategy
}

// 以下函数复用deployment的实现
func buildContainerPorts(portSpecs []v1.ContainerPortSpec) []corev1.ContainerPort {
	ports := make([]corev1.ContainerPort, 0, len(portSpecs))
	
	for _, spec := range portSpecs {
		port := corev1.ContainerPort{
			Name:          spec.Name,
			ContainerPort: spec.ContainerPort,
		}
		if spec.Protocol != "" {
			port.Protocol = corev1.Protocol(spec.Protocol)
		} else {
			port.Protocol = corev1.ProtocolTCP
		}
		ports = append(ports, port)
	}

	return ports
}

func buildEnvVars(envSpecs []v1.EnvVarSpec) []corev1.EnvVar {
	envVars := make([]corev1.EnvVar, 0, len(envSpecs))
	
	for _, spec := range envSpecs {
		envVars = append(envVars, corev1.EnvVar{
			Name:  spec.Name,
			Value: spec.Value,
		})
	}

	return envVars
}

func buildResourceRequirements(spec *v1.ResourceRequirementsSpec) corev1.ResourceRequirements {
	requirements := corev1.ResourceRequirements{}

	if spec.Requests.CPU != "" || spec.Requests.Memory != "" {
		requirements.Requests = corev1.ResourceList{}
		if spec.Requests.CPU != "" {
			requirements.Requests[corev1.ResourceCPU] = resource.MustParse(spec.Requests.CPU)
		}
		if spec.Requests.Memory != "" {
			requirements.Requests[corev1.ResourceMemory] = resource.MustParse(spec.Requests.Memory)
		}
	}

	if spec.Limits.CPU != "" || spec.Limits.Memory != "" {
		requirements.Limits = corev1.ResourceList{}
		if spec.Limits.CPU != "" {
			requirements.Limits[corev1.ResourceCPU] = resource.MustParse(spec.Limits.CPU)
		}
		if spec.Limits.Memory != "" {
			requirements.Limits[corev1.ResourceMemory] = resource.MustParse(spec.Limits.Memory)
		}
	}

	return requirements
}

func buildVolumeMounts(mountSpecs []v1.VolumeMountSpec) []corev1.VolumeMount {
	mounts := make([]corev1.VolumeMount, 0, len(mountSpecs))
	
	for _, spec := range mountSpecs {
		mounts = append(mounts, corev1.VolumeMount{
			Name:      spec.Name,
			MountPath: spec.MountPath,
			ReadOnly:  spec.ReadOnly,
		})
	}

	return mounts
}

func buildVolumes(volumeSpecs []v1.VolumeSpec) []corev1.Volume {
	volumes := make([]corev1.Volume, 0, len(volumeSpecs))
	
	for _, spec := range volumeSpecs {
		volume := corev1.Volume{
			Name: spec.Name,
		}

		if spec.ConfigMap != nil {
			volume.VolumeSource.ConfigMap = &corev1.ConfigMapVolumeSource{
				LocalObjectReference: corev1.LocalObjectReference{
					Name: spec.ConfigMap.Name,
				},
			}
		} else if spec.Secret != nil {
			volume.VolumeSource.Secret = &corev1.SecretVolumeSource{
				SecretName: spec.Secret.SecretName,
			}
		} else if spec.EmptyDir != nil {
			volume.VolumeSource.EmptyDir = &corev1.EmptyDirVolumeSource{}
			if spec.EmptyDir.SizeLimit != "" {
				sizeLimit := resource.MustParse(spec.EmptyDir.SizeLimit)
				volume.VolumeSource.EmptyDir.SizeLimit = &sizeLimit
			}
		}

		volumes = append(volumes, volume)
	}

	return volumes
}

func buildProbe(spec *v1.ProbeSpec) *corev1.Probe {
	probe := &corev1.Probe{
		InitialDelaySeconds: spec.InitialDelaySeconds,
		PeriodSeconds:       spec.PeriodSeconds,
		TimeoutSeconds:      spec.TimeoutSeconds,
	}

	if spec.HTTPGet != nil {
		probe.ProbeHandler.HTTPGet = &corev1.HTTPGetAction{
			Path: spec.HTTPGet.Path,
			Port: intstr.FromInt(int(spec.HTTPGet.Port)),
		}
	}

	return probe
}

// createStatefulSetPropagationPolicy 创建StatefulSet的分发策略
func createStatefulSetPropagationPolicy(config *v1.PropagationPolicyConfig, resourceName, namespace string) error {
	if config.Name == "" {
		config.Name = resourceName + "-statefulset-propagation"
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
					APIVersion: "apps/v1",
					Kind:       "StatefulSet",
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
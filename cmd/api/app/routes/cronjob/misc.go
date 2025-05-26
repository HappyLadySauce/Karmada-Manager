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
	"context"
	"fmt"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes"

	policyv1alpha1 "github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
)

// CreateCronJobByForm 通过表单创建CronJob
func CreateCronJobByForm(req *v1.CronJobFormRequest) (*batchv1.CronJob, error) {
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

	// 构建CronJob对象
	cronJob := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      req.Name,
			Namespace: req.Namespace,
			Labels:    req.Labels,
		},
		Spec: batchv1.CronJobSpec{
			Schedule: req.Schedule,
			JobTemplate: batchv1.JobTemplateSpec{
				Spec: batchv1.JobSpec{
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
				},
			},
		},
	}

	// 设置重启策略
	if req.RestartPolicy != "" {
		cronJob.Spec.JobTemplate.Spec.Template.Spec.RestartPolicy = corev1.RestartPolicy(req.RestartPolicy)
	} else {
		cronJob.Spec.JobTemplate.Spec.Template.Spec.RestartPolicy = corev1.RestartPolicyNever
	}

	// 设置Job规格
	if req.Completions != nil {
		cronJob.Spec.JobTemplate.Spec.Completions = req.Completions
	}
	if req.Parallelism != nil {
		cronJob.Spec.JobTemplate.Spec.Parallelism = req.Parallelism
	}
	if req.BackoffLimit != nil {
		cronJob.Spec.JobTemplate.Spec.BackoffLimit = req.BackoffLimit
	}
	if req.ActiveDeadlineSeconds != nil {
		cronJob.Spec.JobTemplate.Spec.ActiveDeadlineSeconds = req.ActiveDeadlineSeconds
	}

	// 设置CronJob特有属性
	if req.ConcurrencyPolicy != "" {
		cronJob.Spec.ConcurrencyPolicy = batchv1.ConcurrencyPolicy(req.ConcurrencyPolicy)
	}
	if req.Suspend != nil {
		cronJob.Spec.Suspend = req.Suspend
	}
	if req.SuccessfulJobsHistoryLimit != nil {
		cronJob.Spec.SuccessfulJobsHistoryLimit = req.SuccessfulJobsHistoryLimit
	}
	if req.FailedJobsHistoryLimit != nil {
		cronJob.Spec.FailedJobsHistoryLimit = req.FailedJobsHistoryLimit
	}
	if req.StartingDeadlineSeconds != nil {
		cronJob.Spec.StartingDeadlineSeconds = req.StartingDeadlineSeconds
	}

	// 创建CronJob
	result, err := clientset.BatchV1().CronJobs(req.Namespace).Create(ctx, cronJob, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("创建CronJob失败: %v", err)
	}

	// 如果需要创建PropagationPolicy
	if req.PropagationPolicy != nil && req.PropagationPolicy.Create {
		err = createCronJobPropagationPolicy(req.PropagationPolicy, req.Name, req.Namespace)
		if err != nil {
			// 记录警告但不影响CronJob创建
			fmt.Printf("警告: 创建PropagationPolicy失败: %v\n", err)
		}
	}

	return result, nil
}

// UpdateCronJob 更新CronJob
func UpdateCronJob(req *v1.UpdateCronJobRequest) (*batchv1.CronJob, error) {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 获取现有CronJob
	cronJob, err := clientset.BatchV1().CronJobs(req.Namespace).Get(ctx, req.Name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取CronJob失败: %v", err)
	}

	// 更新规格
	cronJob.Spec.Schedule = req.Spec.Schedule
	cronJob.Spec.JobTemplate.Spec.Template.Spec.Containers = buildContainers(req.Spec.Containers)
	cronJob.Spec.JobTemplate.Spec.Template.Spec.InitContainers = buildContainers(req.Spec.InitContainers)
	cronJob.Spec.JobTemplate.Spec.Template.Spec.Volumes = buildVolumes(req.Spec.Volumes)

	if req.Spec.RestartPolicy != "" {
		cronJob.Spec.JobTemplate.Spec.Template.Spec.RestartPolicy = corev1.RestartPolicy(req.Spec.RestartPolicy)
	}

	if req.Spec.Completions != nil {
		cronJob.Spec.JobTemplate.Spec.Completions = req.Spec.Completions
	}
	if req.Spec.Parallelism != nil {
		cronJob.Spec.JobTemplate.Spec.Parallelism = req.Spec.Parallelism
	}
	if req.Spec.BackoffLimit != nil {
		cronJob.Spec.JobTemplate.Spec.BackoffLimit = req.Spec.BackoffLimit
	}
	if req.Spec.ActiveDeadlineSeconds != nil {
		cronJob.Spec.JobTemplate.Spec.ActiveDeadlineSeconds = req.Spec.ActiveDeadlineSeconds
	}

	if req.Spec.ConcurrencyPolicy != "" {
		cronJob.Spec.ConcurrencyPolicy = batchv1.ConcurrencyPolicy(req.Spec.ConcurrencyPolicy)
	}
	if req.Spec.Suspend != nil {
		cronJob.Spec.Suspend = req.Spec.Suspend
	}
	if req.Spec.SuccessfulJobsHistoryLimit != nil {
		cronJob.Spec.SuccessfulJobsHistoryLimit = req.Spec.SuccessfulJobsHistoryLimit
	}
	if req.Spec.FailedJobsHistoryLimit != nil {
		cronJob.Spec.FailedJobsHistoryLimit = req.Spec.FailedJobsHistoryLimit
	}
	if req.Spec.StartingDeadlineSeconds != nil {
		cronJob.Spec.StartingDeadlineSeconds = req.Spec.StartingDeadlineSeconds
	}

	// 更新标签
	if req.Spec.Labels != nil {
		if cronJob.ObjectMeta.Labels == nil {
			cronJob.ObjectMeta.Labels = make(map[string]string)
		}
		for k, v := range req.Spec.Labels {
			cronJob.ObjectMeta.Labels[k] = v
		}
	}

	// 执行更新
	result, err := clientset.BatchV1().CronJobs(req.Namespace).Update(ctx, cronJob, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新CronJob失败: %v", err)
	}

	return result, nil
}

// DeleteCronJob 删除CronJob
func DeleteCronJob(namespace, name string) error {
	ctx := context.TODO()
	
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		return fmt.Errorf("获取Karmada配置失败: %v", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("创建Kubernetes客户端失败: %v", err)
	}

	// 删除CronJob
	err = clientset.BatchV1().CronJobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("删除CronJob失败: %v", err)
	}

	return nil
}

// 复用其他workload的构建函数
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

// createCronJobPropagationPolicy 创建CronJob的分发策略
func createCronJobPropagationPolicy(config *v1.PropagationPolicyConfig, resourceName, namespace string) error {
	if config.Name == "" {
		config.Name = resourceName + "-cronjob-propagation"
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
					APIVersion: "batch/v1",
					Kind:       "CronJob",
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
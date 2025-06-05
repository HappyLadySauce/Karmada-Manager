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

import { karmadaClient, IResponse, convertDataSelectQuery, DataSelectQuery } from './base';
import { WorkloadKind } from './base';

// 工作负载基本信息
export interface WorkloadInfo {
  name: string;
  namespace: string;
  kind: string;
  apiVersion: string;
  replicas: number;
  readyReplicas: number;
}

// 策略信息
export interface PolicyInfo {
  name: string;
  namespace: string;
  clusterAffinity?: {
    clusterNames: string[];
  };
  placement?: any;
}

// 集群调度信息
export interface ClusterPlacement {
  clusterName: string;
  plannedReplicas: number;
  actualReplicas: number;
  weight?: number;
  reason: string;
}

// 调度状态
export interface SchedulingStatus {
  phase: string; // Scheduled, Pending, Failed
  message: string;
}

// 工作负载调度视图
export interface WorkloadSchedulingView {
  workloadInfo: WorkloadInfo;
  propagationPolicy?: PolicyInfo;
  overridePolicy?: PolicyInfo;
  clusterPlacements: ClusterPlacement[];
  schedulingStatus: SchedulingStatus;
}

// Pod详细信息
export interface PodDetail {
  podName: string;
  podNamespace: string;
  podStatus: string;
  podIP?: string;
  restartCount: number;
  createdTime: string;
  labels?: Record<string, string>;
}

// 节点资源信息
export interface NodeResources {
  cpuCapacity: string;
  memoryCapacity: string;
  cpuAllocatable: string;
  memoryAllocatable: string;
  podCapacity: string;
  podAllocatable: string;
}

// 节点调度信息
export interface NodePlacement {
  nodeName: string;
  podCount: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  nodeStatus: string;
  nodeIP?: string;
  nodeRoles: string[];
  podDetails: PodDetail[];
  nodeResources: NodeResources;
}

// 精确集群调度信息
export interface PreciseClusterPlacement {
  clusterName: string;
  plannedReplicas: number;
  actualReplicas: number;
  weight?: number;
  reason: string;
  nodePlacements: NodePlacement[];
  clusterStatus: string;
  clusterVersion?: string;
}

// 精确调度信息
export interface PreciseSchedulingInfo {
  workloadInfo: WorkloadInfo;
  propagationPolicy?: PolicyInfo;
  clusterPlacements: PreciseClusterPlacement[];
  schedulingStatus: SchedulingStatus;
  totalReplicas: number;
  readyReplicas: number;
}

// 集群分布统计
export interface ClusterDistribution {
  clusterName: string;
  workloadCount: number;
  totalReplicas: number;
  readyReplicas: number;
  nodeCount: number;
  readyNodes: number;
  clusterStatus: string;
}

// 命名空间调度统计
export interface NamespaceSchedulingStats {
  namespace: string;
  workloadCount: number;
  scheduledCount: number;
  pendingCount: number;
  failedCount: number;
}

// 调度概览统计
export interface SchedulingOverview {
  totalWorkloads: number;
  scheduledWorkloads: number;
  pendingWorkloads: number;
  failedWorkloads: number;
  clusterDistribution: ClusterDistribution[];
  namespaceStats: NamespaceSchedulingStats[];
}

// 命名空间工作负载调度查询参数
export interface NamespaceWorkloadsSchedulingParams {
  namespace: string;
  page?: number;
  pageSize?: number;
  kind?: WorkloadKind;
}

// 命名空间工作负载调度响应
export interface NamespaceWorkloadsSchedulingResponse {
  data: WorkloadSchedulingView[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// 获取工作负载调度信息
export async function GetWorkloadScheduling(params: {
  namespace: string;
  name: string;
  kind?: WorkloadKind;
}) {
  const { namespace, name, kind = WorkloadKind.Deployment } = params;
  const resp = await karmadaClient.get<IResponse<WorkloadSchedulingView>>(
    `/workloads/${namespace}/${name}/scheduling`,
    {
      params: { kind },
    }
  );
  return resp.data;
}

// 获取精确调度信息（包含节点级别详情）
export async function GetPreciseSchedulingInfo(params: {
  namespace: string;
  name: string;
  kind?: WorkloadKind;
}) {
  const { namespace, name, kind = WorkloadKind.Deployment } = params;
  const resp = await karmadaClient.get<IResponse<PreciseSchedulingInfo>>(
    `/workloads/${namespace}/${name}/precise-scheduling`,
    {
      params: { kind },
    }
  );
  return resp.data;
}

// 获取调度概览信息
export async function GetSchedulingOverview(params?: {
  namespace?: string;
}) {
  const resp = await karmadaClient.get<IResponse<SchedulingOverview>>(
    `/scheduling/overview`,
    {
      params,
    }
  );
  return resp.data;
}

// 获取命名空间工作负载调度信息
export async function GetNamespaceWorkloadsScheduling(params: NamespaceWorkloadsSchedulingParams) {
  const { namespace, ...queryParams } = params;
  const resp = await karmadaClient.get<IResponse<NamespaceWorkloadsSchedulingResponse>>(
    `/scheduling/namespace/${namespace}/workloads`,
    {
      params: queryParams,
    }
  );
  return resp.data;
} 
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

import { IResponse } from './base';

export interface SchedulingListParams {
  resourceType?: 'workload' | 'service' | 'configuration';
  namespace?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface SchedulingData {
  name: string;
  namespace: string;
  resourceType: string;
  clusters: string[];
  replicas?: number;
  readyReplicas?: number;
  status: string;
  createTime: string;
  workloadInfo?: {
    workloadName: string;
    namespace: string;
    kind: string;
    apiVersion: string;
    clusters: Array<{
      cluster: string;
      replicas: number;
      readyReplicas: number;
      nodes?: string[];
      status: string;
    }>;
  };
  serviceInfo?: {
    serviceName: string;
    namespace: string;
    type: string;
    ports: Array<{
      port: number;
      targetPort: number;
      protocol: string;
    }>;
    clusters: string[];
    endpoints?: number;
  };
  configInfo?: {
    configName: string;
    namespace: string;
    type: string;
    data: Record<string, string>;
    clusters: string[];
    size?: number;
  };
}

export interface SchedulingListResponse {
  data: SchedulingData[];
  total: number;
}

// 模拟调度数据
const mockSchedulingData: SchedulingData[] = [
  {
    name: 'nginx-deployment',
    namespace: 'default',
    resourceType: 'deployment',
    clusters: ['master', 'branch'],
    status: 'running',
    createTime: '2024-01-20 15:30:00',
    workloadInfo: {
      workloadName: 'nginx-deployment',
      namespace: 'default',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      clusters: [
        {
          cluster: 'master',
          replicas: 3,
          readyReplicas: 3,
          nodes: ['master-node-1', 'master-node-2'],
          status: 'healthy'
        },
        {
          cluster: 'branch',
          replicas: 2,
          readyReplicas: 2,
          nodes: ['branch-node-1'],
          status: 'healthy'
        }
      ]
    }
  },
  {
    name: 'web-service',
    namespace: 'default',
    resourceType: 'service',
    clusters: ['master', 'branch'],
    status: 'available',
    createTime: '2024-01-20 15:25:00',
    serviceInfo: {
      serviceName: 'web-service',
      namespace: 'default',
      type: 'ClusterIP',
      ports: [
        { port: 80, targetPort: 8080, protocol: 'TCP' },
        { port: 443, targetPort: 8443, protocol: 'TCP' }
      ],
      clusters: ['master', 'branch'],
      endpoints: 5
    }
  },
  {
    name: 'app-config',
    namespace: 'default',
    resourceType: 'configmap',
    clusters: ['master', 'branch', 'edge-cluster'],
    status: 'available',
    createTime: '2024-01-20 15:20:00',
    configInfo: {
      configName: 'app-config',
      namespace: 'default',
      type: 'ConfigMap',
      data: {
        'app.properties': 'server.port=8080\ndatabase.url=localhost:3306',
        'log4j.xml': '<?xml version="1.0" encoding="UTF-8"?>'
      },
      clusters: ['master', 'branch', 'edge-cluster'],
      size: 2.5
    }
  },
  {
    name: 'redis-deployment',
    namespace: 'cache',
    resourceType: 'deployment',
    clusters: ['master'],
    status: 'pending',
    createTime: '2024-01-20 15:15:00',
    workloadInfo: {
      workloadName: 'redis-deployment',
      namespace: 'cache',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      clusters: [
        {
          cluster: 'master',
          replicas: 1,
          readyReplicas: 0,
          nodes: [],
          status: 'warning'
        }
      ]
    }
  },
  {
    name: 'api-service',
    namespace: 'production',
    resourceType: 'service',
    clusters: ['master', 'edge-cluster'],
    status: 'available',
    createTime: '2024-01-20 15:10:00',
    serviceInfo: {
      serviceName: 'api-service',
      namespace: 'production',
      type: 'LoadBalancer',
      ports: [
        { port: 80, targetPort: 3000, protocol: 'TCP' }
      ],
      clusters: ['master', 'edge-cluster'],
      endpoints: 8
    }
  },
  {
    name: 'database-secret',
    namespace: 'production',
    resourceType: 'secret',
    clusters: ['master', 'branch'],
    status: 'available',
    createTime: '2024-01-20 15:05:00',
    configInfo: {
      configName: 'database-secret',
      namespace: 'production',
      type: 'Secret',
      data: {
        'username': 'YWRtaW4=',
        'password': 'cGFzc3dvcmQ='
      },
      clusters: ['master', 'branch'],
      size: 0.1
    }
  }
];

// 模拟获取调度列表
export async function getSchedulingList(params: SchedulingListParams = {}): Promise<IResponse<SchedulingListResponse>> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  let filteredData = [...mockSchedulingData];

  // 按资源类型过滤
  if (params.resourceType) {
    filteredData = filteredData.filter(item => {
      switch (params.resourceType) {
        case 'workload':
          return ['deployment', 'statefulset', 'daemonset'].includes(item.resourceType);
        case 'service':
          return item.resourceType === 'service';
        case 'configuration':
          return ['configmap', 'secret'].includes(item.resourceType);
        default:
          return true;
      }
    });
  }

  // 按命名空间过滤
  if (params.namespace && params.namespace !== 'all') {
    filteredData = filteredData.filter(item => item.namespace === params.namespace);
  }

  // 按状态过滤
  if (params.status && params.status !== 'all') {
    filteredData = filteredData.filter(item => item.status.toLowerCase() === params.status!.toLowerCase());
  }

  // 分页
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    code: 200,
    message: 'success',
    data: {
      data: paginatedData,
      total: filteredData.length
    }
  };
}

// 模拟获取调度详情
export async function getSchedulingDetail(params: { namespace: string; name: string; kind?: string }): Promise<IResponse<SchedulingData>> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const item = mockSchedulingData.find(data => 
    data.name === params.name && data.namespace === params.namespace
  );

  if (!item) {
    return {
      code: 404,
      message: '未找到调度信息',
      data: null as any
    };
  }

  return {
    code: 200,
    message: 'success',
    data: item
  };
}

// 模拟获取调度统计
export async function getSchedulingStatistics(): Promise<IResponse<{
  totalResources: number;
  scheduledResources: number;
  pendingResources: number;
  failedResources: number;
  clusters: number;
  namespaces: number;
}>> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const stats = {
    totalResources: mockSchedulingData.length,
    scheduledResources: mockSchedulingData.filter(item => 
      item.status === 'running' || item.status === 'available'
    ).length,
    pendingResources: mockSchedulingData.filter(item => item.status === 'pending').length,
    failedResources: mockSchedulingData.filter(item => item.status === 'failed').length,
    clusters: [...new Set(mockSchedulingData.flatMap(item => item.clusters))].length,
    namespaces: [...new Set(mockSchedulingData.map(item => item.namespace))].length
  };

  return {
    code: 200,
    message: 'success',
    data: stats
  };
} 
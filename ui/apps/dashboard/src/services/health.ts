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

import { IResponse, karmadaClient } from '@/services/base.ts';

// 基础健康状态接口定义
export interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  uptime: string;
  version: string;
}

// 详细健康状态接口定义
export interface DetailedHealthStatus {
  overall: 'healthy' | 'warning' | 'error';
  components: ComponentHealth[];
  dependencies: DependencyHealth[];
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: string;
}

export interface DependencyHealth {
  name: string;
  status: 'healthy' | 'partial' | 'error';
  message?: string;
  latency?: string;
  details?: Record<string, any>;
}

// 获取基础健康状态
export async function GetHealthStatus() {
  const resp = await karmadaClient.get<IResponse<HealthStatus>>('/health');
  return resp.data;
}

// 获取详细健康状态
export async function GetDetailedHealthStatus() {
  const resp = await karmadaClient.get<IResponse<DetailedHealthStatus>>('/health/detailed');
  return resp.data;
} 
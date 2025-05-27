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

// 实时监控数据接口定义
export interface MonitoringData {
  timestamp: string;
  clusters: ClusterMonitoring[];
  alerts: AlertInfo[];
}

export interface ClusterMonitoring {
  name: string;
  status: string;
  resources: {
    cpu: ResourceUsage;
    memory: ResourceUsage;
    pods: PodUsage;
  };
}

export interface ResourceUsage {
  usage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PodUsage {
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AlertInfo {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  source?: string;
}

// 事件信息接口定义
export interface EventInfo {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  details?: Record<string, any>;
}

export interface EventsResponse {
  events: EventInfo[];
  total: number;
}

// 告警规则接口定义
export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error';
  enabled: boolean;
}

export interface AlertRulesResponse {
  rules: AlertRule[];
}

// 获取实时监控数据
export async function GetMonitoringRealtime(params?: {
  type?: 'cluster' | 'resource' | 'all';
  interval?: number;
}) {
  const resp = await karmadaClient.get<IResponse<MonitoringData>>('/monitoring/realtime', {
    params
  });
  return resp.data;
}

// 获取最近事件
export async function GetRecentEvents(params?: {
  limit?: number;
  severity?: 'info' | 'warning' | 'error';
  source?: string;
}) {
  const resp = await karmadaClient.get<IResponse<EventsResponse>>('/events/recent', {
    params
  });
  return resp.data;
}

// 获取告警规则
export async function GetAlertRules() {
  const resp = await karmadaClient.get<IResponse<AlertRulesResponse>>('/alerts/rules');
  return resp.data;
} 
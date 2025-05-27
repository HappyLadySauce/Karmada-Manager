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

// 用户偏好设置接口定义
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  defaultCluster?: string;
  dashboardLayout: {
    overview: string[];
    refreshInterval: number;
  };
}

// 偏好设置更新参数
export interface UpdatePreferencesParams {
  theme?: 'light' | 'dark';
  language?: string;
  timezone?: string;
  defaultCluster?: string;
  dashboardLayout?: {
    overview?: string[];
    refreshInterval?: number;
  };
}

// 获取用户偏好设置
export async function GetUserPreferences() {
  const resp = await karmadaClient.get<IResponse<UserPreferences>>('/user/preferences');
  return resp.data;
}

// 更新用户偏好设置
export async function UpdateUserPreferences(params: UpdatePreferencesParams) {
  const resp = await karmadaClient.put<IResponse<UserPreferences>>('/user/preferences', params);
  return resp.data;
} 
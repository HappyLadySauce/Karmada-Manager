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

import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import {
  IRouteObjectHandle,
  menuItems,
  flattenRoutes,
  filterMenuItems,
} from '@/routes/route.tsx';
import { useMatches, useNavigate } from 'react-router-dom';
import { FC, useMemo } from 'react';
import _ from 'lodash';
import { getSidebarWidth } from '@/utils/i18n';
import { cn } from '@/utils/cn.ts';
import { useQuery } from '@tanstack/react-query';
import { GetDashboardConfig, menuConfig } from '@/services/dashboard-config.ts';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const onClick: MenuProps['onClick'] = (e) => {
    const url = flattenRoutes[e.key];
    if (!url) return;
    navigate(url);
  };
  const matches = useMatches();
  const selectKeys = useMemo(() => {
    if (!matches) return [];
    return matches
      .filter((m) => !_.isUndefined(m.handle))
      .map((m) => (m.handle as IRouteObjectHandle).sidebarKey);
  }, [matches]);
  const { data } = useQuery({
    queryKey: ['GetDashboardConfig'],
    queryFn: async () => {
      try {
        const ret = await GetDashboardConfig();
        return ret.data;
      } catch (error) {
        console.error('Failed to fetch dashboard config:', error);
        return null;
      }
    },
  });
  const filteredMenuItems = useMemo(() => {
    // 如果没有配置数据或者menu_configs为空，显示所有菜单项
    if (!data || !data.menu_configs || data.menu_configs.length === 0) {
      return menuItems;
    }
    const menuInfo = traverseMenuConfig(data.menu_configs);
    // 如果menuInfo为空对象，也显示所有菜单项
    if (Object.keys(menuInfo).length === 0) {
      return menuItems;
    }
    return filterMenuItems(menuItems, menuInfo);
  }, [data, menuItems]);

  // 计算应该展开的菜单项
  const openKeys = useMemo(() => {
    if (selectKeys.length > 0) {
      const currentPath = matches[matches.length - 1]?.pathname;
      
      // 如果当前路径包含 cluster-manage，展开集群管理菜单
      if (currentPath?.includes('/cluster-manage')) {
        return ['CLUSTER-MANAGE'];
      }
      
      // 如果当前路径包含 multicloud-resource-manage，展开多云资源管理菜单
      if (currentPath?.includes('/multicloud-resource-manage')) {
        return ['MULTICLOUD-RESOURCE-MANAGE'];
      }
      
      // 如果当前路径包含 multicloud-policy-manage，展开多云策略管理菜单
      if (currentPath?.includes('/multicloud-policy-manage')) {
        return ['MULTICLOUD-POLICY-MANAGE'];
      }
      
      // 如果当前路径包含 basic-config，展开基础配置菜单
      if (currentPath?.includes('/basic-config')) {
        return ['BASIC-CONFIG'];
      }
      
      // 如果当前路径包含 advanced-config，展开高级配置菜单
      if (currentPath?.includes('/advanced-config')) {
        return ['ADVANCED-CONFIG'];
      }
      
      // 如果当前路径包含 addon，展开插件管理菜单
      if (currentPath?.includes('/addon')) {
        return ['ADDON'];
      }
      
      // 默认情况
      return [selectKeys[0]];
    }
    
    // 默认展开的菜单项
    return ['MULTICLOUD-RESOURCE-MANAGE', 'MULTICLOUD-POLICY-MANAGE'];
  }, [selectKeys, matches]);
  return (
    <div className={cn('w-full', 'h-full', 'overflow-y-auto')}>
      <Menu
        onClick={onClick}
        style={{ width: collapsed ? '80px' : getSidebarWidth() }}
        selectedKeys={selectKeys}
        openKeys={openKeys}
        onOpenChange={(keys) => {
          // 这里可以添加状态管理来控制菜单展开状态，暂时保持简单
        }}
        mode="inline"
        items={filteredMenuItems}
      />
    </div>
  );
};

function traverseMenuConfig(
  menu_configs: menuConfig[] | undefined | null,
): Record<string, boolean> {
  let menuInfo = {} as Record<string, boolean>;

  // 检查 menu_configs 是否为有效的数组
  if (!menu_configs || !Array.isArray(menu_configs)) {
    return menuInfo;
  }

  for (const menu_config of menu_configs) {
    if (menu_config && menu_config.sidebar_key) {
      menuInfo[menu_config.sidebar_key] = menu_config.enable;
      const childrenMenuInfo = menu_config.children
        ? traverseMenuConfig(menu_config.children)
        : {};
      menuInfo = {
        ...menuInfo,
        ...childrenMenuInfo,
      };
    }
  }
  return menuInfo;
}

export default Sidebar;

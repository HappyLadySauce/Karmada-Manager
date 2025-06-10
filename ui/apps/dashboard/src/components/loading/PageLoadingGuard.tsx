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

import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from './LoadingManager';

interface PageLoadingGuardProps {
  children: React.ReactNode;
}

const PageLoadingGuard: React.FC<PageLoadingGuardProps> = ({ children }) => {
  const location = useLocation();
  const { showLoading, hideLoading } = useLoading();
  const isFirstRender = useRef(true);
  const previousPath = useRef<string>('');

  useEffect(() => {
    // 跳过首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPath.current = location.pathname;
      return;
    }

    // 只在路径真正改变时才显示加载
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname;
      
      // 简单的加载提示，不使用复杂的进度条
      showLoading({
        message: '正在加载页面',
        description: '请稍候...',
        showProgress: false
      });

      // 1秒后隐藏加载提示
      const timer = setTimeout(() => {
        hideLoading();
      }, 1000);

      return () => {
        clearTimeout(timer);
        hideLoading();
      };
    }
  }, [location.pathname]); // 只依赖location.pathname

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      hideLoading();
    };
  }, []);

  return <>{children}</>;
};

export default PageLoadingGuard; 
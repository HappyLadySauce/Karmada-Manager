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

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import KarmadaLoading from './KarmadaLoading';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  description?: string;
  progress?: number;
  showProgress?: boolean;
}

interface LoadingContextType {
  loadingState: LoadingState;
  showLoading: (options?: Partial<Omit<LoadingState, 'isLoading'>>) => void;
  hideLoading: () => void;
  updateProgress: (progress: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: '正在连接 Karmada',
    description: '多集群管理平台正在初始化...',
    progress: 0,
    showProgress: false,
  });

  const showLoading = useCallback((options?: Partial<Omit<LoadingState, 'isLoading'>>) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      ...options,
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const contextValue: LoadingContextType = useMemo(() => ({
    loadingState,
    showLoading,
    hideLoading,
    updateProgress,
  }), [loadingState, showLoading, hideLoading, updateProgress]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {loadingState.isLoading && (
        <KarmadaLoading
          message={loadingState.message}
          description={loadingState.description}
          progress={loadingState.progress}
          showProgress={loadingState.showProgress}
        />
      )}
    </LoadingContext.Provider>
  );
};

// 工具函数：用于模拟带进度的加载过程
export const simulateProgressLoading = (
  showLoading: (options?: Partial<Omit<LoadingState, 'isLoading'>>) => void,
  hideLoading: () => void,
  updateProgress: (progress: number) => void,
  options?: {
    message?: string;
    description?: string;
    duration?: number; // 毫秒
    steps?: string[]; // 不同阶段的描述
  }
) => {
  const { 
    message = '正在加载', 
    description = '请稍候...', 
    duration = 3000,
    steps = []
  } = options || {};

  return new Promise<void>((resolve) => {
    showLoading({
      message,
      description,
      showProgress: true,
      progress: 0,
    });

    const totalSteps = 100;
    const stepDuration = duration / totalSteps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      
      // 更新进度
      updateProgress(progress);
      
      // 如果有步骤描述，更新描述文本
      if (steps.length > 0) {
        const stepIndex = Math.floor((progress / 100) * steps.length);
        if (stepIndex < steps.length) {
          showLoading({
            message,
            description: steps[stepIndex],
            showProgress: true,
            progress,
          });
        }
      }

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        hideLoading();
        resolve();
      }
    }, stepDuration);
  });
};

export default LoadingProvider; 
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

import React from 'react';
import {
  Badge,
  Card,
  Col,
  Row,
  Statistic,
  Spin,
  Progress,
  Typography,
  Space,
  Avatar,
  Tooltip,
  Tag,
  Button,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview.ts';
import { GetClusterResources, ClusterResource } from '@/services/cluster.ts';
import dayjs from 'dayjs';
import {
  ClusterOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  BarChartOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DashboardOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 集群卡片组件（增强版）
const ClusterCard: React.FC<{ cluster: ClusterResource }> = ({ cluster }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': 
      case 'True': return '#52c41a';
      case 'NotReady': 
      case 'False': return '#ff4d4f';
      default: return '#faad14';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Ready': 
      case 'True': return '健康';
      case 'NotReady': 
      case 'False': return '异常';
      default: return '警告';
    }
  };

  const getLoadLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#52c41a';
      case 'medium': return '#faad14';
      case 'high': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getProviderIcon = (provider?: string) => {
    if (!provider) return <CloudServerOutlined />;
    switch (provider.toLowerCase()) {
      case 'aws': return '☁️';
      case 'azure': return '☁️';
      case 'gcp': return '☁️';
      case 'alicloud': return '☁️';
      case 'tencent': return '☁️';
      default: return <CloudServerOutlined />;
    }
  };

  const formatJoinedTime = (joinedTime?: string) => {
    if (!joinedTime) return '';
    const days = dayjs().diff(dayjs(joinedTime), 'day');
    if (days === 0) return '今天加入';
    if (days === 1) return '昨天加入';
    if (days < 30) return `${days}天前加入`;
    if (days < 365) return `${Math.floor(days/30)}个月前加入`;
    return `${Math.floor(days/365)}年前加入`;
  };

  const cpuPercent = cluster.resources.cpu.allocatable > 0 
    ? Math.round((cluster.resources.cpu.allocated / cluster.resources.cpu.allocatable) * 100)
    : 0;

  const memoryPercent = cluster.resources.memory.allocatable > 0 
    ? Math.round((cluster.resources.memory.allocated / cluster.resources.memory.allocatable) * 100)
    : 0;

  const clusterTooltip = (
    <div style={{ maxWidth: 300, color: '#fff' }}>
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ color: '#fff' }}>{cluster.displayName || cluster.name}</Text>
      </div>
      {cluster.location && (
        <div style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: '#fff' }}>位置: {cluster.location.city}, {cluster.location.country}</Text>
        </div>
      )}
      {cluster.version && (
        <div style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: '#fff' }}>版本: {cluster.version}</Text>
        </div>
      )}
      {cluster.provider && (
        <div style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: '#fff' }}>提供商: {cluster.provider}</Text>
        </div>
      )}
      <div style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: '#fff' }}>
          CPU: {cluster.resources.cpu.allocated}/{cluster.resources.cpu.allocatable} ({cpuPercent}%)
        </Text>
      </div>
      <div style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: '#fff' }}>
          内存: {(cluster.resources.memory.allocated / 1024 / 1024 / 1024).toFixed(1)}GB/
          {(cluster.resources.memory.allocatable / 1024 / 1024 / 1024).toFixed(1)}GB ({memoryPercent}%)
        </Text>
      </div>
      <div>
        <Text style={{ fontSize: 12, color: '#fff' }}>节点: {cluster.nodeCount} | Pod: {cluster.podCount}</Text>
      </div>
    </div>
  );

  return (
    <Tooltip 
      title={clusterTooltip} 
      placement="top" 
      overlayStyle={{ 
        zIndex: 9999 
      }}
      overlayInnerStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <Card 
        className="cluster-card"
        style={{
          borderRadius: 12,
          border: `2px solid ${cluster.status === 'Ready' ? '#e5e7eb' : getStatusColor(cluster.status)}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          height: '100%'
        }}
        styles={{ body: { padding: '16px' } }}
        hoverable
      >
      <div style={{ position: 'relative' }}>
        {/* 状态指示器 */}
        <div style={{ 
          position: 'absolute', 
          top: -8, 
          right: -8,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <div style={{
            width: 12,
            height: 12,
            backgroundColor: getStatusColor(cluster.status),
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}></div>
        </div>

        {/* 集群头部信息 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {cluster.displayName || cluster.name}
              </Title>
              {cluster.provider && (
                <span style={{ fontSize: 16 }}>{getProviderIcon(cluster.provider)}</span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {cluster.location && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {cluster.location.city}, {cluster.location.country}
                </Text>
              )}
              {cluster.region && (
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {cluster.region}
                </Text>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ color: getStatusColor(cluster.status), fontSize: 12, fontWeight: 500 }}>
              {getStatusText(cluster.status)}
            </Text>
            {cluster.zone && (
              <Tag style={{ fontSize: 10 }}>
                {cluster.zone}
              </Tag>
            )}
            {cluster.version && (
              <Tag color="blue" style={{ fontSize: 10 }}>
                {cluster.version}
              </Tag>
            )}
          </div>
          {cluster.joinedTime && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              {formatJoinedTime(cluster.joinedTime)}
            </Text>
          )}
        </div>

        {/* 关键指标 */}
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
              {cluster.nodeCount}
            </Text>
            <div style={{ fontSize: 10, color: '#666' }}>节点</div>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
              {cluster.podCount}
            </Text>
            <div style={{ fontSize: 10, color: '#666' }}>Pod</div>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#722ed1' }}>
              {cluster.availability}%
            </Text>
            <div style={{ fontSize: 10, color: '#666' }}>可用性</div>
          </Col>
        </Row>

        {/* 资源使用率 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>CPU</Text>
              <Text style={{ fontSize: 12, fontWeight: 500 }}>{cpuPercent}%</Text>
            </div>
            <Progress 
              percent={cpuPercent} 
              strokeColor={getLoadLevelColor(cluster.loadLevel)}
              trailColor="#f0f0f0"
              size="small"
              showInfo={false}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>内存</Text>
              <Text style={{ fontSize: 12, fontWeight: 500 }}>{memoryPercent}%</Text>
            </div>
            <Progress 
              percent={memoryPercent} 
              strokeColor={getLoadLevelColor(cluster.loadLevel)}
              trailColor="#f0f0f0"
              size="small"
              showInfo={false}
            />
          </div>
        </div>

        {/* 集群能力和特性 */}
        {cluster.capabilities && cluster.capabilities.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 4 }}>集群能力:</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cluster.capabilities.slice(0, 3).map((capability, index) => (
                <Tag 
                  key={index} 
                  color="cyan"
                  style={{ fontSize: 9 }}
                >
                  {capability}
                </Tag>
              ))}
              {cluster.capabilities.length > 3 && (
                <Text style={{ fontSize: 9, color: '#999' }}>+{cluster.capabilities.length - 3}</Text>
              )}
            </div>
          </div>
        )}

        {/* 标签 */}
        {cluster.labels && Object.keys(cluster.labels).length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 4 }}>标签:</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(cluster.labels).slice(0, 3).map(([key, value]) => (
                <Tag 
                  key={key} 
                  style={{ 
                    fontSize: 9, 
                    padding: '0 4px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    border: 'none'
                  }}
                >
                  {key}={value}
                </Tag>
              ))}
              {Object.keys(cluster.labels).length > 3 && (
                <Text style={{ fontSize: 9, color: '#999' }}>+{Object.keys(cluster.labels).length - 3}</Text>
              )}
            </div>
          </div>
        )}

        {/* 污点信息（如果有） */}
        {cluster.taints && cluster.taints.length > 0 && (
          <div>
            <Text style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 4 }}>污点:</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cluster.taints.slice(0, 2).map((taint, index) => (
                <Tag 
                  key={index} 
                  color="orange"
                  style={{ fontSize: 9 }}
                >
                  {taint.key}
                </Tag>
              ))}
              {cluster.taints.length > 2 && (
                <Text style={{ fontSize: 9, color: '#999' }}>+{cluster.taints.length - 2}</Text>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
    </Tooltip>
  );
};

const Overview = () => {
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
            try {
        const ret = await GetOverview();
        return ret.data;
      } catch (error) {
        console.error('获取概览数据失败:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // 30秒自动刷新
    retry: 3, // 重试3次
    retryDelay: 1000, // 重试延迟1秒
  });

  // 数据适配器函数
  const adaptClusterData = (clusters: any[]) => {
    return clusters.map(cluster => ({
      ...cluster,
      status: cluster.status === 'True' ? 'Ready' : (cluster.status === 'False' ? 'NotReady' : 'Unknown'),
      nodeCount: cluster.status === 'True' ? 1 : 0,
      podCount: cluster.resources?.pod?.allocated || 0,
      availability: cluster.status === 'True' ? 99 : 0,
      displayName: cluster.name,
      loadLevel: cluster.loadLevel || 'medium',
      labels: cluster.labels || {},
      taints: cluster.taints || [],
    }));
  };

  // 获取集群资源数据
  const { data: clustersData, isLoading: clustersLoading, refetch: refetchClusters, error: clustersError } = useQuery({
    queryKey: ['GetClusterResources'],
    queryFn: async () => {
      try {
        const ret = await GetClusterResources({ limit: 100 });
        const adaptedData = {
          ...ret.data,
          clusters: adaptClusterData(ret.data.clusters || [])
        };
        return adaptedData;
      } catch (error) {
        console.error('获取集群资源失败:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // 30秒自动刷新
    retry: 3, // 重试3次
    retryDelay: 1000, // 重试延迟1秒
  });

  // 计算资源使用率
  const cpuUsagePercent = data?.memberClusterStatus?.cpuSummary
    ? Math.round(
        (data.memberClusterStatus.cpuSummary.allocatedCPU /
          data.memberClusterStatus.cpuSummary.totalCPU) *
          100,
      )
    : 0;

  const memoryUsagePercent = data?.memberClusterStatus?.memorySummary
    ? Math.round(
        (data.memberClusterStatus.memorySummary.allocatedMemory /
          data.memberClusterStatus.memorySummary.totalMemory) *
          100,
      )
    : 0;

  const nodeUsagePercent = data?.memberClusterStatus?.nodeSummary
    ? Math.round(
        (data.memberClusterStatus.nodeSummary.readyNum /
          data.memberClusterStatus.nodeSummary.totalNum) *
          100,
      )
    : 0;

  // 获取健康状态
  const getHealthStatus = () => {
    if (data?.karmadaInfo?.status === 'running') {
      return { 
        color: 'success', 
        icon: CheckCircleOutlined, 
        text: '运行中',
        textColor: '#10b981',
      };
    }
    return { 
      color: 'error', 
      icon: AlertOutlined, 
      text: '未知状态',
      textColor: '#ef4444',
    };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="w-full h-full px-[30px] py-[20px] box-border bg-[#FAFBFC]">
      <div className="w-full h-full bg-white box-border p-[12px] overflow-y-scroll">
        <Spin spinning={isLoading} size="large">
          {error ? (
            <div className="error-state" style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#ff4d4f'
            }}>
              <AlertOutlined style={{ fontSize: 64, marginBottom: 24, color: '#ff4d4f' }} />
              <Title level={3} style={{ color: '#ff4d4f', marginBottom: 12 }}>系统数据加载失败</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 16 }}>
                服务器响应错误：{error?.message || '500 Internal Server Error'}
              </Text>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                请检查后端服务是否正常运行，或联系系统管理员
              </Text>
              <Button 
                type="primary" 
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                }}
              >
                重新加载数据
              </Button>
            </div>
          ) : (
          <div className="modern-page-container">
            {/* 页面头部 */}
            <div className="page-header-modern" style={{ marginBottom: '16px' }}>
              <div className="header-content">
                <div className="title-section">
                  <Avatar 
                    size={56} 
                    icon={<DashboardOutlined />}
                    style={{ 
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: '3px solid #e5e7eb',
                    }}
                  />
                  <div>
                    <Title level={2} className="page-title" style={{ marginBottom: 4, fontSize: '24px' }}>
                      系统概览
                    </Title>
                    <Paragraph className="page-subtitle" style={{ marginBottom: 0, fontSize: 14 }}>
                      Karmada 多云管理平台运行状态和资源监控
                      <Tag color="blue" style={{ marginLeft: 12 }}>
                        实时监控
                      </Tag>
                    </Paragraph>
                  </div>
                </div>
                <div>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      refetch();
                      refetchClusters();
                    }}
                    size="large"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: 'none',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    }}
                  >
                    刷新数据
                  </Button>
                </div>
              </div>
            </div>

            {/* 主要内容区域 */}
            <Row gutter={[16, 16]} className="content-section" style={{ margin: 0 }}>
              {/* 系统信息卡片 */}
              <Col xs={24} lg={8}>
                              <Card 
                className="modern-card stats-card"
                style={{ height: '100%' }}
                styles={{ body: { padding: '16px' } }}
                  title={
                    <div className="card-header" style={{ marginBottom: 0 }}>
                      <div className="header-icon-wrapper" style={{ width: 32, height: 32, fontSize: 16 }}>
                        <CloudServerOutlined className="header-icon" />
                      </div>
                      <div className="header-text">
                        <Title level={5} className="card-title" style={{ fontSize: '16px', marginBottom: '4px' }}>
                          系统信息
                        </Title>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Karmada 多云管理平台状态</Text>
                      </div>
                    </div>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div className="stat-item gradient-primary" style={{ padding: '12px' }}>
                      <div className="stat-icon" style={{ width: 32, height: 32, fontSize: 14 }}>
                        <CloudServerOutlined />
                      </div>
                      <div className="stat-content">
                        <Text className="stat-label" style={{ fontSize: '12px' }}>Karmada版本</Text>
                        <Text className="stat-value" style={{ fontSize: '16px' }}>
                          {data?.karmadaInfo?.version?.gitVersion || 'v1.8.0'}
                        </Text>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <Tag color="green">稳定版本</Tag>
                      </div>
                    </div>

                    <div className="stat-item gradient-primary" style={{ padding: '12px' }}>
                      <div className="stat-icon" style={{ width: 32, height: 32, fontSize: 14 }}>
                        <healthStatus.icon />
                      </div>
                      <div className="stat-content">
                        <Text className="stat-label" style={{ fontSize: '12px' }}>运行状态</Text>
                        <Text className="stat-value" style={{ fontSize: '16px', color: healthStatus.textColor }}>
                          {healthStatus.text}
                        </Text>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <Badge status={healthStatus.color as any} text="系统正常" />
                      </div>
                    </div>

                    <div className="stat-item gradient-primary" style={{ padding: '12px' }}>
                      <div className="stat-icon" style={{ width: 32, height: 32, fontSize: 14 }}>
                        <DatabaseOutlined />
                      </div>
                      <div className="stat-content">
                        <Text className="stat-label" style={{ fontSize: '12px' }}>运行时长</Text>
                        <Text className="stat-value" style={{ fontSize: '16px' }}>
                          {(data?.karmadaInfo?.createTime &&
                            dayjs().diff(dayjs(data.karmadaInfo.createTime), 'day')) ||
                            '30'} 天
                        </Text>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {(data?.karmadaInfo?.createTime &&
                            dayjs(data.karmadaInfo.createTime).format('YYYY-MM-DD')) ||
                            '2024-01-01'}
                        </Text>
                      </div>
                    </div>

                    <div className="stat-item gradient-primary" style={{ padding: '12px' }}>
                      <div className="stat-icon" style={{ width: 32, height: 32, fontSize: 14 }}>
                        <TeamOutlined />
                      </div>
                      <div className="stat-content">
                        <Text className="stat-label" style={{ fontSize: '12px' }}>集群节点</Text>
                        <Text className="stat-value" style={{ fontSize: '16px' }}>
                          {`${data?.memberClusterStatus?.nodeSummary?.readyNum || 0}/${data?.memberClusterStatus?.nodeSummary?.totalNum || 0}`}
                        </Text>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <Progress 
                          percent={nodeUsagePercent} 
                          size="default" 
                          strokeColor="#a855f7"
                          style={{ width: 130, marginLeft: 16 }}
                        />
                      </div>
                    </div>

                    <div className="stat-item gradient-primary" style={{ padding: '12px' }}>
                      <div className="stat-content">
                        {/* 欢迎的图标和文字 */}
                        <Text className="stat-value" style={{ fontSize: '16px', color: '#4f46e5', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                          <DashboardOutlined style={{ marginRight: 8, fontSize: 20 }} />
                          <span style={{ fontSize: 16, fontWeight: 500 }}>Karmada管理员，欢迎回来！</span>
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* 右侧区域 */}
              <Col xs={24} lg={16}>
                <Row gutter={[0, 16]} style={{ height: '100%' }}>
                  {/* 集群资源使用情况 */}
                  <Col span={24}>
                    <Card 
                      className="modern-card chart-card" 
                      styles={{ body: { padding: '16px' } }}
                      title={
                        <div className="card-header" style={{ marginBottom: 0 }}>
                          <div className="header-icon-wrapper" style={{ width: 32, height: 32, fontSize: 16 }}>
                            <BarChartOutlined className="header-icon" />
                          </div>
                          <div className="header-text">
                            <Title level={5} className="card-title" style={{ fontSize: '16px', marginBottom: '4px' }}>
                              集群资源使用情况
                            </Title>
                            <Text type="secondary" style={{ fontSize: '12px' }}>实时监控集群资源分配状态</Text>
                          </div>
                        </div>
                      }
                      extra={
                        <Tag color="green" icon={<ThunderboltOutlined />}>
                          实时数据
                        </Tag>
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div className="resource-item" style={{ padding: '12px' }}>
                          <div className="resource-header">
                            <Space>
                              <ThunderboltOutlined className="resource-icon cpu" />
                              <Text strong className="resource-label" style={{ fontSize: '14px' }}>CPU 使用率</Text>
                              <Tag color="blue">{cpuUsagePercent}%</Tag>
                            </Space>
                            <Text className="resource-value" style={{ fontSize: '12px' }}>
                              {data?.memberClusterStatus?.cpuSummary?.allocatedCPU?.toFixed(2) || 0} / 
                              {data?.memberClusterStatus?.cpuSummary?.totalCPU || 0} Cores
                            </Text>
                          </div>
                          <Progress
                            percent={cpuUsagePercent}
                            strokeColor={{ '0%': '#4f46e5', '100%': '#7c3aed' }}
                            trailColor="#f3f4f6"
                            className="modern-progress"
                            size="default"
                            showInfo={false}
                          />
                        </div>

                        <div className="resource-item" style={{ padding: '12px' }}>
                          <div className="resource-header">
                            <Space>
                              <DatabaseOutlined className="resource-icon memory" />
                              <Text strong className="resource-label" style={{ fontSize: '14px' }}>内存使用率</Text>
                              <Tag color="green">{memoryUsagePercent}%</Tag>
                            </Space>
                            <Text className="resource-value" style={{ fontSize: '12px' }}>
                              {data?.memberClusterStatus?.memorySummary?.allocatedMemory ? 
                                (data.memberClusterStatus.memorySummary.allocatedMemory / 1024 / 1024 / 1024).toFixed(2) : 0}GB / 
                              {data?.memberClusterStatus?.memorySummary?.totalMemory ? 
                                (data.memberClusterStatus.memorySummary.totalMemory / 1024 / 1024 / 1024).toFixed(0) : 0}GB
                            </Text>
                          </div>
                          <Progress
                            percent={memoryUsagePercent}
                            strokeColor={{ '0%': '#10b981', '100%': '#059669' }}
                            trailColor="#f3f4f6"
                            className="modern-progress"
                            size="default"
                            showInfo={false}
                          />
                        </div>
                      </Space>
                    </Card>
                  </Col>

                  {/* 策略与资源统计 */}
                  <Col span={24}>
                    <Card 
                      className="modern-card stats-card"
                      styles={{ body: { padding: '12px' } }}
                      title={
                        <div className="card-header" style={{ marginBottom: 0 }}>
                          <div className="header-icon-wrapper" style={{ width: 32, height: 32, fontSize: 16 }}>
                            <SafetyOutlined className="header-icon" />
                          </div>
                          <div className="header-text">
                            <Title level={5} className="card-title" style={{ fontSize: '16px', marginBottom: '4px' }}>
                              策略与资源统计
                            </Title>
                            <Text type="secondary" style={{ fontSize: '12px' }}>多云策略配置和资源分布状态</Text>
                          </div>
                        </div>
                      }
                      extra={
                        <Statistic 
                          title="总资源数" 
                          value={
                            (data?.clusterResourceStatus?.namespaceNum || 0) +
                            (data?.clusterResourceStatus?.workloadNum || 0) +
                            (data?.clusterResourceStatus?.serviceNum || 0) +
                            (data?.clusterResourceStatus?.configNum || 0)
                          }
                          prefix={<DatabaseOutlined />}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      }
                    >
                      <Row gutter={[8, 8]}>
                        <Col xs={12} sm={8} md={4}>
                          <div className="stat-item gradient-primary" style={{ padding: '8px' }}>
                            <div className="stat-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
                              <SettingOutlined />
                            </div>
                            <div className="stat-content">
                              <Text className="stat-label" style={{ fontSize: '11px' }}>调度策略</Text>
                              <Text className="stat-value" style={{ fontSize: '14px' }}>
                                {data?.clusterResourceStatus?.propagationPolicyNum || 0}
                              </Text>
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                          <div className="stat-item gradient-success" style={{ padding: '8px' }}>
                            <div className="stat-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
                              <SettingOutlined />
                            </div>
                            <div className="stat-content">
                              <Text className="stat-label" style={{ fontSize: '11px' }}>差异化策略</Text>
                              <Text className="stat-value" style={{ fontSize: '14px' }}>
                                {data?.clusterResourceStatus?.overridePolicyNum || 0}
                              </Text>
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                          <div className="stat-item gradient-primary" style={{ padding: '8px' }}>
                            <div className="stat-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
                              <DatabaseOutlined />
                            </div>
                            <div className="stat-content">
                              <Text className="stat-label" style={{ fontSize: '11px' }}>命名空间</Text>
                              <Text className="stat-value" style={{ fontSize: '14px' }}>
                                {data?.clusterResourceStatus?.namespaceNum || 0}
                              </Text>
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                          <div className="stat-item gradient-success" style={{ padding: '8px' }}>
                            <div className="stat-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
                              <ClusterOutlined />
                            </div>
                            <div className="stat-content">
                              <Text className="stat-label" style={{ fontSize: '11px' }}>工作负载</Text>
                              <Text className="stat-value" style={{ fontSize: '14px' }}>
                                {data?.clusterResourceStatus?.workloadNum || 0}
                              </Text>
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                          <div className="stat-item gradient-primary" style={{ padding: '8px' }}>
                            <div className="stat-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
                              <CloudServerOutlined />
                            </div>
                            <div className="stat-content">
                              <Text className="stat-label" style={{ fontSize: '11px' }}>服务路由</Text>
                              <Text className="stat-value" style={{ fontSize: '14px' }}>
                                {data?.clusterResourceStatus?.serviceNum || 0}
                              </Text>
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} sm={8} md={4}>
                          <div className="stat-item gradient-success" style={{ padding: '8px' }}>
                            <div className="stat-icon" style={{ width: 28, height: 28, fontSize: 12 }}>
                              <SafetyOutlined />
                            </div>
                            <div className="stat-content">
                              <Text className="stat-label" style={{ fontSize: '11px' }}>配置秘钥</Text>
                              <Text className="stat-value" style={{ fontSize: '14px' }}>
                                {data?.clusterResourceStatus?.configNum || 0}
                              </Text>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* 集群资源视图 */}
            <div className="cluster-resources-section" style={{ marginTop: '24px' }}>
              <Card 
                className="modern-card"
                style={{ marginBottom: 0 }}
                styles={{ body: { padding: '24px' } }}
                title={
                  <div className="card-header" style={{ marginBottom: 0 }}>
                    <div className="header-icon-wrapper" style={{ width: 32, height: 32, fontSize: 16 }}>
                      <ClusterOutlined className="header-icon" />
                    </div>
                    <div className="header-text">
                      <Title level={4} className="card-title" style={{ fontSize: '18px', marginBottom: '4px' }}>
                        集群资源视图
                      </Title>
                      <Text type="secondary" style={{ fontSize: '14px' }}>实时监控多云环境中的集群状态和资源使用情况</Text>
                    </div>
                  </div>
                }
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* 集群统计信息 */}
                    {clustersData?.clusters && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '16px' }}>
                        <Text style={{ fontSize: '12px', color: '#666' }}>
                          总计: <strong>{clustersData.clusters.length}</strong>
                        </Text>
                        <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                          健康: <strong>{clustersData.clusters.filter(c => c.status === 'Ready').length}</strong>
                        </Text>
                        {clustersData.clusters.filter(c => c.status !== 'Ready').length > 0 && (
                          <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>
                            异常: <strong>{clustersData.clusters.filter(c => c.status !== 'Ready').length}</strong>
                          </Text>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                      <div style={{ width: 8, height: 8, backgroundColor: '#52c41a', borderRadius: '50%' }}></div>
                      <span>健康</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                      <div style={{ width: 8, height: 8, backgroundColor: '#faad14', borderRadius: '50%' }}></div>
                      <span>警告</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                      <div style={{ width: 8, height: 8, backgroundColor: '#ff4d4f', borderRadius: '50%' }}></div>
                      <span>异常</span>
                    </div>
                    <Button 
                      type="default" 
                      icon={<ReloadOutlined />}
                      onClick={() => refetchClusters()}
                      style={{ borderRadius: 6 }}
                    >
                      刷新
                    </Button>
                  </div>
                }
              >
                <Spin spinning={clustersLoading}>
                  {clustersError ? (
                    <div className="error-state" style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#ff4d4f'
                    }}>
                      <AlertOutlined style={{ fontSize: 48, marginBottom: 16, color: '#ff4d4f' }} />
                      <Title level={4} style={{ color: '#ff4d4f', marginBottom: 8 }}>集群数据加载失败</Title>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        服务器响应错误：{clustersError?.message || '500 Internal Server Error'}
                      </Text>
                      <Button 
                        type="primary" 
                        icon={<ReloadOutlined />}
                        onClick={() => refetchClusters()}
                      >
                        重新加载
                      </Button>
                    </div>
                  ) : clustersData?.clusters && clustersData.clusters.length > 0 ? (
                    <Row gutter={[16, 16]}>
                      {clustersData.clusters.map((cluster) => (
                        <Col xs={24} sm={12} lg={8} xl={6} key={cluster.name}>
                          <ClusterCard cluster={cluster} />
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="empty-state" style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#999'
                    }}>
                      <ClusterOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
                      <Title level={4} style={{ color: '#999', marginBottom: 8 }}>暂无集群数据</Title>
                      <Text type="secondary">请稍后再试或联系管理员</Text>
                    </div>
                  )}
                </Spin>
              </Card>
            </div>
          </div>
          )}
        </Spin>
      </div>
    </div>
  );
};

export default Overview;

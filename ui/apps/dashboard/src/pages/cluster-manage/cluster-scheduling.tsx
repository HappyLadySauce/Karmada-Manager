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

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Table, 
  Tag, 
  Space, 
  Statistic, 
  Row, 
  Col, 
  Descriptions,
  List,
  Badge,
  Tooltip,
  Alert,
  Typography,
  Collapse,
  Button,
  Flex,
  Tree
} from 'antd';
import { 
  ClusterOutlined, 
  DatabaseOutlined, 
  CheckCircleOutlined, 
  LoadingOutlined,
  ExclamationCircleOutlined,
  NodeIndexOutlined,
  ContainerOutlined,
  DesktopOutlined,
  RocketOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  FolderOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import '@/styles/tech-theme.css';
import ScrollContainer from '@/components/common/ScrollContainer';
import type { ColumnsType } from 'antd/es/table';
import {
  GetSchedulingOverview,
  GetNamespaceWorkloadsScheduling,
  GetPreciseSchedulingInfo,
  type SchedulingOverview,
  type WorkloadSchedulingView,
  type PreciseSchedulingInfo,
  type WorkloadInfo,
  type PreciseClusterPlacement,
  type NodePlacement,
  type PodDetail
} from '../../services/scheduling';
import { WorkloadKind } from '../../services/base';

const { TabPane } = Tabs;
const { Title } = Typography;
const { Panel } = Collapse;
const { TreeNode } = Tree;

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Scheduled': return 'success';
    case 'Pending': return 'warning';
    case 'Failed': return 'error';
    default: return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Scheduled': return <CheckCircleOutlined />;
    case 'Pending': return <LoadingOutlined />;
    case 'Failed': return <ExclamationCircleOutlined />;
    default: return null;
  }
};

// 构建集群分布树形数据
const buildClusterDistributionTreeData = (clusterPlacements: PreciseClusterPlacement[]) => {
  return clusterPlacements.map((cluster, clusterIndex) => ({
    title: (
      <div className="flex items-center justify-between w-full">
        <Space>
          <ClusterOutlined style={{ color: 'var(--tech-primary)' }} />
          <span className="font-semibold">{cluster.clusterName}</span>
          <Tag color="blue">副本: {cluster.actualReplicas}/{cluster.plannedReplicas}</Tag>
          <Badge 
            status={cluster.clusterStatus === 'Ready' ? 'success' : 'error'} 
            text={cluster.clusterStatus} 
          />
        </Space>
        <Typography.Text type="secondary" className="mr-4">
          {cluster.reason}
        </Typography.Text>
      </div>
    ),
    key: `cluster-${clusterIndex}`,
    icon: <FolderOutlined />,
    children: cluster.nodePlacements?.map((node, nodeIndex) => ({
      title: (
        <div className="flex items-center justify-between w-full">
          <Space>
            <DesktopOutlined style={{ color: 'var(--warning-color)' }} />
            <span className="font-medium">{node.nodeName}</span>
            <Tag color="green">{[...new Set(node.nodeRoles)].join(', ')}</Tag>
            <Badge 
              status={node.nodeStatus === 'Ready' ? 'success' : 'error'} 
              text={node.nodeStatus}
            />
          </Space>
          <Space className="mr-4">
            <Typography.Text type="secondary">
              IP: {node.nodeIP}
            </Typography.Text>
            <Typography.Text type="secondary">
              Pods: {node.runningPods}/{node.podCount}
            </Typography.Text>
          </Space>
        </div>
      ),
      key: `cluster-${clusterIndex}-node-${nodeIndex}`,
      icon: <DesktopOutlined />,
      children: node.podDetails?.map((pod, podIndex) => ({
        title: (
          <div className="flex items-center justify-between w-full">
            <Space>
              <ContainerOutlined style={{ color: 'var(--success-color)' }} />
              <span>{pod.podName}</span>
              <Tag color={pod.podStatus === 'Running' ? 'success' : 'warning'}>
                {pod.podStatus}
              </Tag>
              <Typography.Text type="secondary">
                IP: {pod.podIP}
              </Typography.Text>
            </Space>
            <Space className="mr-4">
              <Typography.Text type="secondary">
                重启: {pod.restartCount}次
              </Typography.Text>
              <Typography.Text type="secondary">
                创建: {new Date(pod.createdTime).toLocaleString()}
              </Typography.Text>
            </Space>
          </div>
        ),
        key: `cluster-${clusterIndex}-node-${nodeIndex}-pod-${podIndex}`,
        icon: <ContainerOutlined />,
        isLeaf: true
      })) || []
    })) || []
  }));
};

const ClusterSchedulingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<SchedulingOverview | null>(null);
  const [workloads, setWorkloads] = useState<WorkloadSchedulingView[]>([]);
  const [selectedWorkload, setSelectedWorkload] = useState<PreciseSchedulingInfo | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, workloadsData] = await Promise.all([
        GetSchedulingOverview(),
        GetNamespaceWorkloadsScheduling({ namespace: 'test' })
      ]);
      setOverview(overviewData.data);
      setWorkloads(workloadsData.data.data);
    } catch (error) {
      console.error('Failed to load scheduling data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载工作负载详情
  const loadWorkloadDetail = async (namespace: string, name: string, kind: string) => {
    try {
      const detailData = await GetPreciseSchedulingInfo({ 
        namespace, 
        name, 
        kind: kind as WorkloadKind 
      });
      setSelectedWorkload(detailData.data);
      setActiveTab('detail');
    } catch (error) {
      console.error('Failed to load workload detail:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 工作负载列表表格列
  const workloadColumns: ColumnsType<WorkloadSchedulingView> = [
    {
      title: '工作负载',
      dataIndex: ['workloadInfo', 'name'],
      key: 'name',
      render: (name: string, record: WorkloadSchedulingView) => (
        <Space>
          <ContainerOutlined />
          <div>
            <Typography.Text strong>{name}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{record.workloadInfo.kind}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: '命名空间',
      dataIndex: ['workloadInfo', 'namespace'],
      key: 'namespace',
      render: (namespace: string) => <Tag color="blue">{namespace}</Tag>,
    },
    {
      title: '副本状态',
      key: 'replicas',
      render: (_, record: WorkloadSchedulingView) => {
        const readyReplicas = record.workloadInfo.readyReplicas || 0;
        const totalReplicas = record.workloadInfo.replicas || 0;
        
        return (
          <Typography.Text>
            {readyReplicas} / {totalReplicas}
          </Typography.Text>
        );
      },
    },
    {
      title: '调度状态',
      key: 'status',
      render: (_, record: WorkloadSchedulingView) => (
        <Tag 
          color={getStatusColor(record.schedulingStatus.phase)}
          icon={getStatusIcon(record.schedulingStatus.phase)}
        >
          {record.schedulingStatus.phase}
        </Tag>
      ),
    },
    {
      title: '集群分布',
      key: 'clusters',
      render: (_, record: WorkloadSchedulingView) => (
        <Space wrap>
          {record.clusterPlacements.map((cluster) => (
            <Tag key={cluster.clusterName} color="green">
              {cluster.clusterName}: {cluster.actualReplicas}个
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: WorkloadSchedulingView) => (
        <Button
          type="link"
          size="small"
          style={{ 
            color: 'var(--tech-primary)',
            padding: 0,
            height: 'auto'
          }}
          onClick={() => loadWorkloadDetail(
            record.workloadInfo.namespace,
            record.workloadInfo.name,
            record.workloadInfo.kind
          )}
        >
          查看详情
        </Button>
      ),
    },
  ];

  // 渲染概览统计
  const renderOverview = () => (
    <div>
      {/* 统计信息卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={6}>
          <div className="tech-card tech-hover-scale">
            <div className="flex items-center justify-between mb-4">
              <AppstoreOutlined 
                className="text-3xl"
                style={{ color: 'var(--tech-primary)' }}
              />
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2 tech-hologram-text"
                style={{ color: 'var(--tech-primary)' }}
              >
                {overview?.totalWorkloads || 0}
              </div>
              <Typography.Text className="text-gray-600 font-semibold uppercase tracking-wide">
                总工作负载
              </Typography.Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className="tech-card tech-hover-scale">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: 'var(--success-color)' }}
              />
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2 tech-hologram-text"
                style={{ color: 'var(--success-color)' }}
              >
                {overview?.scheduledWorkloads || 0}
              </div>
              <Typography.Text className="text-gray-600 font-semibold uppercase tracking-wide">
                已调度
              </Typography.Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className="tech-card tech-hover-scale">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: 'var(--warning-color)' }}
              />
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2 tech-hologram-text"
                style={{ color: 'var(--warning-color)' }}
              >
                {overview?.pendingWorkloads || 0}
              </div>
              <Typography.Text className="text-gray-600 font-semibold uppercase tracking-wide">
                待调度
              </Typography.Text>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className="tech-card tech-hover-scale">
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: 'var(--error-color)' }}
              />
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold mb-2 tech-hologram-text"
                style={{ color: 'var(--error-color)' }}
              >
                {overview?.failedWorkloads || 0}
              </div>
              <Typography.Text className="text-gray-600 font-semibold uppercase tracking-wide">
                调度失败
              </Typography.Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* 集群分布和命名空间统计 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={12}>
          <div className="tech-card">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
                集群分布
              </Title>
              <ClusterOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
            </div>
            <List
              dataSource={overview?.clusterDistribution || []}
              renderItem={(cluster) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Badge status={cluster.clusterStatus === 'Ready' ? 'success' : 'error'} />
                        <Typography.Text strong>{cluster.clusterName}</Typography.Text>
                      </Space>
                      <Typography.Text type="secondary">{cluster.workloadCount} 个工作负载</Typography.Text>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Typography.Text type="secondary">
                        副本: {cluster.readyReplicas}/{cluster.totalReplicas}
                      </Typography.Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="tech-card">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
                命名空间统计
              </Title>
              <DatabaseOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
            </div>
            <List
              dataSource={overview?.namespaceStats || []}
              renderItem={(ns) => (
                <List.Item>
                  <Space>
                    <Tag color="blue">{ns.namespace}</Tag>
                    <Typography.Text>总计: {ns.workloadCount}</Typography.Text>
                    <Typography.Text style={{ color: 'var(--success-color)' }}>调度: {ns.scheduledCount}</Typography.Text>
                    <Typography.Text style={{ color: 'var(--warning-color)' }}>待调度: {ns.pendingCount}</Typography.Text>
                    <Typography.Text style={{ color: 'var(--error-color)' }}>失败: {ns.failedCount}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        </Col>
      </Row>

      {/* 集群调度列表 - 工作负载列表 */}
      <div className="tech-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
              集群调度列表
            </Title>
            <Typography.Text type="secondary">
              显示工作负载在多集群中的调度情况，包括副本状态和调度详情
            </Typography.Text>
          </div>
          <NodeIndexOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
        </div>
        <Alert
          message="工作负载调度分布"
          description="点击查看详情可查看节点级Pod分布。"
          type="info"
          style={{ marginBottom: 16 }}
        />
        <div className="tech-table">
          <Table
            columns={workloadColumns}
            dataSource={workloads}
            loading={loading}
            rowKey={(record) => `${record.workloadInfo.namespace}-${record.workloadInfo.name}`}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </div>
    </div>
  );





  // 渲染详情视图
  const renderDetail = () => {
    if (!selectedWorkload) {
      return (
        <div className="tech-card">
          <Alert
            message="请选择工作负载"
            description="从拓扑视图中选择一个工作负载来查看详细的调度信息。"
            type="info"
          />
        </div>
      );
    }

    return (
      <div>
        {/* 使用左右分布布局 */}
        <Row gutter={[24, 24]}>
          {/* 左侧：集群分布详情 - 占更大空间 */}
          <Col xs={24} lg={16}>
            <div className="tech-card" style={{ height: 'auto', minHeight: '600px' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
                    🏗️ 集群分布详情
                  </Title>
                  <Typography.Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
                    树形展示：集群 → 节点 → Pod，直观查看多层级分布
                  </Typography.Text>
                  {selectedWorkload.clusterPlacements && (
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Tag color="blue">
                          {selectedWorkload.clusterPlacements.length} 个集群
                        </Tag>
                        <Tag color="green">
                          {selectedWorkload.clusterPlacements.reduce((sum, cluster) => 
                            sum + (cluster.nodePlacements?.length || 0), 0
                          )} 个节点
                        </Tag>
                        <Tag color="orange">
                          {selectedWorkload.clusterPlacements.reduce((sum, cluster) => 
                            sum + (cluster.nodePlacements?.reduce((nodeSum, node) => 
                              nodeSum + (node.podDetails?.length || 0), 0) || 0), 0
                          )} 个Pod
                        </Tag>
                      </Space>
                    </div>
                  )}
                </div>
                <ClusterOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
              </div>
              
              {selectedWorkload.clusterPlacements && selectedWorkload.clusterPlacements.length > 0 ? (
                <div 
                  className="tech-tree-container" 
                  style={{ 
                    padding: '20px', 
                    backgroundColor: 'rgba(0, 255, 255, 0.02)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    position: 'relative'
                  }}
                >
                  <Tree
                    showIcon
                    showLine={{ showLeafIcon: false }}
                    defaultExpandAll
                    treeData={buildClusterDistributionTreeData(selectedWorkload.clusterPlacements)}
                    className="custom-tree-lines"
                    style={{
                      background: 'transparent',
                      fontSize: '14px',
                      color: 'var(--text-color)',
                    }}
                    switcherIcon={({ expanded, isLeaf }) => {
                      if (isLeaf) return null;
                      return expanded ? (
                        <FolderOpenOutlined style={{ color: 'var(--tech-primary)' }} />
                      ) : (
                        <FolderOutlined style={{ color: 'var(--tech-primary)' }} />
                      );
                    }}
                  />
                  
                  {/* 自定义树形连接线样式 */}
                  <style>{`
                    .custom-tree-lines .ant-tree-switcher {
                      background: transparent !important;
                    }
                    
                    .custom-tree-lines .ant-tree-line::before {
                      border-left: 1px dashed var(--tech-primary) !important;
                    }
                    
                    .custom-tree-lines .ant-tree-line::after {
                      border-bottom: 1px dashed var(--tech-primary) !important;
                    }
                    
                    .custom-tree-lines .ant-tree-treenode {
                      padding: 4px 0;
                    }
                    
                    .custom-tree-lines .ant-tree-node-content-wrapper {
                      border-radius: 6px;
                      transition: all 0.3s ease;
                      padding: 4px 8px;
                      width: 100%;
                    }
                    
                    .custom-tree-lines .ant-tree-node-content-wrapper:hover {
                      background-color: rgba(0, 255, 255, 0.1) !important;
                      box-shadow: 0 2px 8px rgba(0, 255, 255, 0.2);
                    }
                    
                    .custom-tree-lines .ant-tree-treenode-selected .ant-tree-node-content-wrapper {
                      background-color: rgba(0, 255, 255, 0.15) !important;
                    }
                  `}</style>
                </div>
              ) : (
                <Alert 
                  message="暂无集群分布信息" 
                  description="工作负载尚未调度到任何集群或调度信息未加载完成"
                  type="info" 
                  style={{ margin: '16px 0' }}
                />
              )}
            </div>
          </Col>

          {/* 右侧：工作负载详情和传播策略 */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 工作负载基本信息 */}
              <div className="tech-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <RocketOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
                    <Title level={5} style={{ margin: 0, color: 'var(--text-color)' }}>
                      工作负载详情
                    </Title>
                  </div>
                </div>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="名称">
                    <Typography.Text strong>{selectedWorkload.workloadInfo.name}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="命名空间">
                    <Tag color="blue">{selectedWorkload.workloadInfo.namespace}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="类型">
                    <Tag color="purple">{selectedWorkload.workloadInfo.kind}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="API版本">
                    <Typography.Text type="secondary">{selectedWorkload.workloadInfo.apiVersion}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="总副本数">
                    <Typography.Text strong style={{ color: 'var(--tech-primary)' }}>
                      {selectedWorkload.totalReplicas}
                    </Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="就绪副本数">
                    <Typography.Text strong style={{ color: 'var(--success-color)' }}>
                      {selectedWorkload.readyReplicas}
                    </Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="调度状态">
                    <Tag color={getStatusColor(selectedWorkload.schedulingStatus.phase)}>
                      {selectedWorkload.schedulingStatus.phase}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="状态消息">
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                      {selectedWorkload.schedulingStatus.message}
                    </Typography.Text>
                  </Descriptions.Item>
                </Descriptions>
              </div>

              {/* 传播策略信息 */}
              {selectedWorkload.propagationPolicy && (
                <div className="tech-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <DesktopOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
                      <Title level={5} style={{ margin: 0, color: 'var(--text-color)' }}>
                        传播策略
                      </Title>
                    </div>
                  </div>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="策略名称">
                      <Typography.Text strong>{selectedWorkload.propagationPolicy.name}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="调度类型">
                      <Tag color="orange">
                        {selectedWorkload.propagationPolicy.placement?.replicaScheduling?.replicaSchedulingType || 'N/A'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="目标集群">
                      <Space wrap size="small">
                        {selectedWorkload.propagationPolicy.clusterAffinity?.clusterNames?.map((cluster: string) => (
                          <Tag key={cluster} color="green">{cluster}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}
            </Space>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <ScrollContainer
      height="100vh"
      padding="0"
      background="transparent"
    >
      <div className="tech-background min-h-screen">
        {/* 粒子背景效果 */}
        <div className="tech-particles-container">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="tech-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6">
          {/* 页面标题 */}
          <div className="mb-8">
            <Title 
              level={1} 
              className="tech-hologram-text m-0 text-4xl font-bold"
              style={{ color: 'var(--tech-primary)' }}
            >
              🏗️ CLUSTER SCHEDULING
            </Title>
            <Typography.Text className="text-gray-600 text-lg">
              Karmada多集群工作负载调度监控中心
            </Typography.Text>
          </div>

          {/* 操作和控制区域 */}
          <div className="tech-card mb-6">
            <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
              <div>
                <Title level={3} style={{ margin: 0, color: 'var(--text-color)' }}>
                  集群调度概览
                </Title>
                <Typography.Text type="secondary">
                  实时监控工作负载在多集群中的调度情况
                </Typography.Text>
              </div>
                          <Button 
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
              style={{
                borderColor: 'var(--tech-primary)',
                color: 'var(--tech-primary)',
              }}
            >
              刷新
            </Button>
            </Flex>
          </div>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            className="tech-tabs"
          >
            <TabPane tab="概览" key="overview">
              {renderOverview()}
            </TabPane>
            <TabPane tab="详细信息" key="detail">
              {renderDetail()}
            </TabPane>
          </Tabs>
        </div>
      </div>
    </ScrollContainer>
  );
};

export default ClusterSchedulingPage; 
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
  Tabs, 
  Table, 
  Tag, 
  Space, 
  Row, 
  Col, 
  Descriptions,
  List,
  Badge,
  Alert,
  Typography,
  Button,
  Flex,
  Tree,
  Modal,
  Progress,
  Divider
} from 'antd';
import { useLoading } from '@/components/loading';
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
  FolderOpenOutlined,
  InfoCircleOutlined,
  CloudServerOutlined,

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
  type PreciseClusterPlacement
} from '../../services/scheduling';
import { WorkloadKind } from '../../services/base';

const { Title } = Typography;

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
const buildClusterDistributionTreeData = (
  clusterPlacements: PreciseClusterPlacement[], 
  onNodeClick?: (nodeData: any) => void,
  onPodClick?: (podData: any, nodeData: any, clusterData: any) => void
) => {
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
          <div 
            className="flex items-center w-full cursor-pointer hover:bg-blue-50 p-1 rounded" 
            style={{ justifyContent: 'space-between' }}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.({
                ...node,
                clusterName: cluster.clusterName,
                clusterStatus: cluster.clusterStatus
              });
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="font-medium">{node.nodeName}</span>
              <Tag color="green">{[...new Set(node.nodeRoles)].join(', ')}</Tag>
              <div style={{ marginLeft: '24px' }}>
                <Badge 
                  status={node.nodeStatus === 'Ready' ? 'success' : 'error'} 
                  text={node.nodeStatus}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginRight: '16px' }}>
              <Typography.Text type="secondary">
                IP: {node.nodeIP}
              </Typography.Text>
              <Typography.Text type="secondary">
                Pods: {node.runningPods}/{node.podCount}
              </Typography.Text>
              <Button 
                type="link" 
                size="small" 
                icon={<InfoCircleOutlined />}
                style={{ padding: 0 }}
              >
                详情
              </Button>
            </div>
          </div>
        ),
        key: `cluster-${clusterIndex}-node-${nodeIndex}`,
        icon: <DesktopOutlined style={{ color: 'var(--warning-color)' }} />,
              children: node.podDetails?.map((pod, podIndex) => ({
          title: (
            <div 
              className="flex items-center justify-between w-full cursor-pointer hover:bg-green-50 p-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onPodClick?.(pod, node, cluster);
              }}
            >
              <Space size="middle">
                <span>{pod.podName}</span>
                <Tag color={pod.podStatus === 'Running' ? 'success' : 'warning'}>
                  {pod.podStatus}
                </Tag>
              </Space>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginRight: '16px' }}>
                <Typography.Text type="secondary">
                  IP: {pod.podIP}
                </Typography.Text>
                <Typography.Text type="secondary">
                  重启: {pod.restartCount}次
                </Typography.Text>
                <Typography.Text type="secondary">
                  创建: {new Date(pod.createdTime).toLocaleString()}
                </Typography.Text>
                <Button 
                  type="link" 
                  size="small" 
                  icon={<InfoCircleOutlined />}
                  style={{ padding: 0, color: 'var(--success-color)' }}
                >
                  详情
                </Button>
              </div>
            </div>
          ),
          key: `cluster-${clusterIndex}-node-${nodeIndex}-pod-${podIndex}`,
          icon: <ContainerOutlined style={{ color: 'var(--success-color)' }} />,
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
  const [nodeDetailVisible, setNodeDetailVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [podDetailVisible, setPodDetailVisible] = useState(false);
  const [selectedPod, setSelectedPod] = useState<any>(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all'); // 新增：资源类型过滤器
  const { showLoading, hideLoading } = useLoading();

  // 加载数据（带简单加载提示）
  const loadDataWithCustomLoading = async () => {
    showLoading({
      message: '正在刷新数据',
      description: '请稍候...',
      showProgress: false
    });
    
    // 实际的数据加载
    await loadData();
    
    // 加载完成后隐藏提示
    hideLoading();
  };

  // 原始加载数据方法
  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData] = await Promise.all([
        GetSchedulingOverview()
      ]);
      setOverview(overviewData.data);
      
      // 从概览数据中获取所有命名空间，然后加载调度资源数据
      const namespaces = overviewData.data?.namespaceStats?.map(ns => ns.namespace) || ['default'];
      
      // 尝试从多个命名空间加载数据
      const workloadPromises = namespaces.map(namespace => 
        GetNamespaceWorkloadsScheduling({ namespace }).catch(err => {
          console.warn(`Failed to load resources for namespace ${namespace}:`, err);
          return { data: { data: [] } };
        })
      );
      
      const workloadResults = await Promise.all(workloadPromises);
      const allWorkloads = workloadResults.flatMap(result => result.data?.data || []);
      
      setWorkloads(allWorkloads);
      
      // 如果没有数据，尝试加载默认命名空间
      if (allWorkloads.length === 0) {
        try {
          const defaultWorkloadData = await GetNamespaceWorkloadsScheduling({ namespace: 'default' });
          setWorkloads(defaultWorkloadData.data?.data || []);
        } catch (err) {
          console.warn('Failed to load default namespace resources:', err);
        }
      }
    } catch (error) {
      console.error('Failed to load scheduling data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载调度资源详情
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
      console.error('Failed to load resource detail:', error);
    }
  };

  // 处理节点点击事件
  const handleNodeClick = (nodeData: any) => {
    setSelectedNode(nodeData);
    setNodeDetailVisible(true);
  };

  // 关闭节点详情模态框
  const handleNodeDetailClose = () => {
    setNodeDetailVisible(false);
    setSelectedNode(null);
  };

  // 处理Pod点击事件
  const handlePodClick = (podData: any, nodeData: any, clusterData: any) => {
    setSelectedPod({
      ...podData,
      nodeName: nodeData.nodeName,
      nodeIP: nodeData.nodeIP,
      clusterName: clusterData.clusterName
    });
    setPodDetailVisible(true);
  };

  // 关闭Pod详情模态框
  const handlePodDetailClose = () => {
    setPodDetailVisible(false);
    setSelectedPod(null);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 获取资源类型分类
  const getResourceCategory = (kind: string) => {
    const workloadTypes = ['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'ReplicaSet', 'Pod'];
    const serviceTypes = ['Service', 'Ingress', 'EndpointSlice'];
    const configTypes = ['ConfigMap', 'Secret', 'PersistentVolumeClaim'];
    
    if (workloadTypes.includes(kind)) return '工作负载';
    if (serviceTypes.includes(kind)) return '服务';
    if (configTypes.includes(kind)) return '配置';
    return '其他';
  };

  // 获取资源类型图标
  const getResourceIcon = (kind: string) => {
    const category = getResourceCategory(kind);
    switch (category) {
      case '工作负载': return <ContainerOutlined style={{ color: 'var(--tech-primary)' }} />;
      case '服务': return <CloudServerOutlined style={{ color: 'var(--success-color)' }} />;
      case '配置': return <DatabaseOutlined style={{ color: 'var(--warning-color)' }} />;
      default: return <AppstoreOutlined style={{ color: 'var(--text-color)' }} />;
    }
  };

  // 获取资源类型颜色
  const getResourceCategoryColor = (kind: string) => {
    const category = getResourceCategory(kind);
    switch (category) {
      case '工作负载': return 'blue';
      case '服务': return 'green';
      case '配置': return 'orange';
      default: return 'default';
    }
  };

  // 过滤数据源
  const filteredWorkloads = React.useMemo(() => {
    if (resourceTypeFilter === 'all') return workloads;
    return workloads.filter(workload => {
      const category = getResourceCategory(workload.workloadInfo.kind);
      return category === resourceTypeFilter;
    });
  }, [workloads, resourceTypeFilter]);

  // 获取资源类型统计
  const getResourceTypeStats = () => {
    const stats = {
      all: workloads.length,
      工作负载: 0,
      服务: 0,
      配置: 0,
      其他: 0
    };
    
    workloads.forEach(workload => {
      const category = getResourceCategory(workload.workloadInfo.kind);
      if (category in stats) {
        (stats as any)[category]++;
      }
    });
    
    return stats;
  };

  // 调度资源列表表格列 - 根据资源类型动态生成
  const getWorkloadColumns = (): ColumnsType<WorkloadSchedulingView> => {
    const baseColumns: ColumnsType<WorkloadSchedulingView> = [
    {
      title: '调度资源',
      dataIndex: ['workloadInfo', 'name'],
      key: 'name',
      render: (name: string, record: WorkloadSchedulingView) => {
        const category = getResourceCategory(record.workloadInfo.kind);
        return (
        <Space>
            {getResourceIcon(record.workloadInfo.kind)}
          <div>
            <Typography.Text strong>{name}</Typography.Text>
            <br />
              <Space size="small">
            <Typography.Text type="secondary">{record.workloadInfo.kind}</Typography.Text>
                <Tag color={getResourceCategoryColor(record.workloadInfo.kind)}>
                  {category}
                </Tag>
              </Space>
          </div>
        </Space>
        );
      },
    },
    {
      title: '命名空间',
      dataIndex: ['workloadInfo', 'namespace'],
      key: 'namespace',
      render: (namespace: string) => <Tag color="blue">{namespace}</Tag>,
    }];

    // 根据资源类型添加特定列
    if (resourceTypeFilter === 'all') {
      // 在全部视图中，添加统一的资源类型列
      baseColumns.push({
        title: '资源类型',
        key: 'resourceType',
        render: (_, record: WorkloadSchedulingView) => {
          const category = getResourceCategory(record.workloadInfo.kind);
          const kind = record.workloadInfo.kind;
          
          // 根据资源类型显示相应信息
          switch (category) {
            case '工作负载':
              return <Tag color="blue">{kind}</Tag>;
            case '服务':
              switch (kind) {
                case 'Service':
                  return <Tag color="green">Service</Tag>;
                case 'Ingress':
                  return <Tag color="cyan">Ingress</Tag>;
                default:
                  return <Tag color="green">{kind}</Tag>;
              }
            case '配置':
              switch (kind) {
                case 'ConfigMap':
                  return <Tag color="orange">配置映射</Tag>;
                case 'Secret':
                  return <Tag color="red">密钥</Tag>;
                case 'PersistentVolumeClaim':
                  return <Tag color="purple">存储卷声明</Tag>;
                default:
                  return <Tag color="orange">{kind}</Tag>;
              }
            default:
              return <Tag color="default">{kind}</Tag>;
          }
        },
      });
      
      // 在全部视图中，添加副本状态列（只对工作负载显示）
      baseColumns.push({
      title: '副本状态',
      key: 'replicas',
      render: (_, record: WorkloadSchedulingView) => {
          const category = getResourceCategory(record.workloadInfo.kind);
          if (category !== '工作负载') {
            return <Typography.Text type="secondary">-</Typography.Text>;
          }
          
        const readyReplicas = record.workloadInfo.readyReplicas || 0;
        const totalReplicas = record.workloadInfo.replicas || 0;
        
        return (
          <Typography.Text>
            {readyReplicas} / {totalReplicas}
          </Typography.Text>
        );
      },
      });
    } else if (resourceTypeFilter === '工作负载') {
      baseColumns.push({
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
      });
    } else if (resourceTypeFilter === '服务') {
      baseColumns.push({
        title: '服务类型',
        key: 'serviceType',
        render: (_, record: WorkloadSchedulingView) => {
          const kind = record.workloadInfo.kind;
          switch (kind) {
            case 'Service':
              return <Tag color="green">Service</Tag>;
            case 'Ingress':
              return <Tag color="cyan">Ingress</Tag>;
            default:
              return <Tag color="green">{kind}</Tag>;
          }
        },
      });
    } else if (resourceTypeFilter === '配置') {
      baseColumns.push({
        title: '配置类型',
        key: 'configType',
        render: (_, record: WorkloadSchedulingView) => {
          const kind = record.workloadInfo.kind;
          switch (kind) {
            case 'ConfigMap':
              return <Tag color="orange">配置映射</Tag>;
            case 'Secret':
              return <Tag color="red">密钥</Tag>;
            case 'PersistentVolumeClaim':
              return <Tag color="purple">存储卷声明</Tag>;
            default:
              return <Tag color="orange">{kind}</Tag>;
          }
        },
      });
    }

    // 通用列
    baseColumns.push(
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
        render: (_, record: WorkloadSchedulingView) => {
          const category = getResourceCategory(record.workloadInfo.kind);
          return (
        <Space wrap>
          {record.clusterPlacements.map((cluster) => (
            <Tag key={cluster.clusterName} color="green">
                  {category === '工作负载' 
                    ? `${cluster.clusterName}: ${cluster.actualReplicas}个`
                    : `${cluster.clusterName}: 已部署`
                  }
            </Tag>
          ))}
        </Space>
          );
        },
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
      }
    );

    return baseColumns;
  };

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
                总调度资源
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
                                              <Typography.Text type="secondary">{cluster.workloadCount} 个调度资源</Typography.Text>
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

      {/* 集群调度列表 - 调度资源列表 */}
      <div className="tech-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
              集群调度列表
            </Title>
            <Typography.Text type="secondary">
              显示调度资源在多集群中的分布情况，包括工作负载、服务和配置等资源类型
            </Typography.Text>
          </div>
          <NodeIndexOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
        </div>
        <Alert
          message="调度资源分布"
          description="支持工作负载（Deployment、StatefulSet等）、服务（Service、Ingress）、配置（ConfigMap、Secret）等多种资源类型的调度监控。"
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        {/* 资源类型切换按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Typography.Text strong style={{ marginRight: 8 }}>
              资源类型筛选:
            </Typography.Text>
            {(() => {
              const stats = getResourceTypeStats();
              const filterOptions = [
                { key: 'all', label: '全部', count: stats.all, color: 'default' },
                { key: '工作负载', label: '工作负载', count: stats.工作负载, color: 'blue' },
                { key: '服务', label: '服务', count: stats.服务, color: 'green' },
                { key: '配置', label: '配置', count: stats.配置, color: 'orange' },
              ];
              
              return filterOptions.map(option => (
                <Button
                  key={option.key}
                  type={resourceTypeFilter === option.key ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setResourceTypeFilter(option.key)}
                  style={{
                    borderColor: resourceTypeFilter === option.key ? 'var(--tech-primary)' : undefined,
                    color: resourceTypeFilter === option.key ? 'white' : 'var(--text-color)',
                  }}
                >
                  <Space size="small">
                    {option.key === '工作负载' && <ContainerOutlined />}
                    {option.key === '服务' && <CloudServerOutlined />}
                    {option.key === '配置' && <DatabaseOutlined />}
                    {option.key === 'all' && <AppstoreOutlined />}
                    <span>{option.label}</span>
                    <Badge 
                      count={option.count} 
                      size="small" 
                      style={{ 
                        backgroundColor: resourceTypeFilter === option.key ? 'rgba(255,255,255,0.3)' : 'var(--tech-primary)' 
                      }} 
                    />
                  </Space>
                </Button>
              ));
            })()}
          </Space>
        </div>

        <div className="tech-table">
          <Table
            columns={getWorkloadColumns()}
            dataSource={filteredWorkloads}
            loading={loading}
            rowKey={(record) => `${record.workloadInfo.namespace}-${record.workloadInfo.name}`}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 个${resourceTypeFilter === 'all' ? '调度资源' : resourceTypeFilter}`
            }}
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
          message="请选择调度资源"
          description="从概览列表中选择一个调度资源来查看详细的调度信息。"
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
              树形展示：集群 → 节点 → Pod，直观查看调度资源的多层级分布
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
                    treeData={buildClusterDistributionTreeData(selectedWorkload.clusterPlacements, handleNodeClick, handlePodClick)}
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
              {/* 调度资源基本信息 */}
              <div className="tech-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <RocketOutlined style={{ color: 'var(--tech-primary)', fontSize: '18px' }} />
                    <Title level={5} style={{ margin: 0, color: 'var(--text-color)' }}>
                      调度资源详情
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

  // 渲染节点详情模态框
  const renderNodeDetailModal = () => {
    if (!selectedNode) return null;

    const cpuUsage = Math.random() * 80 + 10; // 模拟CPU使用率
    const memoryUsage = Math.random() * 70 + 15; // 模拟内存使用率
    const diskUsage = Math.random() * 60 + 20; // 模拟磁盘使用率

    return (
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <DesktopOutlined style={{ color: 'var(--tech-primary)' }} />
            <span>节点详细信息 - {selectedNode.nodeName}</span>
          </div>
        }
        open={nodeDetailVisible}
        onCancel={handleNodeDetailClose}
        width={800}
        footer={[
          <Button key="close" onClick={handleNodeDetailClose}>
            关闭
          </Button>
        ]}
      >
        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <Title level={5} style={{ color: 'var(--tech-primary)', marginBottom: 16 }}>
              <InfoCircleOutlined className="mr-2" />
              基本信息
            </Title>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="节点名称">{selectedNode.nodeName}</Descriptions.Item>
              <Descriptions.Item label="节点IP">{selectedNode.nodeIP}</Descriptions.Item>
              <Descriptions.Item label="所属集群">{selectedNode.clusterName}</Descriptions.Item>
              <Descriptions.Item label="节点状态">
                <Badge 
                  status={selectedNode.nodeStatus === 'Ready' ? 'success' : 'error'} 
                  text={selectedNode.nodeStatus} 
                />
              </Descriptions.Item>
                             <Descriptions.Item label="节点角色" span={2}>
                 <Space>
                   {[...new Set(selectedNode.nodeRoles || [])].map((role) => (
                     <Tag key={String(role)} color="blue">{String(role)}</Tag>
                   ))}
                 </Space>
               </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* 资源使用情况 */}
          <div>
            <Title level={5} style={{ color: 'var(--tech-primary)', marginBottom: 16 }}>
              <CloudServerOutlined className="mr-2" />
              资源使用情况
            </Title>
            <Row gutter={[24, 16]}>
              <Col span={8}>
                <div className="text-center">
                  <Progress
                    type="circle"
                    percent={Math.round(cpuUsage)}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    size={80}
                  />
                  <div className="mt-2">
                    <Typography.Text strong>CPU 使用率</Typography.Text>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <Progress
                    type="circle"
                    percent={Math.round(memoryUsage)}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    size={80}
                  />
                  <div className="mt-2">
                    <Typography.Text strong>内存使用率</Typography.Text>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <Progress
                    type="circle"
                    percent={Math.round(diskUsage)}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    size={80}
                  />
                  <div className="mt-2">
                    <Typography.Text strong>磁盘使用率</Typography.Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* Pod 分布信息 */}
          <div>
            <Title level={5} style={{ color: 'var(--tech-primary)', marginBottom: 16 }}>
              <ContainerOutlined className="mr-2" />
              Pod 分布信息
            </Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="tech-card p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500 mb-2">
                      {selectedNode.runningPods}
                    </div>
                    <Typography.Text type="secondary">运行中的 Pod</Typography.Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="tech-card p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500 mb-2">
                      {selectedNode.podCount}
                    </div>
                    <Typography.Text type="secondary">总 Pod 数量</Typography.Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Pod 详细列表 */}
          {selectedNode.podDetails && selectedNode.podDetails.length > 0 && (
            <>
              <Divider />
              <div>
                <Title level={5} style={{ color: 'var(--tech-primary)', marginBottom: 16 }}>
                  Pod 详细列表
                </Title>
                <List
                  dataSource={selectedNode.podDetails}
                  renderItem={(pod: any) => (
                    <List.Item>
                      <div className="w-full">
                        <div className="flex justify-between items-center">
                          <Space>
                            <ContainerOutlined style={{ color: 'var(--success-color)' }} />
                            <Typography.Text strong>{pod.podName}</Typography.Text>
                            <Tag color={pod.podStatus === 'Running' ? 'success' : 'warning'}>
                              {pod.podStatus}
                            </Tag>
                          </Space>
                          <Space>
                            <Typography.Text type="secondary">IP: {pod.podIP}</Typography.Text>
                            <Typography.Text type="secondary">重启: {pod.restartCount}次</Typography.Text>
                          </Space>
                        </div>
                        <Typography.Text type="secondary" className="text-sm">
                          创建时间: {new Date(pod.createdTime).toLocaleString()}
                        </Typography.Text>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    );
  };

  // 渲染Pod详情模态框
  const renderPodDetailModal = () => {
    if (!selectedPod) return null;

    const cpuUsage = Math.random() * 60 + 20; // 模拟Pod CPU使用率
    const memoryUsage = Math.random() * 50 + 30; // 模拟Pod内存使用率

    // 模拟Pod调用信息和事件
    const mockEvents = [
      { time: '2 minutes ago', reason: 'Started', message: 'Started container nginx' },
      { time: '3 minutes ago', reason: 'Pulled', message: 'Successfully pulled image "nginx:1.23.4"' },
      { time: '3 minutes ago', reason: 'Pulling', message: 'Pulling image "nginx:1.23.4"' },
      { time: '5 minutes ago', reason: 'Scheduled', message: `Successfully assigned ${selectedPod.podName} to ${selectedPod.nodeName}` },
    ];

    const mockContainers = [
      {
        name: 'nginx',
        image: 'nginx:1.23.4',
        status: 'Running',
        restartCount: selectedPod.restartCount || 0,
        cpuUsage: cpuUsage,
        memoryUsage: memoryUsage
      }
    ];

    return (
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <ContainerOutlined style={{ color: 'var(--success-color)' }} />
            <span>Pod 详细信息 - {selectedPod.podName}</span>
          </div>
        }
        open={podDetailVisible}
        onCancel={handlePodDetailClose}
        width={900}
        footer={[
          <Button key="close" onClick={handlePodDetailClose}>
            关闭
          </Button>
        ]}
      >
        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <Title level={5} style={{ color: 'var(--success-color)', marginBottom: 16 }}>
              <InfoCircleOutlined className="mr-2" />
              基本信息
            </Title>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Pod名称">{selectedPod.podName}</Descriptions.Item>
              <Descriptions.Item label="Pod IP">{selectedPod.podIP}</Descriptions.Item>
              <Descriptions.Item label="所在节点">{selectedPod.nodeName}</Descriptions.Item>
              <Descriptions.Item label="节点IP">{selectedPod.nodeIP}</Descriptions.Item>
              <Descriptions.Item label="所属集群">{selectedPod.clusterName}</Descriptions.Item>
              <Descriptions.Item label="Pod状态">
                <Tag color={selectedPod.podStatus === 'Running' ? 'success' : 'warning'}>
                  {selectedPod.podStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="重启次数">
                <Badge count={selectedPod.restartCount || 0} showZero color="orange" />
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedPod.createdTime).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* 容器信息 */}
          <div>
            <Title level={5} style={{ color: 'var(--success-color)', marginBottom: 16 }}>
              <ContainerOutlined className="mr-2" />
              容器信息
            </Title>
            {mockContainers.map((container, index) => (
              <div key={index} className="tech-card p-4 mb-4">
                <Row gutter={[24, 16]}>
                  <Col span={12}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="容器名称">
                        <Typography.Text strong>{container.name}</Typography.Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="镜像">
                        <Typography.Text code>{container.image}</Typography.Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <Tag color="success">{container.status}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="重启次数">
                        <Badge count={container.restartCount} showZero />
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col span={12}>
                    <div className="text-center">
                      <Row gutter={16}>
                        <Col span={12}>
                          <Progress
                            type="circle"
                            percent={Math.round(container.cpuUsage)}
                            strokeColor={{
                              '0%': '#52c41a',
                              '100%': '#73d13d',
                            }}
                            size={60}
                          />
                          <div className="mt-2">
                            <Typography.Text strong>CPU</Typography.Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Progress
                            type="circle"
                            percent={Math.round(container.memoryUsage)}
                            strokeColor={{
                              '0%': '#1890ff',
                              '100%': '#40a9ff',
                            }}
                            size={60}
                          />
                          <div className="mt-2">
                            <Typography.Text strong>内存</Typography.Text>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </div>
            ))}
          </div>

          <Divider />

          {/* 调用和事件信息 */}
          <div>
            <Title level={5} style={{ color: 'var(--success-color)', marginBottom: 16 }}>
              <DatabaseOutlined className="mr-2" />
              事件和调用信息
            </Title>
            <List
              dataSource={mockEvents}
              renderItem={(event) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between items-start">
                      <Space direction="vertical" size="small">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            status={event.reason === 'Started' ? 'success' : 
                                   event.reason === 'Pulled' ? 'processing' : 'default'} 
                          />
                          <Typography.Text strong>{event.reason}</Typography.Text>
                          <Typography.Text type="secondary" className="text-sm">
                            {event.time}
                          </Typography.Text>
                        </div>
                        <Typography.Text style={{ marginLeft: 24 }}>
                          {event.message}
                        </Typography.Text>
                      </Space>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>

          <Divider />

          {/* 网络和存储信息 */}
          <div>
            <Title level={5} style={{ color: 'var(--success-color)', marginBottom: 16 }}>
              <CloudServerOutlined className="mr-2" />
              网络和存储
            </Title>
            <Row gutter={[24, 16]}>
              <Col span={12}>
                                 <div className="tech-card p-4">
                   <Title level={5}>网络信息</Title>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Pod IP">{selectedPod.podIP}</Descriptions.Item>
                    <Descriptions.Item label="主机端口">80:30080</Descriptions.Item>
                    <Descriptions.Item label="服务端口">80/TCP</Descriptions.Item>
                  </Descriptions>
                </div>
              </Col>
              <Col span={12}>
                <div className="tech-card p-4">
                  <Title level={5}>存储信息</Title>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="数据卷">default-token</Descriptions.Item>
                    <Descriptions.Item label="挂载路径">/var/run/secrets</Descriptions.Item>
                    <Descriptions.Item label="存储类型">Secret</Descriptions.Item>
                  </Descriptions>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </Modal>
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
              Karmada多集群调度资源监控中心
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
              onClick={loadDataWithCustomLoading}
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
            items={[
              {
                key: 'overview',
                label: '概览',
                children: renderOverview(),
              },
              {
                key: 'detail',
                label: '详细信息',
                children: renderDetail(),
              },
            ]}
          />
        </div>
      </div>

      {/* 节点详情模态框 */}
      {renderNodeDetailModal()}

      {/* Pod详情模态框 */}
      {renderPodDetailModal()}
    </ScrollContainer>
  );
};

export default ClusterSchedulingPage; 
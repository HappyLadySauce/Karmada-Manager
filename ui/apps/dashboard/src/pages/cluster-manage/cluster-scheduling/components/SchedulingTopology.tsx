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

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Tree, 
  Spin, 
  Empty, 
  Tag, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Button, 
  Select, 
  Space,
  Tooltip,
  Badge,
  Alert,
  Divider,
  Typography
} from 'antd';
import { 
  AppstoreOutlined, 
  ClusterOutlined, 
  DatabaseOutlined,
  DeploymentUnitOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
  ApiOutlined,
  CloudOutlined,
  HddOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { ResourceType } from '../index';

const { Title, Text } = Typography;
const { Option } = Select;

interface SchedulingData {
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

interface ClusterTopologyData {
  clusterName: string;
  nodeCount: number;
  readyNodes: number;
  resources: number;
  cpuUsage: number;
  memoryUsage: number;
  status: 'healthy' | 'warning' | 'error';
}

interface SchedulingTopologyProps {
  data: SchedulingData[];
  resourceType: ResourceType;
  loading: boolean;
  onRefresh?: () => void;
}

interface TreeNode {
  title: React.ReactNode;
  key: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  isLeaf?: boolean;
}

export const SchedulingTopology: React.FC<SchedulingTopologyProps> = ({
  data,
  resourceType,
  loading,
  onRefresh
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [filterNamespace, setFilterNamespace] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewType, setViewType] = useState<'tree' | 'network'>('tree');

  // 模拟集群拓扑数据
  const clusterTopologyData: ClusterTopologyData[] = [
    {
      clusterName: 'master',
      nodeCount: 3,
      readyNodes: 3,
      resources: 12,
      cpuUsage: 65,
      memoryUsage: 72,
      status: 'healthy'
    },
    {
      clusterName: 'branch',
      nodeCount: 2,
      readyNodes: 2,
      resources: 8,
      cpuUsage: 45,
      memoryUsage: 58,
      status: 'healthy'
    },
    {
      clusterName: 'edge-cluster',
      nodeCount: 1,
      readyNodes: 1,
      resources: 3,
      cpuUsage: 85,
      memoryUsage: 90,
      status: 'warning'
    }
  ];

  // 获取资源图标
  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'workload':
        return <AppstoreOutlined style={{ color: '#1890ff' }} />;
      case 'service':
        return <DeploymentUnitOutlined style={{ color: '#52c41a' }} />;
      case 'configuration':
        return <SettingOutlined style={{ color: '#722ed1' }} />;
      default:
        return <DatabaseOutlined />;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'running' || statusLower === 'available' || statusLower === 'ready') {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else if (statusLower === 'pending' || statusLower === 'creating') {
      return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    } else {
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  // 获取集群状态颜色
  const getClusterStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#52c41a';
      case 'warning':
        return '#faad14';
      case 'error':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  // 获取资源标题
  const getResourceTitle = (item: SchedulingData) => {
    let title = item.name;
    let subtitle = '';
    let details = [];

    if (resourceType === 'workload' && item.workloadInfo) {
      const totalReplicas = item.workloadInfo.clusters.reduce((sum, cluster) => sum + cluster.replicas, 0);
      const readyReplicas = item.workloadInfo.clusters.reduce((sum, cluster) => sum + cluster.readyReplicas, 0);
      subtitle = `${item.workloadInfo.kind}`;
      details.push(`${readyReplicas}/${totalReplicas} 副本`);
    } else if (resourceType === 'service' && item.serviceInfo) {
      subtitle = `${item.serviceInfo.type} Service`;
      details.push(`${item.serviceInfo.ports.length} 端口`);
      if (item.serviceInfo.endpoints) {
        details.push(`${item.serviceInfo.endpoints} 端点`);
      }
    } else if (resourceType === 'configuration' && item.configInfo) {
      subtitle = `${item.configInfo.type}`;
      const dataCount = Object.keys(item.configInfo.data || {}).length;
      details.push(`${dataCount} 配置项`);
      if (item.configInfo.size) {
        details.push(`${item.configInfo.size} KB`);
      }
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '400px' }}>
        {getStatusIcon(item.status)}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text strong>{title}</Text>
            <Tag color="blue">{item.namespace}</Tag>
            <Tag color={
              item.status.toLowerCase() === 'running' || item.status.toLowerCase() === 'available'
                ? 'green'
                : item.status.toLowerCase() === 'pending'
                ? 'orange'
                : 'red'
            }>
              {item.status}
            </Tag>
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {subtitle} {details.length > 0 && `• ${details.join(' • ')}`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Tag color="purple">{item.clusters.length} 集群</Tag>
        </div>
      </div>
    );
  };

  // 获取集群标题
  const getClusterTitle = (clusterName: string, item: SchedulingData) => {
    let details = [];
    let status = 'healthy';
    
    if (resourceType === 'workload' && item.workloadInfo) {
      const clusterInfo = item.workloadInfo.clusters.find(c => c.cluster === clusterName);
      if (clusterInfo) {
        details.push(`副本: ${clusterInfo.readyReplicas}/${clusterInfo.replicas}`);
        if (clusterInfo.nodes) {
          details.push(`节点: ${clusterInfo.nodes.length}`);
        }
        status = clusterInfo.status || 'healthy';
      }
    } else if (resourceType === 'service' && item.serviceInfo) {
      details.push(`端口: ${item.serviceInfo.ports.map(p => `${p.port}:${p.targetPort}`).join(', ')}`);
    } else if (resourceType === 'configuration' && item.configInfo) {
      const dataCount = Object.keys(item.configInfo.data || {}).length;
      details.push(`配置项: ${dataCount}`);
    }

    // 获取集群拓扑数据
    const clusterTopology = clusterTopologyData.find(c => c.clusterName === clusterName);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '350px' }}>
        <ClusterOutlined style={{ color: getClusterStatusColor(status) }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text strong>{clusterName}</Text>
            <Badge 
              status={status === 'healthy' ? 'success' : status === 'warning' ? 'warning' : 'error'} 
              text={status === 'healthy' ? '健康' : status === 'warning' ? '警告' : '错误'} 
            />
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {details.join(' • ')}
          </div>
          {clusterTopology && (
            <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>
              节点: {clusterTopology.readyNodes}/{clusterTopology.nodeCount} • 
              CPU: {clusterTopology.cpuUsage}% • 
              内存: {clusterTopology.memoryUsage}%
            </div>
          )}
        </div>
      </div>
    );
  };

  // 获取过滤后的数据
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const namespaceMatch = filterNamespace === 'all' || item.namespace === filterNamespace;
      const statusMatch = filterStatus === 'all' || item.status.toLowerCase() === filterStatus.toLowerCase();
      return namespaceMatch && statusMatch;
    });
  }, [data, filterNamespace, filterStatus]);

  // 获取命名空间列表
  const namespaces = useMemo(() => {
    const nsSet = new Set(data.map(item => item.namespace));
    return Array.from(nsSet).sort();
  }, [data]);

  // 转换为树形数据
  const transformToTreeData = useMemo((): TreeNode[] => {
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    // 按命名空间分组
    const namespaceGroups = filteredData.reduce((groups, item) => {
      const namespace = item.namespace || 'default';
      if (!groups[namespace]) {
        groups[namespace] = [];
      }
      groups[namespace].push(item);
      return groups;
    }, {} as Record<string, SchedulingData[]>);

    return Object.entries(namespaceGroups).map(([namespace, items]) => ({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <Text strong>命名空间: {namespace}</Text>
          <Tag color="blue">{items.length} 个资源</Tag>
          <Tag color="cyan">
            {items.reduce((sum, item) => sum + item.clusters.length, 0)} 个调度
          </Tag>
        </div>
      ),
      key: `namespace-${namespace}`,
      icon: <DatabaseOutlined />,
      children: items.map(item => ({
        title: getResourceTitle(item),
        key: `resource-${item.name}-${item.namespace}`,
        icon: getResourceIcon(resourceType),
        children: item.clusters.map(cluster => ({
          title: getClusterTitle(cluster, item),
          key: `cluster-${cluster}-${item.name}-${item.namespace}`,
          icon: <ClusterOutlined />,
          isLeaf: true
        }))
      }))
    }));
  }, [filteredData, resourceType]);

  // 计算统计数据
  const statistics = useMemo(() => {
    const totalResources = filteredData.length;
    const totalSchedulings = filteredData.reduce((sum, item) => sum + item.clusters.length, 0);
    const runningResources = filteredData.filter(item => 
      item.status.toLowerCase() === 'running' || item.status.toLowerCase() === 'available'
    ).length;
    const pendingResources = filteredData.filter(item => 
      item.status.toLowerCase() === 'pending'
    ).length;
    const failedResources = filteredData.filter(item => 
      item.status.toLowerCase() === 'failed' || item.status.toLowerCase() === 'error'
    ).length;

    return {
      totalResources,
      totalSchedulings,
      runningResources,
      pendingResources,
      failedResources,
      successRate: totalResources > 0 ? Math.round((runningResources / totalResources) * 100) : 0
    };
  }, [filteredData]);

  // 处理树节点展开
  const handleExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue as string[]);
  };

  // 处理树节点选择
  const handleSelect = (selectedKeysValue: React.Key[]) => {
    setSelectedKeys(selectedKeysValue as string[]);
  };

  // 展开所有节点
  const expandAll = () => {
    const allKeys = transformToTreeData.reduce((keys: string[], namespace) => {
      keys.push(namespace.key);
      if (namespace.children) {
        namespace.children.forEach(resource => {
          keys.push(resource.key);
        });
      }
      return keys;
    }, []);
    setExpandedKeys(allKeys);
  };

  // 折叠所有节点
  const collapseAll = () => {
    setExpandedKeys([]);
  };

  // 网络拓扑视图组件
  const NetworkTopologyView = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {clusterTopologyData.map(cluster => (
          <Col xs={24} sm={12} lg={8} key={cluster.clusterName}>
            <Card 
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CloudOutlined style={{ color: getClusterStatusColor(cluster.status) }} />
                  <span>{cluster.clusterName}</span>
                  <Badge 
                    status={cluster.status === 'healthy' ? 'success' : cluster.status === 'warning' ? 'warning' : 'error'} 
                  />
                </div>
              }
              extra={
                <Tag color={cluster.status === 'healthy' ? 'green' : cluster.status === 'warning' ? 'orange' : 'red'}>
                  {cluster.status === 'healthy' ? '健康' : cluster.status === 'warning' ? '警告' : '错误'}
                </Tag>
              }
            >
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic 
                    title="节点"
                    value={cluster.readyNodes}
                    suffix={`/ ${cluster.nodeCount}`}
                    valueStyle={{ fontSize: '14px' }}
                    prefix={<HddOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="资源"
                    value={cluster.resources}
                    valueStyle={{ fontSize: '14px' }}
                    prefix={<AppstoreOutlined />}
                  />
                </Col>
                <Col span={24}>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>CPU 使用率</div>
                    <Progress 
                      percent={cluster.cpuUsage} 
                      size="small" 
                      status={cluster.cpuUsage > 80 ? 'exception' : 'normal'}
                    />
                  </div>
                </Col>
                <Col span={24}>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ marginBottom: '4px', fontSize: '12px' }}>内存使用率</div>
                    <Progress 
                      percent={cluster.memoryUsage} 
                      size="small" 
                      status={cluster.memoryUsage > 80 ? 'exception' : 'normal'}
                    />
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
      
      <Divider>资源分布</Divider>
      
      <Row gutter={[16, 16]}>
        {filteredData.map(item => (
          <Col xs={24} sm={12} lg={8} key={`${item.name}-${item.namespace}`}>
            <Card 
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getResourceIcon(resourceType)}
                  <span>{item.name}</span>
                  <Tag size="small" color="blue">{item.namespace}</Tag>
                </div>
              }
              extra={
                <Tag color={
                  item.status.toLowerCase() === 'running' || item.status.toLowerCase() === 'available'
                    ? 'green'
                    : item.status.toLowerCase() === 'pending'
                    ? 'orange'
                    : 'red'
                }>
                  {item.status}
                </Tag>
              }
            >
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  调度到 {item.clusters.length} 个集群:
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Space wrap>
                    {item.clusters.map(cluster => (
                      <Tag key={cluster} color="green" size="small">
                        <ClusterOutlined style={{ marginRight: '4px' }} />
                        {cluster}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载拓扑数据中...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty
          description={`暂无${
            resourceType === 'workload' ? '工作负载' :
            resourceType === 'service' ? '服务' :
            resourceType === 'configuration' ? '配置' : '资源'
          }调度数据`}
          style={{ padding: '50px' }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* 统计信息卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={6} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="总资源"
              value={statistics.totalResources}
              prefix={<AppstoreOutlined />}
              valueStyle={{ fontSize: '18px', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="总调度"
              value={statistics.totalSchedulings}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ fontSize: '18px', color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="运行中"
              value={statistics.runningResources}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ fontSize: '18px', color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="等待中"
              value={statistics.pendingResources}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: '18px', color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="失败"
              value={statistics.failedResources}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ fontSize: '18px', color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card size="small">
            <Statistic
              title="成功率"
              value={statistics.successRate}
              suffix="%"
              prefix={<ApiOutlined />}
              valueStyle={{ 
                fontSize: '18px', 
                color: statistics.successRate >= 90 ? '#52c41a' : statistics.successRate >= 70 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作工具栏 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getResourceIcon(resourceType)}
              {resourceType === 'workload' ? '工作负载' :
               resourceType === 'service' ? '服务' :
               resourceType === 'configuration' ? '配置' : '资源'}调度拓扑
            </Title>
          </Col>
          <Col flex="auto">
            <Space>
              <Select
                value={filterNamespace}
                onChange={setFilterNamespace}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="all">全部命名空间</Option>
                {namespaces.map(ns => (
                  <Option key={ns} value={ns}>{ns}</Option>
                ))}
              </Select>
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 100 }}
                size="small"
              >
                <Option value="all">全部状态</Option>
                <Option value="running">运行中</Option>
                <Option value="pending">等待中</Option>
                <Option value="failed">失败</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button.Group size="small">
                <Button 
                  icon={<NodeIndexOutlined />}
                  type={viewType === 'tree' ? 'primary' : 'default'}
                  onClick={() => setViewType('tree')}
                >
                  树形视图
                </Button>
                <Button 
                  icon={<PartitionOutlined />}
                  type={viewType === 'network' ? 'primary' : 'default'}
                  onClick={() => setViewType('network')}
                >
                  网络视图
                </Button>
              </Button.Group>
              {viewType === 'tree' && (
                <Button.Group size="small">
                  <Button onClick={expandAll}>展开全部</Button>
                  <Button onClick={collapseAll}>折叠全部</Button>
                </Button.Group>
              )}
              {onRefresh && (
                <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh}>
                  刷新
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <Card>
        {viewType === 'tree' ? (
          <Tree
            showIcon
            showLine={{ showLeafIcon: false }}
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            onExpand={handleExpand}
            onSelect={handleSelect}
            treeData={transformToTreeData}
            style={{ fontSize: '14px' }}
            height={600}
          />
        ) : (
          <NetworkTopologyView />
        )}
      </Card>
    </div>
  );
}; 
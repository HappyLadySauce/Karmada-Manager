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
  Progress, 
  Descriptions,
  List,
  Badge,
  Tooltip,
  Alert,
  Typography,
  Collapse
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
  RocketOutlined
} from '@ant-design/icons';
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
const { Title, Text } = Typography;
const { Panel } = Collapse;

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
            <Text strong>{name}</Text>
            <br />
            <Text type="secondary">{record.workloadInfo.kind}</Text>
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
      render: (_, record: WorkloadSchedulingView) => (
        <Space direction="vertical" size="small">
          <Text>
            {record.workloadInfo.readyReplicas} / {record.workloadInfo.replicas}
          </Text>
          <Progress
            percent={Math.round((record.workloadInfo.readyReplicas / record.workloadInfo.replicas) * 100)}
            size="small"
            status={record.workloadInfo.readyReplicas === record.workloadInfo.replicas ? 'success' : 'active'}
          />
        </Space>
      ),
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
        <a
          onClick={() => loadWorkloadDetail(
            record.workloadInfo.namespace,
            record.workloadInfo.name,
            record.workloadInfo.kind
          )}
        >
          查看详情
        </a>
      ),
    },
  ];

  // 渲染概览统计
  const renderOverview = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总工作负载"
              value={overview?.totalWorkloads || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已调度"
              value={overview?.scheduledWorkloads || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待调度"
              value={overview?.pendingWorkloads || 0}
              prefix={<LoadingOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="调度失败"
              value={overview?.failedWorkloads || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="集群分布" extra={<ClusterOutlined />}>
            <List
              dataSource={overview?.clusterDistribution || []}
              renderItem={(cluster) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Badge status={cluster.clusterStatus === 'Ready' ? 'success' : 'error'} />
                        <Text strong>{cluster.clusterName}</Text>
                      </Space>
                      <Text type="secondary">{cluster.workloadCount} 个工作负载</Text>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        副本: {cluster.readyReplicas}/{cluster.totalReplicas}
                      </Text>
                      <Progress
                        percent={Math.round((cluster.readyReplicas / cluster.totalReplicas) * 100)}
                        size="small"
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="命名空间统计">
            <List
              dataSource={overview?.namespaceStats || []}
              renderItem={(ns) => (
                <List.Item>
                  <Space>
                    <Tag color="blue">{ns.namespace}</Tag>
                    <Text>总计: {ns.workloadCount}</Text>
                    <Text type="success">调度: {ns.scheduledCount}</Text>
                    <Text type="warning">待调度: {ns.pendingCount}</Text>
                    <Text type="danger">失败: {ns.failedCount}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // 渲染拓扑视图
  const renderTopology = () => (
    <Card title="集群拓扑视图" extra={<NodeIndexOutlined />}>
      <Alert
        message="拓扑视图"
        description="显示工作负载在多集群中的分布情况，包括集群、节点和Pod的层次结构。"
        type="info"
        style={{ marginBottom: 16 }}
      />
      <Table
        columns={workloadColumns}
        dataSource={workloads}
        loading={loading}
        rowKey={(record) => `${record.workloadInfo.namespace}-${record.workloadInfo.name}`}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );

  // 渲染节点Pod详情
  const renderNodePodDetails = (nodePlacement: NodePlacement) => (
    <Card
      key={nodePlacement.nodeName}
      title={
        <Space>
          <DesktopOutlined />
          <span>{nodePlacement.nodeName}</span>
          <Tag color="blue">{nodePlacement.nodeRoles.join(', ')}</Tag>
          <Badge 
            status={nodePlacement.nodeStatus === 'Ready' ? 'success' : 'error'} 
            text={nodePlacement.nodeStatus}
          />
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary">IP: {nodePlacement.nodeIP}</Text>
          <Text type="secondary">Pods: {nodePlacement.runningPods}/{nodePlacement.podCount}</Text>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="运行中Pod">{nodePlacement.runningPods}</Descriptions.Item>
            <Descriptions.Item label="待调度Pod">{nodePlacement.pendingPods}</Descriptions.Item>
            <Descriptions.Item label="失败Pod">{nodePlacement.failedPods}</Descriptions.Item>
          </Descriptions>
        </Col>
        <Col xs={24} md={12}>
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="CPU容量">{nodePlacement.nodeResources.cpuCapacity}</Descriptions.Item>
            <Descriptions.Item label="内存容量">{nodePlacement.nodeResources.memoryCapacity}</Descriptions.Item>
            <Descriptions.Item label="Pod容量">{nodePlacement.nodeResources.podCapacity}</Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
      
      {nodePlacement.podDetails && nodePlacement.podDetails.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>Pod详情</Title>
          <List
            size="small"
            dataSource={nodePlacement.podDetails}
            renderItem={(pod: PodDetail) => (
              <List.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <ContainerOutlined />
                    <div>
                      <Text strong>{pod.podName}</Text>
                      <br />
                      <Text type="secondary">
                        状态: <Tag color={pod.podStatus === 'Running' ? 'success' : 'warning'}>{pod.podStatus}</Tag>
                        IP: {pod.podIP}
                      </Text>
                    </div>
                  </Space>
                  <Space direction="vertical" size="small">
                    <Text type="secondary">重启: {pod.restartCount}次</Text>
                    <Text type="secondary">创建: {new Date(pod.createdTime).toLocaleString()}</Text>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );

  // 渲染详情视图
  const renderDetail = () => {
    if (!selectedWorkload) {
      return (
        <Card>
          <Alert
            message="请选择工作负载"
            description="从拓扑视图中选择一个工作负载来查看详细的调度信息。"
            type="info"
          />
        </Card>
      );
    }

    return (
      <div>
        {/* 工作负载基本信息 */}
        <Card 
          title={
            <Space>
              <RocketOutlined />
              <span>工作负载详情: {selectedWorkload.workloadInfo.name}</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Descriptions column={1}>
                <Descriptions.Item label="名称">{selectedWorkload.workloadInfo.name}</Descriptions.Item>
                <Descriptions.Item label="命名空间">{selectedWorkload.workloadInfo.namespace}</Descriptions.Item>
                <Descriptions.Item label="类型">{selectedWorkload.workloadInfo.kind}</Descriptions.Item>
                <Descriptions.Item label="API版本">{selectedWorkload.workloadInfo.apiVersion}</Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} md={12}>
              <Descriptions column={1}>
                <Descriptions.Item label="总副本数">{selectedWorkload.totalReplicas}</Descriptions.Item>
                <Descriptions.Item label="就绪副本数">{selectedWorkload.readyReplicas}</Descriptions.Item>
                <Descriptions.Item label="调度状态">
                  <Tag color={getStatusColor(selectedWorkload.schedulingStatus.phase)}>
                    {selectedWorkload.schedulingStatus.phase}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态消息">{selectedWorkload.schedulingStatus.message}</Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Card>

        {/* 传播策略信息 */}
        {selectedWorkload.propagationPolicy && (
          <Card title="传播策略" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="策略名称">{selectedWorkload.propagationPolicy.name}</Descriptions.Item>
              <Descriptions.Item label="调度类型">
                {selectedWorkload.propagationPolicy.placement?.replicaScheduling?.replicaSchedulingType || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="目标集群" span={2}>
                <Space wrap>
                  {selectedWorkload.propagationPolicy.clusterAffinity?.clusterNames?.map((cluster: string) => (
                    <Tag key={cluster} color="green">{cluster}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 集群分布详情 */}
        <Card title="集群分布详情" style={{ marginBottom: 16 }}>
          <Collapse>
            {selectedWorkload.clusterPlacements.map((cluster: PreciseClusterPlacement) => (
              <Panel
                key={cluster.clusterName}
                header={
                  <Space>
                    <ClusterOutlined />
                    <span>集群: {cluster.clusterName}</span>
                    <Tag color="blue">副本: {cluster.actualReplicas}/{cluster.plannedReplicas}</Tag>
                    <Badge status={cluster.clusterStatus === 'Ready' ? 'success' : 'error'} text={cluster.clusterStatus} />
                  </Space>
                }
              >
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary">调度原因: {cluster.reason}</Text>
                </div>
                
                {/* 节点分布 */}
                {cluster.nodePlacements && cluster.nodePlacements.length > 0 ? (
                  <div>
                    <Title level={5}>节点分布 ({cluster.nodePlacements.length} 个节点)</Title>
                    {cluster.nodePlacements.map(renderNodePodDetails)}
                  </div>
                ) : (
                  <Alert message="暂无节点分布信息" type="info" />
                )}
              </Panel>
            ))}
          </Collapse>
        </Card>
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <Space>
          <ClusterOutlined />
          集群调度管理
        </Space>
      </Title>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="概览" key="overview">
          {renderOverview()}
        </TabPane>
        <TabPane tab="拓扑视图" key="topology">
          {renderTopology()}
        </TabPane>
        <TabPane tab="详细信息" key="detail">
          {renderDetail()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ClusterSchedulingPage; 
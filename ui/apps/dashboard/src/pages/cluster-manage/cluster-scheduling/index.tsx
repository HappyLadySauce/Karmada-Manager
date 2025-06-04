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
import { Card, Button, Table, Space, Statistic, Row, Col, Tag, message } from 'antd';
import { 
  AppstoreOutlined, 
  DeploymentUnitOutlined, 
  SettingOutlined,
  TableOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import { SchedulingTopology } from './components/SchedulingTopology';
import { getSchedulingList } from '../../../services/scheduling';

export type ResourceType = 'workload' | 'service' | 'configuration';

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
  };
  configInfo?: {
    configName: string;
    namespace: string;
    type: string;
    data: Record<string, string>;
    clusters: string[];
  };
}

interface StatisticsData {
  total: number;
  running: number;
  pending: number;
  failed: number;
}

const ClusterScheduling: React.FC = () => {
  const [viewMode, setViewMode] = useState<'topology' | 'list'>('topology');
  const [resourceType, setResourceType] = useState<ResourceType>('workload');
  const [schedulingData, setSchedulingData] = useState<SchedulingData[]>([]);
  const [statistics, setStatistics] = useState<StatisticsData>({
    total: 0,
    running: 0,
    pending: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(false);

  // 获取调度数据
  const fetchSchedulingData = async () => {
    setLoading(true);
    try {
      const response = await getSchedulingList({ resourceType });
      if (response && response.data) {
        setSchedulingData(response.data);
        
        // 计算统计数据
        const stats = response.data.reduce((acc: StatisticsData, item: SchedulingData) => {
          acc.total += 1;
          switch (item.status.toLowerCase()) {
            case 'running':
            case 'available':
              acc.running += 1;
              break;
            case 'pending':
              acc.pending += 1;
              break;
            case 'failed':
            case 'error':
              acc.failed += 1;
              break;
            default:
              acc.running += 1;
          }
          return acc;
        }, { total: 0, running: 0, pending: 0, failed: 0 });
        
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Failed to fetch scheduling data:', error);
      message.error('获取调度数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulingData();
  }, [resourceType]);

  // 资源类型按钮配置
  const resourceTypeButtons = [
    {
      key: 'workload' as ResourceType,
      label: '工作负载调度',
      icon: <AppstoreOutlined />
    },
    {
      key: 'service' as ResourceType,
      label: '服务调度',
      icon: <DeploymentUnitOutlined />
    },
    {
      key: 'configuration' as ResourceType,
      label: '配置调度',
      icon: <SettingOutlined />
    }
  ];

  // 视图模式按钮配置
  const viewModeButtons = [
    {
      key: 'topology' as const,
      label: '拓扑视图',
      icon: <NodeIndexOutlined />
    },
    {
      key: 'list' as const,
      label: '列表视图',
      icon: <TableOutlined />
    }
  ];

  // 表格列配置
  const getColumns = (): any[] => {
    const baseColumns: any[] = [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: '命名空间',
        dataIndex: 'namespace',
        key: 'namespace',
        width: 150,
      },
      {
        title: '类型',
        dataIndex: 'resourceType',
        key: 'resourceType',
        width: 120,
        render: (type: string) => <Tag color="blue">{type}</Tag>
      },
      {
        title: '集群',
        dataIndex: 'clusters',
        key: 'clusters',
        width: 200,
        render: (clusters: string[]) => (
          <Space wrap>
            {clusters?.map(cluster => (
              <Tag key={cluster} color="green">{cluster}</Tag>
            ))}
          </Space>
        )
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => {
          const color = status.toLowerCase() === 'running' || status.toLowerCase() === 'available' 
            ? 'green' 
            : status.toLowerCase() === 'pending' 
            ? 'orange' 
            : 'red';
          return <Tag color={color}>{status}</Tag>;
        }
      }
    ];

    // 根据资源类型添加特定列
    if (resourceType === 'workload') {
      baseColumns.splice(4, 0, {
        title: '副本数',
        key: 'replicas',
        width: 100,
        render: (_value: any, record: SchedulingData) => {
          const info = record.workloadInfo;
          if (info) {
            const totalReplicas = info.clusters.reduce((sum, cluster) => sum + cluster.replicas, 0);
            const readyReplicas = info.clusters.reduce((sum, cluster) => sum + cluster.readyReplicas, 0);
            return `${readyReplicas}/${totalReplicas}`;
          }
          return record.replicas ? `${record.readyReplicas || 0}/${record.replicas}` : '-';
        }
      });
    } else if (resourceType === 'service') {
      baseColumns.splice(4, 0, {
        title: '服务类型',
        key: 'serviceType',
        width: 120,
        render: (_value: any, record: SchedulingData) => {
          const type = record.serviceInfo?.type || 'ClusterIP';
          return <Tag color="purple">{type}</Tag>;
        }
      });
    } else if (resourceType === 'configuration') {
      baseColumns.splice(4, 0, {
        title: '配置类型',
        key: 'configType',
        width: 120,
        render: (_value: any, record: SchedulingData) => {
          const type = record.configInfo?.type || 'ConfigMap';
          return <Tag color="cyan">{type}</Tag>;
        }
      });
    }

    baseColumns.push({
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString() : '-'
    });

    return baseColumns;
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和控制按钮 */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>集群调度管理</h2>
          </Col>
          <Col>
            <Space size="middle">
              {/* 资源类型切换 */}
              <Button.Group>
                {resourceTypeButtons.map(btn => (
                  <Button
                    key={btn.key}
                    type={resourceType === btn.key ? 'primary' : 'default'}
                    icon={btn.icon}
                    onClick={() => setResourceType(btn.key)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </Button.Group>
              
              {/* 视图模式切换 */}
              <Button.Group>
                {viewModeButtons.map(btn => (
                  <Button
                    key={btn.key}
                    type={viewMode === btn.key ? 'primary' : 'default'}
                    icon={btn.icon}
                    onClick={() => setViewMode(btn.key)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </Button.Group>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总数"
              value={statistics.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={statistics.running}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="等待中"
              value={statistics.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败"
              value={statistics.failed}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Card>
        {viewMode === 'topology' ? (
          <SchedulingTopology
            data={schedulingData}
            resourceType={resourceType}
            loading={loading}
          />
        ) : (
          <Table
            columns={getColumns()}
            dataSource={schedulingData}
            loading={loading}
            rowKey="name"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条数据`
            }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ClusterScheduling; 
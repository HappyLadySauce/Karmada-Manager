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

import { useState } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Card, 
  Table, 
  Tag, 
  Button, 
  Input, 
  Select, 
  Tabs, 
  Progress,
  Statistic,
  Space,
  Tooltip,
  Modal,
  Form,
  InputNumber,
  Switch,
  Alert,
  Badge
} from 'antd';
import { 
  ClusterOutlined, 
  SettingOutlined, 
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  DashboardOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { GetClusters } from '@/services/cluster';
import { getSchedulingList } from '@/services/scheduling';
import '@/styles/tech-theme.css';
import ScrollContainer from '@/components/common/ScrollContainer';
import { SchedulingTopology } from './cluster-scheduling/components/SchedulingTopology';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface SchedulingPolicy {
  id: string;
  name: string;
  type: 'affinity' | 'anti-affinity' | 'spread' | 'priority';
  status: 'active' | 'inactive' | 'error';
  priority: number;
  targetClusters: string[];
  rules: any[];
  createTime: string;
  updateTime: string;
}

interface SchedulingRecord {
  id: string;
  resourceName: string;
  resourceType: 'deployment' | 'service' | 'configmap' | 'secret';
  sourceClusters: string[];
  targetClusters: string[];
  status: 'scheduled' | 'scheduling' | 'failed' | 'pending';
  policy: string;
  reason?: string;
  timestamp: string;
}

interface ClusterSchedulingMetrics {
  clusterName: string;
  schedulingLoad: number;
  scheduledResources: number;
  failedScheduling: number;
  avgSchedulingTime: number;
  lastUpdate: string;
}

const ClusterSchedulingPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SchedulingPolicy | null>(null);
  const [form] = Form.useForm();

  // 获取集群数据
  const { data: clusterData } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  // 模拟调度策略数据
  const schedulingPolicies: SchedulingPolicy[] = [
    {
      id: '1',
      name: '高可用部署策略',
      type: 'spread',
      status: 'active',
      priority: 1,
      targetClusters: ['cluster-1', 'cluster-2', 'cluster-3'],
      rules: [
        { type: 'clusterSpread', maxSkew: 1 },
        { type: 'zoneSpread', maxSkew: 2 }
      ],
      createTime: '2024-01-15 10:30:00',
      updateTime: '2024-01-20 14:15:00'
    },
    {
      id: '2',
      name: '资源优先策略',
      type: 'priority',
      status: 'active',
      priority: 2,
      targetClusters: ['cluster-1', 'cluster-4'],
      rules: [
        { type: 'resourcePriority', cpu: 0.8, memory: 0.7 },
        { type: 'costOptimization', enabled: true }
      ],
      createTime: '2024-01-10 09:20:00',
      updateTime: '2024-01-18 16:45:00'
    },
    {
      id: '3',
      name: '区域亲和策略',
      type: 'affinity',
      status: 'inactive',
      priority: 3,
      targetClusters: ['cluster-2', 'cluster-3'],
      rules: [
        { type: 'nodeAffinity', region: 'us-west-1' },
        { type: 'podAffinity', required: false }
      ],
      createTime: '2024-01-05 11:10:00',
      updateTime: '2024-01-12 13:30:00'
    }
  ];

  // 模拟调度记录数据
  const schedulingRecords: SchedulingRecord[] = [
    {
      id: '1',
      resourceName: 'web-app-deployment',
      resourceType: 'deployment',
      sourceClusters: ['control-plane'],
      targetClusters: ['cluster-1', 'cluster-2'],
      status: 'scheduled',
      policy: '高可用部署策略',
      timestamp: '2024-01-20 15:30:00'
    },
    {
      id: '2',
      resourceName: 'api-service',
      resourceType: 'service',
      sourceClusters: ['control-plane'],
      targetClusters: ['cluster-1', 'cluster-3'],
      status: 'scheduling',
      policy: '资源优先策略',
      timestamp: '2024-01-20 15:25:00'
    },
    {
      id: '3',
      resourceName: 'config-data',
      resourceType: 'configmap',
      sourceClusters: ['control-plane'],
      targetClusters: ['cluster-2'],
      status: 'failed',
      policy: '区域亲和策略',
      reason: '目标集群资源不足',
      timestamp: '2024-01-20 15:20:00'
    },
    {
      id: '4',
      resourceName: 'secret-credentials',
      resourceType: 'secret',
      sourceClusters: ['control-plane'],
      targetClusters: ['cluster-1', 'cluster-4'],
      status: 'pending',
      policy: '高可用部署策略',
      timestamp: '2024-01-20 15:15:00'
    }
  ];

  // 模拟集群调度指标数据
  const clusterMetrics: ClusterSchedulingMetrics[] = [
    {
      clusterName: 'cluster-1',
      schedulingLoad: 75,
      scheduledResources: 24,
      failedScheduling: 2,
      avgSchedulingTime: 3.2,
      lastUpdate: '2024-01-20 15:30:00'
    },
    {
      clusterName: 'cluster-2',
      schedulingLoad: 60,
      scheduledResources: 18,
      failedScheduling: 1,
      avgSchedulingTime: 2.8,
      lastUpdate: '2024-01-20 15:28:00'
    },
    {
      clusterName: 'cluster-3',
      schedulingLoad: 45,
      scheduledResources: 12,
      failedScheduling: 0,
      avgSchedulingTime: 2.1,
      lastUpdate: '2024-01-20 15:32:00'
    },
    {
      clusterName: 'cluster-4',
      schedulingLoad: 30,
      scheduledResources: 8,
      failedScheduling: 1,
      avgSchedulingTime: 4.5,
      lastUpdate: '2024-01-20 15:25:00'
    }
  ];

  // 调度策略表格列定义
  const policyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SchedulingPolicy) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            优先级: {record.priority}
          </Text>
        </div>
      ),
    },
    {
      title: '策略类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          'affinity': { color: 'blue', text: '亲和性' },
          'anti-affinity': { color: 'red', text: '反亲和性' },
          'spread': { color: 'green', text: '分散部署' },
          'priority': { color: 'orange', text: '优先级' }
        };
        const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
             render: (status: string) => {
         const statusMap = {
           'active': { color: 'success' as const, text: '活跃', icon: <CheckCircleOutlined /> },
           'inactive': { color: 'default' as const, text: '未激活', icon: <ClockCircleOutlined /> },
           'error': { color: 'error' as const, text: '错误', icon: <ExclamationCircleOutlined /> }
         };
         const config = statusMap[status as keyof typeof statusMap];
         return (
           <Badge 
             status={config.color} 
             text={
               <span>
                 {config.icon} {config.text}
               </span>
             } 
           />
         );
       },
    },
    {
      title: '目标集群',
      dataIndex: 'targetClusters',
      key: 'targetClusters',
             render: (clusters: string[]) => (
         <div>
           {clusters.slice(0, 2).map(cluster => (
             <Tag key={cluster}>{cluster}</Tag>
           ))}
           {clusters.length > 2 && (
             <Tooltip title={clusters.slice(2).join(', ')}>
               <Tag>+{clusters.length - 2}</Tag>
             </Tooltip>
           )}
         </div>
       ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      title: '操作',
             key: 'action',
       render: (_: any, record: SchedulingPolicy) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditPolicy(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePolicy(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 调度记录表格列定义
  const recordColumns = [
    {
      title: '资源名称',
      dataIndex: 'resourceName',
      key: 'resourceName',
      render: (text: string, record: SchedulingRecord) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Tag color="blue">{record.resourceType}</Tag>
        </div>
      ),
    },
    {
      title: '源集群',
      dataIndex: 'sourceClusters',
      key: 'sourceClusters',
      render: (clusters: string[]) => (
        <div>
          {clusters.map(cluster => (
            <Tag key={cluster} color="cyan">{cluster}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: '目标集群',
      dataIndex: 'targetClusters',
      key: 'targetClusters',
      render: (clusters: string[]) => (
        <div>
          {clusters.map(cluster => (
            <Tag key={cluster} color="green">{cluster}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: '调度状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: SchedulingRecord) => {
        const statusMap = {
          'scheduled': { color: 'success' as const, text: '已调度' },
          'scheduling': { color: 'processing' as const, text: '调度中' },
          'failed': { color: 'error' as const, text: '调度失败' },
          'pending': { color: 'warning' as const, text: '等待中' }
        };
        const config = statusMap[status as keyof typeof statusMap];
        return (
          <div>
            <Badge status={config.color} text={config.text} />
            {record.reason && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.reason}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '使用策略',
      dataIndex: 'policy',
      key: 'policy',
      render: (policy: string) => <Tag color="purple">{policy}</Tag>,
    },
    {
      title: '调度时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
  ];

  // 集群指标表格列定义
  const metricsColumns = [
    {
      title: '集群名称',
      dataIndex: 'clusterName',
      key: 'clusterName',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ClusterOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: '调度负载',
      dataIndex: 'schedulingLoad',
      key: 'schedulingLoad',
      render: (load: number) => (
        <div style={{ width: '100px' }}>
          <Progress 
            percent={load} 
            size="small" 
            status={load > 80 ? 'exception' : load > 60 ? 'normal' : 'success'}
            format={() => `${load}%`}
          />
        </div>
      ),
    },
    {
      title: '已调度资源',
      dataIndex: 'scheduledResources',
      key: 'scheduledResources',
      render: (count: number) => (
        <Statistic 
          value={count} 
          valueStyle={{ fontSize: '14px', color: '#52c41a' }}
          prefix={<RocketOutlined />}
        />
      ),
    },
    {
      title: '调度失败',
      dataIndex: 'failedScheduling',
      key: 'failedScheduling',
      render: (count: number) => (
        <Statistic 
          value={count} 
          valueStyle={{ fontSize: '14px', color: count > 0 ? '#ff4d4f' : '#52c41a' }}
          prefix={<ExclamationCircleOutlined />}
        />
      ),
    },
    {
      title: '平均调度时间',
      dataIndex: 'avgSchedulingTime',
      key: 'avgSchedulingTime',
      render: (time: number) => (
        <div>
          <Text>{time}s</Text>
        </div>
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      render: (time: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>{time}</Text>
      ),
    },
  ];

  // 处理创建策略
  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    form.resetFields();
    setPolicyModalVisible(true);
  };

  // 处理编辑策略
  const handleEditPolicy = (policy: SchedulingPolicy) => {
    setEditingPolicy(policy);
    form.setFieldsValue(policy);
    setPolicyModalVisible(true);
  };

  // 处理删除策略
  const handleDeletePolicy = (id: string) => {
    Modal.confirm({
      title: '删除调度策略',
      content: '确定要删除这个调度策略吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        // 这里应该调用删除API
        console.log('删除策略:', id);
      },
    });
  };

  // 处理策略表单提交
  const handlePolicySubmit = async (values: any) => {
    try {
      if (editingPolicy) {
        // 编辑现有策略
        console.log('更新策略:', { ...editingPolicy, ...values });
      } else {
        // 创建新策略
        console.log('创建策略:', values);
      }
      setPolicyModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存策略失败:', error);
    }
  };

  // 统计数据
  const overviewStats = {
    totalPolicies: schedulingPolicies.length,
    activePolicies: schedulingPolicies.filter(p => p.status === 'active').length,
    totalScheduled: schedulingRecords.filter(r => r.status === 'scheduled').length,
    failedScheduling: schedulingRecords.filter(r => r.status === 'failed').length,
    avgSchedulingTime: clusterMetrics.reduce((acc, m) => acc + m.avgSchedulingTime, 0) / clusterMetrics.length,
  };

  // 添加拓扑组件
  const ClusterSchedulingTopology = () => {
    const [resourceType, setResourceType] = useState<'workload' | 'service' | 'configuration'>('workload');
    const [loading, setLoading] = useState(false);

    // 获取调度数据
    const { data: schedulingData } = useQuery({
      queryKey: ['getSchedulingList', resourceType],
      queryFn: async () => {
        const ret = await getSchedulingList({ resourceType });
        return ret.data;
      },
    });

    return (
      <div>
        {/* 资源类型选择器 */}
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Text>资源类型:</Text>
            <Select
              value={resourceType}
              onChange={setResourceType}
              style={{ width: 150 }}
            >
              <Option value="workload">工作负载</Option>
              <Option value="service">服务</Option>
              <Option value="configuration">配置</Option>
            </Select>
          </Space>
        </div>

        <SchedulingTopology 
          data={schedulingData?.data || []}
          resourceType={resourceType}
          loading={loading}
          onRefresh={() => {
            setLoading(true);
            // 这里可以添加刷新逻辑
            setTimeout(() => setLoading(false), 1000);
          }}
        />
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
          {Array.from({ length: 12 }, (_, i) => (
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
              ⚡ CLUSTER SCHEDULING
            </Title>
            <Text className="text-gray-600 text-lg">
              集群资源调度策略管理与监控中心
            </Text>
          </div>

          {/* 概览统计卡片 */}
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="tech-card">
                <Statistic
                  title="调度策略总数"
                  value={overviewStats.totalPolicies}
                  prefix={<SettingOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="tech-card">
                <Statistic
                  title="活跃策略"
                  value={overviewStats.activePolicies}
                  prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="tech-card">
                <Statistic
                  title="成功调度"
                  value={overviewStats.totalScheduled}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="tech-card">
                <Statistic
                  title="平均调度时间"
                  value={overviewStats.avgSchedulingTime.toFixed(1)}
                  suffix="s"
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

                      {/* 主要内容区域 */}
          <div className="tech-card">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size="large"
              items={[
                {
                  key: 'topology',
                  label: (
                    <span>
                      <NodeIndexOutlined />
                      调度拓扑
                    </span>
                  ),
                  children: <ClusterSchedulingTopology />,
                },
                {
                  key: 'policies',
                  label: (
                    <span>
                      <SettingOutlined />
                      调度策略
                    </span>
                  ),
                  children: (
                    <div>
                      {/* 策略管理工具栏 */}
                      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Search
                            placeholder="搜索策略名称"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 300 }}
                          />
                          <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 120 }}
                          >
                            <Option value="all">全部状态</Option>
                            <Option value="active">活跃</Option>
                            <Option value="inactive">未激活</Option>
                            <Option value="error">错误</Option>
                          </Select>
                        </Space>
                        <Space>
                          <Button icon={<ReloadOutlined />}>刷新</Button>
                          <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={handleCreatePolicy}
                          >
                            创建策略
                          </Button>
                        </Space>
                      </div>

                      {/* 策略列表表格 */}
                      <Table
                        columns={policyColumns}
                        dataSource={schedulingPolicies.filter(policy => {
                          const matchesSearch = policy.name.toLowerCase().includes(searchText.toLowerCase());
                          const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        })}
                        rowKey="id"
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'records',
                  label: (
                    <span>
                      <BarChartOutlined />
                      调度记录
                    </span>
                  ),
                  children: (
                    <div>
                      {/* 记录查看工具栏 */}
                      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Search
                            placeholder="搜索资源名称"
                            style={{ width: 300 }}
                          />
                          <Select defaultValue="all" style={{ width: 120 }}>
                            <Option value="all">全部状态</Option>
                            <Option value="scheduled">已调度</Option>
                            <Option value="scheduling">调度中</Option>
                            <Option value="failed">调度失败</Option>
                            <Option value="pending">等待中</Option>
                          </Select>
                          <Select defaultValue="all" style={{ width: 150 }}>
                            <Option value="all">全部资源类型</Option>
                            <Option value="deployment">Deployment</Option>
                            <Option value="service">Service</Option>
                            <Option value="configmap">ConfigMap</Option>
                            <Option value="secret">Secret</Option>
                          </Select>
                        </Space>
                        <Button icon={<ReloadOutlined />}>刷新</Button>
                      </div>

                      {/* 调度记录表格 */}
                      <Table
                        columns={recordColumns}
                        dataSource={schedulingRecords}
                        rowKey="id"
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'metrics',
                  label: (
                    <span>
                      <DashboardOutlined />
                      集群指标
                    </span>
                  ),
                  children: (
                    <div>
                      {/* 集群指标说明 */}
                      <Alert
                        message="集群调度指标监控"
                        description="实时监控各集群的调度负载、成功率和性能指标，帮助优化调度策略。"
                        type="info"
                        showIcon
                        style={{ marginBottom: '16px' }}
                      />

                      {/* 集群指标表格 */}
                      <Table
                        columns={metricsColumns}
                        dataSource={clusterMetrics}
                        rowKey="clusterName"
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                        }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>

        {/* 策略创建/编辑模态框 */}
        <Modal
          title={editingPolicy ? '编辑调度策略' : '创建调度策略'}
          open={policyModalVisible}
          onCancel={() => setPolicyModalVisible(false)}
          onOk={() => form.submit()}
          width={800}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handlePolicySubmit}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="策略名称"
                  rules={[{ required: true, message: '请输入策略名称' }]}
                >
                  <Input placeholder="输入策略名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="策略类型"
                  rules={[{ required: true, message: '请选择策略类型' }]}
                >
                  <Select placeholder="选择策略类型">
                    <Option value="affinity">亲和性调度</Option>
                    <Option value="anti-affinity">反亲和性调度</Option>
                    <Option value="spread">分散部署</Option>
                    <Option value="priority">优先级调度</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label="优先级"
                  rules={[{ required: true, message: '请设置优先级' }]}
                >
                  <InputNumber 
                    min={1} 
                    max={10} 
                    placeholder="1-10，数字越小优先级越高" 
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="策略状态"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="targetClusters"
                  label="目标集群"
                  rules={[{ required: true, message: '请选择目标集群' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择目标集群"
                    options={clusterData?.clusters?.map(cluster => ({
                      label: cluster.objectMeta.name,
                      value: cluster.objectMeta.name,
                    })) || []}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </ScrollContainer>
  );
};

export default ClusterSchedulingPage;

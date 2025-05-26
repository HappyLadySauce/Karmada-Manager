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

import i18nInstance from '@/utils/i18n';
import Panel from '@/components/panel';
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
  Divider,
  Avatar,
  Tooltip,
  Tag,
  Button,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview.ts';
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

const Overview = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
    refetchInterval: 30000, // 30秒自动刷新
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
                    onClick={() => refetch()}
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
                  bodyStyle={{ padding: '16px' }}
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
                      bodyStyle={{ padding: '16px' }}
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
                            strokeWidth={8}
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
                                (data.memberClusterStatus.memorySummary.allocatedMemory / 8 / 1024 / 1024).toFixed(2) : 0}GB / 
                              {data?.memberClusterStatus?.memorySummary?.totalMemory ? 
                                (data.memberClusterStatus.memorySummary.totalMemory / 8 / 1024 / 1024).toFixed(0) : 0}GB
                            </Text>
                          </div>
                          <Progress
                            percent={memoryUsagePercent}
                            strokeColor={{ '0%': '#10b981', '100%': '#059669' }}
                            trailColor="#f3f4f6"
                            className="modern-progress"
                            strokeWidth={8}
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
                      bodyStyle={{ padding: '12px' }}
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


          </div>
        </Spin>
      </div>
    </div>
  );
};

export default Overview;

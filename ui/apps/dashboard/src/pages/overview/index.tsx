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
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview.ts';
import dayjs from 'dayjs';
import { Pie, Column } from '@ant-design/plots';
import {
  ClusterOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Overview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
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

  const podUsagePercent = data?.memberClusterStatus?.podSummary
    ? Math.round(
        (data.memberClusterStatus.podSummary.allocatedPod /
          data.memberClusterStatus.podSummary.totalPod) *
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

  // 资源使用情况饼图数据
  const resourcePieData = [
    {
      type: 'CPU',
      value: cpuUsagePercent,
      color: '#1890ff',
    },
    {
      type: 'Memory',
      value: memoryUsagePercent,
      color: '#52c41a',
    },
    {
      type: 'Pod',
      value: podUsagePercent,
      color: '#faad14',
    },
    {
      type: 'Node',
      value: nodeUsagePercent,
      color: '#722ed1',
    },
  ];

  // 多云资源柱状图数据
  const resourceColumnData = [
    {
      type: i18nInstance.t('1200778cf86309309154ef88804fa22e', '多云命名空间'),
      value: data?.clusterResourceStatus?.namespaceNum || 0,
      color: '#1890ff',
    },
    {
      type: i18nInstance.t('3692cf6a2e079d34e7e5035aa98b1335', '多云工作负载'),
      value: data?.clusterResourceStatus?.workloadNum || 0,
      color: '#52c41a',
    },
    {
      type: i18nInstance.t(
        '2030a6e845ad6476fecbc1711c9f139d',
        '多云服务与路由',
      ),
      value: data?.clusterResourceStatus?.serviceNum || 0,
      color: '#faad14',
    },
    {
      type: i18nInstance.t(
        '0287028ec7eefa1333b56ee340d325a0',
        '多云配置与秘钥',
      ),
      value: data?.clusterResourceStatus?.configNum || 0,
      color: '#f5222d',
    },
  ];

  const pieConfig = {
    data: resourcePieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'inner',
      offset: '-50%',
      content: '{value}%',
      style: {
        textAlign: 'center',
        fontSize: 14,
        fill: '#fff',
        fontWeight: 'bold',
      },
    },
    legend: {
      position: 'bottom',
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
    statistic: {
      title: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        content: '资源使用率',
      },
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        content: '平均',
      },
    },
  };

  const columnConfig = {
    data: resourceColumnData,
    xField: 'type',
    yField: 'value',
    colorField: 'type',
    columnWidthRatio: 0.6,
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.8,
        fontSize: 12,
        fontWeight: 'bold',
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      type: {
        alias: '资源类型',
      },
      value: {
        alias: '数量',
      },
    },
  };

  return (
    <Spin spinning={isLoading}>
      <Panel>
        <div style={{ padding: '24px' }}>
          {/* 基本信息卡片 */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card>
                <Title level={3} style={{ marginBottom: 24 }}>
                  <InfoCircleOutlined
                    style={{ marginRight: 8, color: '#1890ff' }}
                  />
                  {i18nInstance.t(
                    '9e5ffa068ed435ced73dc9bf5dd8e09c',
                    '基本信息',
                  )}
                </Title>
                <Row gutter={[24, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="Karmada版本"
                        value={data?.karmadaInfo?.version?.gitVersion || '-'}
                        prefix={
                          <CloudServerOutlined style={{ color: '#1890ff' }} />
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>运行状态</Text>
                      </div>
                      {data?.karmadaInfo?.status === 'running' ? (
                        <Badge
                          color="green"
                          text={
                            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                              <CheckCircleOutlined style={{ marginRight: 4 }} />
                              {i18nInstance.t(
                                'd679aea3aae1201e38c4baaaeef86efe',
                                '运行中',
                              )}
                            </span>
                          }
                        />
                      ) : (
                        <Badge
                          color="red"
                          text={i18nInstance.t(
                            '903b25f64e1c0d9b7f56ed80c256a2e7',
                            '未知状态',
                          )}
                        />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="创建时间"
                        value={
                          (data?.karmadaInfo?.createTime &&
                            dayjs(data.karmadaInfo.createTime).format(
                              'YYYY-MM-DD',
                            )) ||
                          '-'
                        }
                        prefix={
                          <DatabaseOutlined style={{ color: '#52c41a' }} />
                        }
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic
                        title="节点数量"
                        value={`${data?.memberClusterStatus?.nodeSummary?.readyNum || 0}/${data?.memberClusterStatus?.nodeSummary?.totalNum || 0}`}
                        prefix={
                          <ClusterOutlined style={{ color: '#722ed1' }} />
                        }
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 资源使用情况 */}
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card>
                <Title level={4} style={{ marginBottom: 16 }}>
                  <SettingOutlined
                    style={{ marginRight: 8, color: '#52c41a' }}
                  />
                  集群资源使用情况
                </Title>
                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="large"
                >
                  <div>
                    <Text strong>CPU 使用率</Text>
                    <Progress
                      percent={cpuUsagePercent}
                      strokeColor="#1890ff"
                      format={(percent) =>
                        `${percent}% (${data?.memberClusterStatus?.cpuSummary?.allocatedCPU?.toFixed(2) || 0}/${data?.memberClusterStatus?.cpuSummary?.totalCPU || 0})`
                      }
                    />
                  </div>
                  <div>
                    <Text strong>内存使用率</Text>
                    <Progress
                      percent={memoryUsagePercent}
                      strokeColor="#52c41a"
                      format={(percent) =>
                        `${percent}% (${data?.memberClusterStatus?.memorySummary?.allocatedMemory ? (data.memberClusterStatus.memorySummary.allocatedMemory / 8 / 1024 / 1024).toFixed(2) : 0}GB/${data?.memberClusterStatus?.memorySummary?.totalMemory ? (data.memberClusterStatus.memorySummary.totalMemory / 8 / 1024 / 1024).toFixed(0) : 0}GB)`
                      }
                    />
                  </div>
                  <div>
                    <Text strong>Pod 使用率</Text>
                    <Progress
                      percent={podUsagePercent}
                      strokeColor="#faad14"
                      format={(percent) =>
                        `${percent}% (${data?.memberClusterStatus?.podSummary?.allocatedPod || 0}/${data?.memberClusterStatus?.podSummary?.totalPod || 0})`
                      }
                    />
                  </div>
                  <div>
                    <Text strong>节点就绪率</Text>
                    <Progress
                      percent={nodeUsagePercent}
                      strokeColor="#722ed1"
                      format={(percent) =>
                        `${percent}% (${data?.memberClusterStatus?.nodeSummary?.readyNum || 0}/${data?.memberClusterStatus?.nodeSummary?.totalNum || 0})`
                      }
                    />
                  </div>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <Title level={4} style={{ marginBottom: 16 }}>
                  资源使用率分布
                </Title>
                <Pie {...pieConfig} height={300} />
              </Card>
            </Col>
          </Row>

          {/* 策略和资源统计 */}
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card>
                <Title level={4} style={{ marginBottom: 16 }}>
                  <SettingOutlined
                    style={{ marginRight: 8, color: '#faad14' }}
                  />
                  策略统计
                </Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        backgroundColor: '#f0f9ff',
                      }}
                    >
                      <Statistic
                        title="调度策略"
                        value={
                          data?.clusterResourceStatus?.propagationPolicyNum || 0
                        }
                        valueStyle={{ color: '#1890ff', fontSize: 24 }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        backgroundColor: '#f6ffed',
                      }}
                    >
                      <Statistic
                        title="差异化策略"
                        value={
                          data?.clusterResourceStatus?.overridePolicyNum || 0
                        }
                        valueStyle={{ color: '#52c41a', fontSize: 24 }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <Title level={4} style={{ marginBottom: 16 }}>
                  多云资源分布
                </Title>
                <Column {...columnConfig} height={200} />
              </Card>
            </Col>
          </Row>
        </div>
      </Panel>
    </Spin>
  );
};

export default Overview;

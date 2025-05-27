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
import { Card, Row, Col, Space, Tag, Typography, Tooltip, Progress } from 'antd';
import { 
  HeartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';
import { DetailedHealthStatus, ComponentHealth, DependencyHealth } from '@/services/health';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface HealthStatusCardProps {
  title: string;
  healthData?: DetailedHealthStatus;
  loading?: boolean;
}

const HealthStatusCard: React.FC<HealthStatusCardProps> = ({
  title,
  healthData,
  loading = false
}) => {
  // 获取整体状态颜色和图标
  const getOverallStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          color: '#52c41a',
          icon: <CheckCircleOutlined />,
          text: '健康',
          bgColor: '#f6ffed'
        };
      case 'warning':
        return {
          color: '#faad14',
          icon: <ExclamationCircleOutlined />,
          text: '警告',
          bgColor: '#fffbe6'
        };
      case 'error':
        return {
          color: '#ff4d4f',
          icon: <CloseCircleOutlined />,
          text: '异常',
          bgColor: '#fff2f0'
        };
      default:
        return {
          color: '#d9d9d9',
          icon: <ExclamationCircleOutlined />,
          text: '未知',
          bgColor: '#fafafa'
        };
    }
  };

  // 获取组件图标
  const getComponentIcon = (name: string) => {
    const iconStyle = { fontSize: '16px' };
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('api') || lowerName.includes('server')) {
      return <ApiOutlined style={iconStyle} />;
    } else if (lowerName.includes('database') || lowerName.includes('etcd')) {
      return <DatabaseOutlined style={iconStyle} />;
    } else if (lowerName.includes('controller') || lowerName.includes('scheduler')) {
      return <CloudServerOutlined style={iconStyle} />;
    } else if (lowerName.includes('auth') || lowerName.includes('security')) {
      return <SecurityScanOutlined style={iconStyle} />;
    }
    return <CheckCircleOutlined style={iconStyle} />;
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return dayjs(timestamp).format('HH:mm:ss');
  };

  const overallStatus = healthData ? getOverallStatus(healthData.overall) : getOverallStatus('unknown');

  return (
    <Card
      className="modern-card"
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)',
        height: '100%'
      }}
      styles={{ body: { padding: '16px', height: '100%', overflow: 'hidden' } }}
      title={
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div className="header-icon-wrapper" style={{ width: 32, height: 32, fontSize: 16 }}>
            <HeartOutlined className="header-icon" />
          </div>
          <div className="header-text">
            <Title level={5} className="card-title" style={{ fontSize: '16px', marginBottom: '4px' }}>
              {title}
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>系统组件和依赖服务健康监控</Text>
          </div>
        </div>
      }
      extra={
        <Space>
          <Tag color={overallStatus.color === '#52c41a' ? 'green' : overallStatus.color === '#faad14' ? 'orange' : 'red'} style={{ fontSize: '13px' }}>
            {overallStatus.icon}
            <span style={{ marginLeft: 4 }}>{overallStatus.text}</span>
          </Tag>
        </Space>
      }
      loading={loading}
    >
      {healthData ? (
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {/* 整体状态展示 */}
          <div className="stat-item gradient-primary" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <div className="stat-icon" style={{ 
                  width: 32, 
                  height: 32, 
                  fontSize: 18, 
                  color: overallStatus.color 
                }}>
                  {overallStatus.icon}
                </div>
                <div className="stat-content">
                  <Text className="stat-label" style={{ fontSize: '14px' }}>系统整体状态</Text>
                  <Text className="stat-value" style={{ fontSize: '18px', fontWeight: 600, color: overallStatus.color }}>
                    {overallStatus.text}
                  </Text>
                </div>
              </Space>
              <Text style={{ fontSize: '14px', color: '#666' }}>
                实时监控
              </Text>
            </div>
          </div>

          {/* 系统组件状态 */}
          {healthData.components && healthData.components.length > 0 && (
            <div>
              <Title level={5} style={{ fontSize: '14px', marginBottom: '8px' }}>
                系统组件状态
              </Title>
              <Row gutter={[8, 8]}>
                {healthData.components.map((component, index) => {
                  const componentStatus = getOverallStatus(component.status);
                  return (
                    <Col xs={8} sm={8} md={8} key={index}>
                      <Tooltip
                        title={
                          <div>
                            <div><strong>{component.name}</strong></div>
                            <div>状态: {componentStatus.text}</div>
                            <div>消息: {component.message}</div>
                            <div>检查时间: {formatTime(component.lastCheck)}</div>
                          </div>
                        }
                      >
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fafafa',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            height: '100%'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            {getComponentIcon(component.name)}
                            <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                              {component.name}
                            </Text>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px'
                          }}>
                            <div style={{ 
                              fontSize: '14px', 
                              color: componentStatus.color 
                            }}>
                              {componentStatus.icon}
                            </div>
                            <Text style={{ fontSize: '13px', color: '#666' }}>
                              {componentStatus.text}
                            </Text>
                          </div>
                        </div>
                      </Tooltip>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          {/* 依赖服务状态 */}
          {healthData.dependencies && healthData.dependencies.length > 0 && (
            <div>
              <Title level={5} style={{ fontSize: '14px', marginBottom: '8px' }}>
                依赖服务状态
              </Title>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {healthData.dependencies.map((dependency, index) => {
                  const depStatus = getOverallStatus(dependency.status);
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #f0f0f0',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center'
                      }}>
                        <Space>
                          <div style={{ 
                            fontSize: '14px', 
                            color: depStatus.color 
                          }}>
                            {depStatus.icon}
                          </div>
                          <Text strong style={{ fontSize: '14px' }}>
                            {dependency.name}
                          </Text>
                        </Space>
                        <Space size="small">
                          {dependency.latency && (
                            <Text style={{ fontSize: '12px', color: '#666' }}>
                              延迟: {dependency.latency}
                            </Text>
                          )}
                          <Tag 
                            color={depStatus.color === '#52c41a' ? 'green' : depStatus.color === '#faad14' ? 'orange' : 'red'}
                            style={{ fontSize: '11px', margin: 0 }}
                          >
                            {depStatus.text}
                          </Tag>
                        </Space>
                      </div>
                      {dependency.message && (
                        <Text style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '6px' }}>
                          {dependency.message}
                        </Text>
                      )}
                    </div>
                  );
                })}
              </Space>
            </div>
          )}
        </Space>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <ExclamationCircleOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
          <div style={{ fontSize: '14px' }}>健康状态数据加载中...</div>
        </div>
      )}
    </Card>
  );
};

export default HealthStatusCard; 
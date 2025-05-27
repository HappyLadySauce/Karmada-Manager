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
import { Card, List, Tag, Typography, Space, Avatar, Button, Empty } from 'antd';
import { 
  AlertOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { EventInfo } from '@/services/monitoring';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

interface EventAlertCardProps {
  title: string;
  events: EventInfo[];
  loading?: boolean;
  onRefresh?: () => void;
  onViewAll?: () => void;
}

const EventAlertCard: React.FC<EventAlertCardProps> = ({
  title,
  events,
  loading = false,
  onRefresh,
  onViewAll
}) => {
  // 获取严重程度图标和颜色
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'medium':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'low':
        return <InfoCircleOutlined style={{ color: '#52c41a' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '未知';
    }
  };

  // 获取事件类型颜色
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warning':
        return 'orange';
      case 'error':
        return 'red';
      case 'info':
        return 'blue';
      case 'normal':
        return 'green';
      default:
        return 'default';
    }
  };

  // 格式化时间显示
  const formatTime = (timestamp: string) => {
    const time = dayjs(timestamp);
    const now = dayjs();
    const diffMinutes = now.diff(time, 'minute');
    
    if (diffMinutes < 1) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}小时前`;
    } else {
      return time.format('MM-DD HH:mm');
    }
  };

  // 截取消息长度
  const truncateMessage = (message: string, maxLength = 80) => {
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  };

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
            <AlertOutlined className="header-icon" />
          </div>
          <div className="header-text">
            <Title level={5} className="card-title" style={{ fontSize: '16px', marginBottom: '4px' }}>
              {title}
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>系统事件和告警信息监控</Text>
          </div>
        </div>
      }
      extra={
        <Space>
          <Tag color="red" icon={<AlertOutlined />} style={{ fontSize: '13px' }}>
            事件告警
          </Tag>
          {events.length > 0 && (
            <Tag color="blue" style={{ fontSize: '13px' }}>
              {events.length} 项
            </Tag>
          )}
          <Button 
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            刷新
          </Button>
          {onViewAll && events.length > 0 && (
            <Button 
              size="small"
              type="link"
              icon={<HistoryOutlined />}
              onClick={onViewAll}
            >
              查看全部
            </Button>
          )}
        </Space>
      }
    >
      {events.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#999' }}>
              暂无事件告警
            </span>
          }
          style={{ padding: '20px 0' }}
        />
      ) : (
        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
          <List
            size="small"
            dataSource={events.slice(0, 4)} // 最多显示4个事件
            renderItem={(event) => (
            <List.Item
              style={{ 
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    {getSeverityIcon(event.severity)}
                    <Text strong style={{ fontSize: '14px' }}>
                      {event.source}
                    </Text>
                    <Tag 
                      color={getTypeColor(event.type)} 
                      style={{ fontSize: '12px', lineHeight: '18px', marginRight: 0 }}
                    >
                      {event.type}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag 
                      color={getSeverityColor(event.severity)} 
                      style={{ fontSize: '12px', lineHeight: '18px', margin: 0 }}
                    >
                      {getSeverityText(event.severity)}
                    </Tag>
                  </div>
                </div>
                
                <div style={{ marginBottom: '6px' }}>
                  <Text style={{ fontSize: '14px', color: '#666' }}>
                    {truncateMessage(event.message)}
                  </Text>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: '12px', color: '#999' }}>
                    分类: {event.category}
                  </Text>
                  <Text style={{ fontSize: '12px', color: '#999' }}>
                    {formatTime(event.timestamp)}
                  </Text>
                </div>
              </div>
            </List.Item>
          )}
        />
        </div>
      )}
    </Card>
  );
};

export default EventAlertCard; 
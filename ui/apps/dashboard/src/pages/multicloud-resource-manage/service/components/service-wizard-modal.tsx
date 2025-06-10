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
  Modal,
  Steps,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Card,
  Row,
  Col,
  message,
  Typography,
  Alert,
  Collapse,
  Badge,
  Tag,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  SettingOutlined,
  CloudOutlined,
  ApiOutlined,
  GlobalOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { CreateResource } from '@/services/unstructured';
import { IResponse, ServiceKind } from '@/services/base';
import { ServiceType, Protocol } from '@/services/service';
import { stringify } from 'yaml';
import useNamespace from '@/hooks/use-namespace';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface ServiceWizardModalProps {
  open: boolean;
  kind: ServiceKind;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

interface ServicePort {
  name?: string;
  port: number;
  targetPort: number;
  protocol: Protocol;
  nodePort?: number;
}

interface IngressRule {
  host?: string;
  path: string;
  pathType: 'Prefix' | 'Exact' | 'ImplementationSpecific';
  serviceName: string;
  servicePort: number;
}

interface ServiceConfig {
  metadata: {
    name: string;
    namespace: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  spec: {
    type: ServiceType;
    ports: ServicePort[];
    selector: Record<string, string>;
    sessionAffinity?: 'None' | 'ClientIP';
    externalTrafficPolicy?: 'Cluster' | 'Local';
    // Ingress specific
    ingressClassName?: string;
    rules: IngressRule[];
    tls?: Array<{
      secretName: string;
      hosts: string[];
    }>;
  };
}

const ServiceWizardModal: React.FC<ServiceWizardModalProps> = ({
  open,
  kind,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 添加命名空间数据获取
  const { nsOptions, isNsDataLoading } = useNamespace({});
  
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>({
    metadata: {
      name: '',
      namespace: 'default',
      labels: {},
      annotations: {},
    },
    spec: {
      type: ServiceType.ClusterIP,
      ports: [
        {
          name: 'http',
          port: 80,
          targetPort: 80,
          protocol: Protocol.TCP,
        },
      ],
      selector: {},
      rules: [
        {
          path: '/',
          pathType: 'Prefix' as const,
          serviceName: '',
          servicePort: 80,
        },
      ],
    },
  });

  const getServiceKindLabel = (kind: ServiceKind) => {
    const kindMap: Partial<Record<ServiceKind, string>> = {
      [ServiceKind.Service]: 'Service',
      [ServiceKind.Ingress]: 'Ingress',
    };
    return kindMap[kind] || kind;
  };

  const getServiceDescription = (kind: ServiceKind) => {
    const descriptions: Partial<Record<ServiceKind, string>> = {
      [ServiceKind.Service]: '为Pod提供稳定的网络端点和负载均衡',
      [ServiceKind.Ingress]: '提供HTTP/HTTPS路由规则，管理外部访问',
    };
    return descriptions[kind] || '';
  };

  const getServiceIcon = (kind: ServiceKind) => {
    const icons: Partial<Record<ServiceKind, React.ReactElement>> = {
      [ServiceKind.Service]: <CloudOutlined />,
      [ServiceKind.Ingress]: <GlobalOutlined />,
    };
    return icons[kind] || <CloudOutlined />;
  };

  // Service选择器配置组件
  const renderServiceSelectorConfig = () => (
    <Card 
      title={
        <Space>
          <ApiOutlined />
          <Text>工作负载绑定</Text>
          <Badge 
            count={Object.keys(serviceConfig.spec.selector).length} 
            size="small" 
            style={{ backgroundColor: Object.keys(serviceConfig.spec.selector).length > 0 ? '#52c41a' : '#ff4d4f' }}
          />
        </Space>
      } 
      size="small" 
      style={{ marginBottom: 16 }}
    >
      <Alert
        message="重要提示"
        description="Service需要通过选择器(selector)来匹配后端Pod，确保Service能正确路由流量到工作负载"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const key = 'app';
              updateServiceConfig(`spec.selector.${key}`, serviceConfig.metadata.name);
            }}
            size="small"
          >
            添加选择器
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              // 设置常用的选择器模板
              updateServiceConfig('spec.selector', { 
                app: serviceConfig.metadata.name,
                component: 'backend'
              });
            }}
          >
            使用模板
          </Button>
        </Space>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          常用格式: app=服务名, component=组件名
        </Text>
      </Space>

      {Object.keys(serviceConfig.spec.selector).length === 0 && (
        <Alert
          message="未配置选择器"
          description="当前Service没有配置选择器，将无法绑定到任何工作负载。请添加至少一个选择器来匹配目标Pod。"
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {Object.entries(serviceConfig.spec.selector).map(([key, value]) => (
        <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
          <Col span={10}>
            <Input
              placeholder="选择器键 (如: app)"
              value={key}
              onChange={(e) => {
                const newConfig = { ...serviceConfig };
                delete newConfig.spec.selector[key];
                newConfig.spec.selector[e.target.value] = value;
                setServiceConfig(newConfig);
              }}
            />
          </Col>
          <Col span={10}>
            <Input
              placeholder="选择器值 (如: nginx)"
              value={value}
              onChange={(e) => updateServiceConfig(`spec.selector.${key}`, e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                const newConfig = { ...serviceConfig };
                delete newConfig.spec.selector[key];
                setServiceConfig(newConfig);
              }}
            />
          </Col>
        </Row>
      ))}

      <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: '#f6f8fa', borderRadius: '4px', border: '1px solid #d0d7de' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          💡 <strong>绑定说明:</strong> 选择器会匹配具有相同标签的Pod。例如，如果您的Deployment的Pod标签是 
          <code style={{ margin: '0 4px' }}>app: nginx</code>，
          那么Service的选择器应该设置为 
          <code style={{ margin: '0 4px' }}>app: nginx</code>
        </Text>
      </div>
    </Card>
  );

  // 重置配置到默认值
  useEffect(() => {
    if (open) {
      setServiceConfig(prev => ({
        ...prev,
        spec: {
          ...prev.spec,
          ...(kind === ServiceKind.Service && {
            type: ServiceType.ClusterIP,
            ports: [
              {
                name: 'http',
                port: 80,
                targetPort: 80,
                protocol: Protocol.TCP,
              },
            ],
            selector: {},
          }),
          ...(kind === ServiceKind.Ingress && {
            ingressClassName: 'nginx',
            rules: [
              {
                path: '/',
                pathType: 'Prefix' as const,
                serviceName: '',
                servicePort: 80,
              },
            ],
          }),
        },
      }));
    }
  }, [open, kind]);

  const generateYAML = (config: ServiceConfig) => {
    let apiVersion = 'v1';
    
    if (kind === ServiceKind.Ingress) {
      apiVersion = 'networking.k8s.io/v1';
    }

    const baseMetadata = {
      name: config.metadata.name,
      namespace: config.metadata.namespace,
      labels: {
        app: config.metadata.name,
        ...config.metadata.labels,
      },
      ...(Object.keys(config.metadata.annotations).length > 0 && {
        annotations: config.metadata.annotations,
      }),
    };

    if (kind === ServiceKind.Service) {
      return {
        apiVersion,
        kind: 'Service',
        metadata: baseMetadata,
        spec: {
          type: config.spec.type,
          ports: config.spec.ports.map(port => ({
            name: port.name,
            port: port.port,
            targetPort: port.targetPort,
            protocol: port.protocol,
            ...(config.spec.type === ServiceType.NodePort && port.nodePort && {
              nodePort: port.nodePort,
            }),
          })),
          selector: config.spec.selector,
          ...(config.spec.sessionAffinity && {
            sessionAffinity: config.spec.sessionAffinity,
          }),
          ...(config.spec.externalTrafficPolicy && 
              (config.spec.type === ServiceType.NodePort || config.spec.type === ServiceType.LoadBalancer) && {
            externalTrafficPolicy: config.spec.externalTrafficPolicy,
          }),
        },
      };
    }

    // Ingress
    return {
      apiVersion,
      kind: 'Ingress',
      metadata: baseMetadata,
      spec: {
        ...(config.spec.ingressClassName && {
          ingressClassName: config.spec.ingressClassName,
        }),
        rules: config.spec.rules.map(rule => ({
          ...(rule.host && { host: rule.host }),
          http: {
            paths: [
              {
                path: rule.path,
                pathType: rule.pathType,
                backend: {
                  service: {
                    name: rule.serviceName,
                    port: {
                      number: rule.servicePort,
                    },
                  },
                },
              },
            ],
          },
        })),
        ...(config.spec.tls && config.spec.tls.length > 0 && {
          tls: config.spec.tls,
        }),
      },
    };
  };

  const handleNext = async () => {
    try {
      await form.validateFields();
      
      // 在第一步验证Service选择器
      if (currentStep === 0 && kind === ServiceKind.Service) {
        if (Object.keys(serviceConfig.spec.selector).length === 0) {
          message.error('请在"工作负载绑定"部分添加至少一个选择器来匹配目标Pod');
          return;
        }
      }
      
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleSubmit();
      }
    } catch (error) {
      message.error('请填写必填字段');
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const yamlObject = generateYAML(serviceConfig);
      
      const ret = await CreateResource({
        kind: getServiceKindLabel(kind),
        name: serviceConfig.metadata.name,
        namespace: serviceConfig.metadata.namespace,
        content: yamlObject,
      });

      await onOk(ret);
      handleReset();
    } catch (error) {
      console.error('创建服务失败:', error);
      message.error('创建服务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    form.resetFields();
    const defaultConfig = {
      metadata: {
        name: '',
        namespace: 'default',
        labels: {},
        annotations: {},
      },
      spec: {
        type: ServiceType.ClusterIP,
        ports: [
          {
            name: 'http',
            port: 80,
            targetPort: 80,
            protocol: Protocol.TCP,
          },
        ],
        selector: {},
        rules: [
          {
            path: '/',
            pathType: 'Prefix' as const,
            serviceName: '',
            servicePort: 80,
          },
        ],
      },
    };
    setServiceConfig(defaultConfig);
    // 重置表单字段值
    form.setFieldsValue({
      name: '',
      namespace: 'default',
      serviceType: ServiceType.ClusterIP,
      sessionAffinity: 'None',
      externalTrafficPolicy: 'Cluster',
      ingressClassName: 'nginx',
    });
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const updateServiceConfig = (path: string, value: any) => {
    setServiceConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const addPort = () => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.ports.push({
      name: `port-${newConfig.spec.ports.length + 1}`,
      port: 80,
      targetPort: 80,
      protocol: Protocol.TCP,
    });
    setServiceConfig(newConfig);
  };

  const removePort = (index: number) => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.ports.splice(index, 1);
    setServiceConfig(newConfig);
  };

  const updatePort = (index: number, field: string, value: any) => {
    const newConfig = { ...serviceConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.ports[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setServiceConfig(newConfig);
  };

  const addRule = () => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.rules.push({
      path: '/',
      pathType: 'Prefix' as const,
      serviceName: '',
      servicePort: 80,
    });
    setServiceConfig(newConfig);
  };

  const removeRule = (index: number) => {
    const newConfig = { ...serviceConfig };
    newConfig.spec.rules.splice(index, 1);
    setServiceConfig(newConfig);
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newConfig = { ...serviceConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.rules[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setServiceConfig(newConfig);
  };

  const renderBasicConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <Alert
        message={
          <Space>
            {getServiceIcon(kind)}
            <Text strong>{getServiceKindLabel(kind)}</Text>
          </Space>
        }
        description={getServiceDescription(kind)}
        type="info"
        showIcon={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" size="large">
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="服务名称"
                name="name"
                initialValue={serviceConfig.metadata.name}
                rules={[
                  { required: true, message: '请输入服务名称' },
                  { pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, message: '名称只能包含小写字母、数字和连字符' }
                ]}
              >
                <Input
                  placeholder="输入服务名称"
                  onChange={(e) => {
                    updateServiceConfig('metadata.name', e.target.value);
                    form.setFieldValue('name', e.target.value);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="命名空间"
                name="namespace"
                initialValue={serviceConfig.metadata.namespace}
                rules={[{ required: true, message: '请输入命名空间' }]}
              >
                <Select
                  placeholder="选择命名空间"
                  onChange={(value) => {
                    updateServiceConfig('metadata.namespace', value);
                    form.setFieldValue('namespace', value);
                  }}
                  loading={isNsDataLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {nsOptions.map((ns: any) => (
                    <Option key={ns.value} value={ns.value}>
                      {ns.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 服务特定配置 */}
        {renderServiceSpecificConfig()}

        {/* Service 选择器配置 - 移到基本配置步骤 */}
        {kind === ServiceKind.Service && renderServiceSelectorConfig()}
      </Form>
    </div>
  );

  const renderServiceSpecificConfig = () => {
    if (kind === ServiceKind.Service) {
      return (
        <Card title="Service 配置" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="服务类型" name="serviceType">
                <Select
                  value={serviceConfig.spec.type}
                  onChange={(value) => updateServiceConfig('spec.type', value)}
                >
                  <Option value={ServiceType.ClusterIP}>ClusterIP</Option>
                  <Option value={ServiceType.NodePort}>NodePort</Option>
                  <Option value={ServiceType.LoadBalancer}>LoadBalancer</Option>
                  <Option value={ServiceType.ExternalName}>ExternalName</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="会话亲和性" name="sessionAffinity">
                <Select
                  value={serviceConfig.spec.sessionAffinity || 'None'}
                  onChange={(value) => updateServiceConfig('spec.sessionAffinity', value)}
                >
                  <Option value="None">None</Option>
                  <Option value="ClientIP">ClientIP</Option>
                </Select>
              </Form.Item>
            </Col>
            {(serviceConfig.spec.type === ServiceType.NodePort || 
              serviceConfig.spec.type === ServiceType.LoadBalancer) && (
              <Col span={8}>
                <Form.Item label="外部流量策略" name="externalTrafficPolicy">
                  <Select
                    value={serviceConfig.spec.externalTrafficPolicy || 'Cluster'}
                    onChange={(value) => updateServiceConfig('spec.externalTrafficPolicy', value)}
                  >
                    <Option value="Cluster">Cluster</Option>
                    <Option value="Local">Local</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>
      );
    } else {
      return (
        <Card title="Ingress 配置" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Ingress 类名" name="ingressClassName">
                <Input
                  placeholder="例如: nginx"
                  value={serviceConfig.spec.ingressClassName}
                  onChange={(e) => updateServiceConfig('spec.ingressClassName', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      );
    }
  };

  const renderPortConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      {kind === ServiceKind.Service ? (
        <Card
          title={
            <Space>
              <ApiOutlined />
              <Text>端口配置</Text>
              <Badge count={serviceConfig.spec.ports.length} size="small" />
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          {serviceConfig.spec.ports.map((port, portIndex) => (
            <div
              key={portIndex}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Space>
                  <Badge count={portIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                    <div style={{ width: 16, height: 16 }} />
                  </Badge>
                  <Text strong>{port.name || `端口 ${portIndex + 1}`}</Text>
                </Space>
                {serviceConfig.spec.ports.length > 1 && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removePort(portIndex)}
                  >
                    删除
                  </Button>
                )}
              </div>

              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Form.Item label="端口名称" style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={port.name}
                      onChange={(e) => updatePort(portIndex, 'name', e.target.value)}
                      placeholder="例如: http"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="协议" style={{ marginBottom: 8 }}>
                    <Select
                      size="small"
                      value={port.protocol}
                      onChange={(value) => updatePort(portIndex, 'protocol', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value={Protocol.TCP}>TCP</Option>
                      <Option value={Protocol.UDP}>UDP</Option>
                      <Option value={Protocol.SCTP}>SCTP</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col span={serviceConfig.spec.type === ServiceType.NodePort ? 8 : 12}>
                  <Form.Item label="端口" required style={{ marginBottom: 8 }}>
                    <InputNumber
                      size="small"
                      value={port.port}
                      onChange={(value) => updatePort(portIndex, 'port', value || 80)}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
                <Col span={serviceConfig.spec.type === ServiceType.NodePort ? 8 : 12}>
                  <Form.Item label="目标端口" required style={{ marginBottom: 8 }}>
                    <InputNumber
                      size="small"
                      value={port.targetPort}
                      onChange={(value) => updatePort(portIndex, 'targetPort', value || 80)}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
                {serviceConfig.spec.type === ServiceType.NodePort && (
                  <Col span={8}>
                    <Form.Item label="NodePort" style={{ marginBottom: 8 }}>
                      <InputNumber
                        size="small"
                        value={port.nodePort}
                        onChange={(value) => updatePort(portIndex, 'nodePort', value)}
                        style={{ width: '100%' }}
                        min={30000}
                        max={32767}
                        placeholder="30000-32767"
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </div>
          ))}
          
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addPort}
            style={{ width: '100%', marginTop: 8 }}
            size="middle"
          >
            添加端口
          </Button>
        </Card>
      ) : (
        <Card
          title={
            <Space>
              <LinkOutlined />
              <Text>路由规则</Text>
              <Badge count={serviceConfig.spec.rules.length} size="small" />
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          {serviceConfig.spec.rules.map((rule, ruleIndex) => (
            <div
              key={ruleIndex}
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Space>
                  <Badge count={ruleIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                    <div style={{ width: 16, height: 16 }} />
                  </Badge>
                  <Text strong>{rule.host || `规则 ${ruleIndex + 1}`}</Text>
                </Space>
                {serviceConfig.spec.rules.length > 1 && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeRule(ruleIndex)}
                  >
                    删除
                  </Button>
                )}
              </div>

              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Form.Item label="主机名" style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={rule.host}
                      onChange={(e) => updateRule(ruleIndex, 'host', e.target.value)}
                      placeholder="example.com"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="路径类型" style={{ marginBottom: 8 }}>
                    <Select
                      size="small"
                      value={rule.pathType}
                      onChange={(value) => updateRule(ruleIndex, 'pathType', value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="Prefix">Prefix</Option>
                      <Option value="Exact">Exact</Option>
                      <Option value="ImplementationSpecific">ImplementationSpecific</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col span={24}>
                  <Form.Item label="路径" required style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={rule.path}
                      onChange={(e) => updateRule(ruleIndex, 'path', e.target.value)}
                      placeholder="/"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 8]}>
                <Col span={16}>
                  <Form.Item label="后端服务名" required style={{ marginBottom: 8 }}>
                    <Input
                      size="small"
                      value={rule.serviceName}
                      onChange={(e) => updateRule(ruleIndex, 'serviceName', e.target.value)}
                      placeholder="backend-service"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="服务端口" required style={{ marginBottom: 8 }}>
                    <InputNumber
                      size="small"
                      value={rule.servicePort}
                      onChange={(value) => updateRule(ruleIndex, 'servicePort', value || 80)}
                      style={{ width: '100%' }}
                      min={1}
                      max={65535}
                      placeholder="80"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          ))}
          
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addRule}
            style={{ width: '100%', marginTop: 8 }}
            size="middle"
          >
            添加规则
          </Button>
        </Card>
      )}
    </div>
  );

  const renderAdvancedConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>

      <Card title="标签和注解" size="small" style={{ marginBottom: 16 }}>
        <Collapse ghost>
          <Panel header="标签 (Labels)" key="labels">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const key = `label-${Date.now()}`;
                updateServiceConfig(`metadata.labels.${key}`, '');
              }}
              style={{ marginBottom: 8 }}
              size="small"
            >
              添加标签
            </Button>
            {Object.entries(serviceConfig.metadata.labels).map(([key, value]) => (
              key !== 'app' && (
                <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Input
                      placeholder="标签键"
                      value={key}
                      onChange={(e) => {
                        const newConfig = { ...serviceConfig };
                        delete newConfig.metadata.labels[key];
                        newConfig.metadata.labels[e.target.value] = value;
                        setServiceConfig(newConfig);
                      }}
                    />
                  </Col>
                  <Col span={10}>
                    <Input
                      placeholder="标签值"
                      value={value}
                      onChange={(e) => updateServiceConfig(`metadata.labels.${key}`, e.target.value)}
                    />
                  </Col>
                  <Col span={4}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const newConfig = { ...serviceConfig };
                        delete newConfig.metadata.labels[key];
                        setServiceConfig(newConfig);
                      }}
                    />
                  </Col>
                </Row>
              )
            ))}
          </Panel>

          <Panel header="注解 (Annotations)" key="annotations">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const key = `annotation-${Date.now()}`;
                updateServiceConfig(`metadata.annotations.${key}`, '');
              }}
              style={{ marginBottom: 8 }}
              size="small"
            >
              添加注解
            </Button>
            {Object.entries(serviceConfig.metadata.annotations).map(([key, value]) => (
              <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                <Col span={10}>
                  <Input
                    placeholder="注解键"
                    value={key}
                    onChange={(e) => {
                      const newConfig = { ...serviceConfig };
                      delete newConfig.metadata.annotations[key];
                      newConfig.metadata.annotations[e.target.value] = value;
                      setServiceConfig(newConfig);
                    }}
                  />
                </Col>
                <Col span={10}>
                  <Input
                    placeholder="注解值"
                    value={value}
                    onChange={(e) => updateServiceConfig(`metadata.annotations.${key}`, e.target.value)}
                  />
                </Col>
                <Col span={4}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const newConfig = { ...serviceConfig };
                      delete newConfig.metadata.annotations[key];
                      setServiceConfig(newConfig);
                    }}
                  />
                </Col>
              </Row>
            ))}
          </Panel>
        </Collapse>
      </Card>
    </div>
  );

  const renderPreview = () => {
    const yamlObject = generateYAML(serviceConfig);
    const yamlContent = stringify(yamlObject);
    
    // 检查配置有效性
    const hasSelector = kind === ServiceKind.Service && Object.keys(serviceConfig.spec.selector).length > 0;
    const hasValidIngress = kind === ServiceKind.Ingress && serviceConfig.spec.rules.some(rule => rule.serviceName);
    const isConfigValid = kind === ServiceKind.Service ? hasSelector : hasValidIngress;
    
    return (
      <div style={{ height: '700px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            <Space>
              <CheckCircleOutlined style={{ color: isConfigValid ? '#52c41a' : '#ff4d4f' }} />
              配置预览
            </Space>
          </Title>
          <Button
            type="link"
            onClick={() => {
              navigator.clipboard.writeText(yamlContent);
              message.success('YAML 已复制到剪贴板');
            }}
          >
            复制 YAML
          </Button>
        </Space>
        
        {/* 基本信息 */}
        <Card 
          title={
            <Space>
              <span style={{ fontSize: '16px' }}>🏷️</span>
              <Text strong>基本信息</Text>
            </Space>
          }
          size="small" 
          style={{ marginBottom: 12, flexShrink: 0 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">服务类型:</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ color: '#1890ff' }}>{getServiceKindLabel(kind)}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">服务名称:</Text>
              <div style={{ marginTop: 4 }}>
                <Text code>{serviceConfig.metadata.name}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">命名空间:</Text>
              <div style={{ marginTop: 4 }}>
                <Text code>{serviceConfig.metadata.namespace}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">配置状态:</Text>
              <div style={{ marginTop: 4 }}>
                {isConfigValid ? (
                  <Text strong style={{ color: '#52c41a' }}>✅ 验证通过</Text>
                ) : (
                  <Text strong style={{ color: '#ff4d4f' }}>❌ 验证失败</Text>
                )}
              </div>
            </Col>
          </Row>
          {/* 服务特定配置 */}
          {kind === ServiceKind.Service && (
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={6}>
                <Text type="secondary">服务类型:</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">{serviceConfig.spec.type}</Tag>
                </div>
              </Col>
              <Col span={6}>
                <Text type="secondary">会话亲和性:</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color={serviceConfig.spec.sessionAffinity === 'ClientIP' ? 'orange' : 'green'}>
                    {serviceConfig.spec.sessionAffinity || 'None'}
                  </Tag>
                </div>
              </Col>
              {(serviceConfig.spec.type === ServiceType.NodePort || 
                serviceConfig.spec.type === ServiceType.LoadBalancer) && (
                <Col span={6}>
                  <Text type="secondary">外部流量策略:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={serviceConfig.spec.externalTrafficPolicy === 'Local' ? 'purple' : 'cyan'}>
                      {serviceConfig.spec.externalTrafficPolicy || 'Cluster'}
                    </Tag>
                  </div>
                </Col>
              )}
              <Col span={6}>
                <Text type="secondary">选择器:</Text>
                <div style={{ marginTop: 4 }}>
                  <Badge 
                    count={Object.keys(serviceConfig.spec.selector).length} 
                    style={{ backgroundColor: Object.keys(serviceConfig.spec.selector).length > 0 ? '#52c41a' : '#ff4d4f' }}
                  />
                  <Text style={{ marginLeft: 8 }}>
                    {Object.keys(serviceConfig.spec.selector).length > 0 ? '已配置' : '未配置'}
                  </Text>
                </div>
              </Col>
            </Row>
          )}
          {kind === ServiceKind.Ingress && (
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={8}>
                <Text type="secondary">Ingress类:</Text>
                <div style={{ marginTop: 4 }}>
                  <Text code>{serviceConfig.spec.ingressClassName || '未设置'}</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">TLS配置:</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color={serviceConfig.spec.tls && serviceConfig.spec.tls.length > 0 ? 'green' : 'default'}>
                    {serviceConfig.spec.tls && serviceConfig.spec.tls.length > 0 ? '已启用' : '未启用'}
                  </Tag>
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">路由规则:</Text>
                <div style={{ marginTop: 4 }}>
                  <Badge count={serviceConfig.spec.rules.length} style={{ backgroundColor: '#1890ff' }} />
                  <Text style={{ marginLeft: 8 }}>条规则</Text>
                </div>
              </Col>
            </Row>
          )}
        </Card>

        {/* 端口/路由配置 */}
        <Card 
          title={
            <Space>
              <span style={{ fontSize: '16px' }}>{kind === ServiceKind.Service ? '🔌' : '🛣️'}</span>
              <Text strong>{kind === ServiceKind.Service ? '端口配置' : '路由配置'}</Text>
              <Badge 
                count={kind === ServiceKind.Service ? serviceConfig.spec.ports.length : serviceConfig.spec.rules.length} 
                style={{ backgroundColor: '#1890ff' }} 
              />
            </Space>
          }
          size="small" 
          style={{ marginBottom: 12, flexShrink: 0 }}
        >
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {kind === ServiceKind.Service ? (
              serviceConfig.spec.ports.map((port, index) => (
                <div key={index} style={{ 
                  marginBottom: 8,
                  padding: '8px',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Text type="secondary">端口名称:</Text>
                      <div><Text strong>{port.name || `端口-${index + 1}`}</Text></div>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">端口/目标端口:</Text>
                      <div><Text code>{port.port} → {port.targetPort}</Text></div>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">协议:</Text>
                      <div><Tag color="blue">{port.protocol}</Tag></div>
                    </Col>
                    {serviceConfig.spec.type === ServiceType.NodePort && port.nodePort && (
                      <Col span={6}>
                        <Text type="secondary">NodePort:</Text>
                        <div><Text code>{port.nodePort}</Text></div>
                      </Col>
                    )}
                  </Row>
                </div>
              ))
            ) : (
              serviceConfig.spec.rules.map((rule, index) => (
                <div key={index} style={{ 
                  marginBottom: 8,
                  padding: '8px',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  border: '1px solid #e8e8e8'
                }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Text type="secondary">主机名:</Text>
                      <div><Text strong>{rule.host || '默认'}</Text></div>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">路径:</Text>
                      <div><Text code>{rule.path}</Text></div>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">路径类型:</Text>
                      <div><Tag color="green">{rule.pathType}</Tag></div>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">后端服务:</Text>
                      <div><Text code>{rule.serviceName}:{rule.servicePort}</Text></div>
                    </Col>
                  </Row>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Service选择器验证 */}
        {kind === ServiceKind.Service && !hasSelector && (
          <Alert
            message="⚠️ 工作负载绑定缺失"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>
                  当前Service没有配置选择器，将无法绑定到任何工作负载！这会导致：
                </div>
                <ul style={{ marginLeft: 16, marginBottom: 8 }}>
                  <li>Service无法找到后端Pod</li>
                  <li>流量无法正确路由</li>
                  <li>服务不可用</li>
                </ul>
                <div>
                  <strong>建议：</strong>返回第一步，在"工作负载绑定"部分添加选择器，如 <code>app: {serviceConfig.metadata.name}</code>
                </div>
              </div>
            }
            type="error"
            showIcon
            style={{ marginBottom: 12, flexShrink: 0 }}
          />
        )}

        {/* Ingress验证 */}
        {kind === ServiceKind.Ingress && !hasValidIngress && (
          <Alert
            message="⚠️ 路由配置不完整"
            description="当前Ingress没有配置有效的后端服务，请确保至少有一个路由规则配置了后端服务名称。"
            type="error"
            showIcon
            style={{ marginBottom: 12, flexShrink: 0 }}
          />
        )}

        {/* YAML配置 */}
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <span style={{ fontSize: '16px' }}>📄</span>
                <Text strong>YAML 配置</Text>
              </Space>
              <Space>
                <Button
                  size="small"
                  icon={<span style={{ fontSize: '12px' }}>📋</span>}
                  onClick={() => {
                    navigator.clipboard.writeText(yamlContent);
                    message.success('YAML 已复制到剪贴板');
                  }}
                >
                  复制
                </Button>
                <Button
                  size="small"
                  icon={<span style={{ fontSize: '12px' }}>💾</span>}
                  onClick={() => {
                    const blob = new Blob([yamlContent], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${serviceConfig.metadata.name}-${getServiceKindLabel(kind).toLowerCase()}.yaml`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    message.success('YAML 文件已下载');
                  }}
                >
                  下载
                </Button>
              </Space>
            </div>
          }
          size="small"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px' }}
        >
          <div style={{ 
            background: '#1f1f1f',
            borderRadius: '6px',
            border: '1px solid #333',
            overflow: 'hidden',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <TextArea
              value={yamlContent}
              readOnly
              style={{ 
                fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
                fontSize: '13px',
                lineHeight: '1.6',
                backgroundColor: '#1f1f1f',
                color: '#e6e6e6',
                border: 'none',
                padding: '16px',
                resize: 'none',
                flex: 1,
                minHeight: '300px'
              }}
            />
          </div>
        </Card>
      </div>
    );
  };

  const steps = [
    {
      title: '基本配置',
      description: '设置服务基本信息',
      content: renderBasicConfig(),
      icon: <SettingOutlined />,
    },
    {
      title: kind === ServiceKind.Service ? '端口配置' : '路由配置',
      description: kind === ServiceKind.Service ? '配置服务端口和协议' : '配置路由规则和后端服务',
      content: renderPortConfig(),
      icon: kind === ServiceKind.Service ? <ApiOutlined /> : <LinkOutlined />,
    },
    {
      title: '高级配置',
      description: kind === ServiceKind.Service ? '选择器、标签和注解' : '标签和注解配置',
      content: renderAdvancedConfig(),
      icon: <CloudOutlined />,
    },
    {
      title: '配置预览',
      description: '检查并确认配置',
      content: renderPreview(),
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          {getServiceIcon(kind)}
          <Text strong style={{ fontSize: '16px' }}>
            创建 {getServiceKindLabel(kind)}
          </Text>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={1200}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary">
              步骤 {currentStep + 1} / {steps.length}
            </Text>
          </div>
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                上一步
              </Button>
            )}
            <Button
              type="primary"
              onClick={handleNext}
              loading={loading}
            >
              {currentStep === steps.length - 1 ? '创建' : '下一步'}
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
      styles={{
        body: { padding: '24px 24px 0' }
      }}
    >
      <Steps 
        current={currentStep} 
        style={{ marginBottom: 24 }}
        items={steps.map(step => ({
          title: step.title,
          description: step.description,
          icon: step.icon,
        }))}
      />
      
      <div style={{ minHeight: 520, backgroundColor: '#fafafa', borderRadius: 8, padding: 16 }}>
        {steps[currentStep].content}
      </div>
    </Modal>
  );
};

export default ServiceWizardModal; 
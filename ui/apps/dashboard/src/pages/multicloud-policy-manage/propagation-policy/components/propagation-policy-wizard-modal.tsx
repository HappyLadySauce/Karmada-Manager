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
  Button,
  Space,
  Row,
  Col,
  message,
  Typography,
  Alert,
  Collapse,
  Badge,
  Switch,
  InputNumber,
  Radio,
  Card,
  Tag,
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  ClusterOutlined,
  DeploymentUnitOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { CreatePropagationPolicy } from '@/services/propagationpolicy';
import { GetClusters } from '@/services/cluster';
import { GetWorkloads } from '@/services/workload';
import { GetServices, GetIngress } from '@/services/service';
import { GetConfigMaps, GetSecrets } from '@/services/config';
import { IResponse, PolicyScope, WorkloadKind } from '@/services/base';
import { stringify } from 'yaml';
import useNamespace from '@/hooks/use-namespace';
import { useQuery } from '@tanstack/react-query';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface PropagationPolicyWizardModalProps {
  open: boolean;
  scope: PolicyScope;
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

interface ResourceSelector {
  apiVersion: string;
  kind: string;
  name?: string;
  namespace?: string;
  labelSelector?: Record<string, string>;
}

interface PlacementRule {
  clusters?: string[];
  clusterTolerations?: Array<{
    key?: string;
    operator?: 'Equal' | 'Exists';
    value?: string;
    effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
    tolerationSeconds?: number;
  }>;
  spreadConstraints?: Array<{
    spreadByField: string;
    spreadByLabel?: string;
    maxSkew?: number;
    minGroups?: number;
  }>;
  replicaScheduling?: {
    replicaDivisionPreference?: 'Aggregated' | 'Weighted';
    replicaSchedulingType?: 'Duplicated' | 'Divided';
    weightPreference?: {
      staticWeightList?: Array<{
        targetCluster: {
          clusterNames?: string[];
        };
        weight: number;
      }>;
    };
  };
}

interface PropagationPolicyConfig {
  metadata: {
    name: string;
    namespace?: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  spec: {
    resourceSelectors: ResourceSelector[];
    placement: PlacementRule;
    preemption?: 'Always' | 'Never';
    conflictResolution?: 'Abort' | 'Overwrite';
    priority?: number;
    schedulerName?: string;
    suspendDispatching?: boolean;
    failover?: {
      application?: {
        decisionConditions?: {
          tolerationSeconds?: number;
        };
        gracePeriodSeconds?: number;
      };
    };
  };
}

const PropagationPolicyWizardModal: React.FC<PropagationPolicyWizardModalProps> = ({
  open,
  scope,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 添加命名空间数据获取
  const { nsOptions, isNsDataLoading } = useNamespace({});
  
  // 添加集群数据获取
  const { data: clusterData, isLoading: isClusterDataLoading } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
    enabled: open, // 只在模态框打开时获取数据
  });

  // 转换集群数据为选项格式
  const clusterOptions = React.useMemo(() => {
    if (!clusterData?.clusters) return [];
    return clusterData.clusters.map((cluster: any) => ({
      label: cluster.objectMeta.name,
      value: cluster.objectMeta.name,
    }));
  }, [clusterData]);
  
  const [policyConfig, setPolicyConfig] = useState<PropagationPolicyConfig>({
    metadata: {
      name: '',
      namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
      labels: {},
      annotations: {},
    },
    spec: {
      resourceSelectors: [
        {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
        },
      ],
      placement: {
        replicaScheduling: {
          replicaDivisionPreference: 'Aggregated' as const,
          replicaSchedulingType: 'Duplicated' as const,
        },
      },
    },
  });

  const getScopeLabel = (scope: PolicyScope) => {
    return scope === PolicyScope.Namespace ? '命名空间传播策略' : '集群传播策略';
  };

  const getScopeDescription = (scope: PolicyScope) => {
    return scope === PolicyScope.Namespace 
      ? '管理特定命名空间内资源的跨集群分发'
      : '管理集群级别资源的跨集群分发';
  };

  const getScopeIcon = (scope: PolicyScope) => {
    return scope === PolicyScope.Namespace ? <BranchesOutlined /> : <ClusterOutlined />;
  };

  // 重置配置到默认值
  useEffect(() => {
    if (open) {
      setPolicyConfig(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          name: '',
          namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
          labels: {},
          annotations: {},
        },
        spec: {
          resourceSelectors: [
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
            },
          ],
          placement: {
            replicaScheduling: {
              replicaDivisionPreference: 'Aggregated' as const,
              replicaSchedulingType: 'Duplicated' as const,
            },
          },
        },
      }));
    }
  }, [open, scope]);

  // 验证配置是否完整
  const validateConfiguration = (config: PropagationPolicyConfig): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // 验证基本信息
    if (!config.metadata.name) {
      errors.push('策略名称不能为空');
    }
    
    if (scope === PolicyScope.Namespace && !config.metadata.namespace) {
      errors.push('命名空间不能为空');
    }
    
    // 验证资源选择器
    if (!config.spec.resourceSelectors || config.spec.resourceSelectors.length === 0) {
      errors.push('至少需要一个资源选择器');
    } else {
      config.spec.resourceSelectors.forEach((selector, index) => {
        if (!selector.apiVersion) {
          errors.push(`资源选择器 ${index + 1}: API版本不能为空`);
        }
        if (!selector.kind) {
          errors.push(`资源选择器 ${index + 1}: 资源类型不能为空`);
        }
        if (!selector.name && (!selector.labelSelector || Object.keys(selector.labelSelector).length === 0)) {
          errors.push(`资源选择器 ${index + 1}: 必须指定资源名称或标签选择器`);
        }
        if (scope === PolicyScope.Namespace && !selector.namespace) {
          errors.push(`资源选择器 ${index + 1}: 命名空间不能为空`);
        }
      });
    }
    
    // 验证集群配置
    if (!config.spec.placement.clusters || config.spec.placement.clusters.length === 0) {
      errors.push('至少需要选择一个目标集群');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const generateYAML = (config: PropagationPolicyConfig) => {
    const kindLabel = scope === PolicyScope.Namespace ? 'PropagationPolicy' : 'ClusterPropagationPolicy';
    const apiVersion = 'policy.karmada.io/v1alpha1';

    // 生成带注释的YAML内容
    const comments = {
      header: `# ${kindLabel} - ${config.metadata.name}
# 描述: Karmada多云传播策略配置
# 创建时间: ${new Date().toLocaleString('zh-CN')}
# 作用域: ${scope === PolicyScope.Namespace ? '命名空间级别' : '集群级别'}`,
      metadata: `# 策略元数据配置`,
      resourceSelectors: `# 资源选择器 - 指定要传播的Kubernetes资源`,
      placement: `# 调度配置 - 定义资源如何分发到目标集群`,
      clusters: `# 目标集群列表`,
      replicaScheduling: `# 副本调度策略`,
      advanced: `# 高级配置选项`
    };

    const baseMetadata = {
      name: config.metadata.name,
      ...(scope === PolicyScope.Namespace && config.metadata.namespace && {
        namespace: config.metadata.namespace,
      }),
      labels: {
        app: config.metadata.name,
        ...config.metadata.labels,
      },
      ...(Object.keys(config.metadata.annotations).length > 0 && {
        annotations: config.metadata.annotations,
      }),
    };

    const spec: any = {
      resourceSelectors: config.spec.resourceSelectors.map(selector => {
        const selectorObj: any = {
          apiVersion: selector.apiVersion,
          kind: selector.kind,
        };
        
        // 如果有资源名称，添加name和namespace
        if (selector.name) {
          selectorObj.name = selector.name;
          if (selector.namespace) {
            selectorObj.namespace = selector.namespace;
          }
        }
        
        // 如果有标签选择器，添加labelSelector
        if (selector.labelSelector && Object.keys(selector.labelSelector).length > 0) {
          selectorObj.labelSelector = {
            matchLabels: selector.labelSelector,
          };
          // 标签选择器情况下也需要namespace
          if (selector.namespace) {
            selectorObj.namespace = selector.namespace;
          }
        }
        
        return selectorObj;
      }),
      placement: {
        ...(config.spec.placement.clusters && config.spec.placement.clusters.length > 0 && {
          clusterAffinity: {
            clusterNames: config.spec.placement.clusters,
          },
        }),
        ...(config.spec.placement.clusterTolerations && config.spec.placement.clusterTolerations.length > 0 && {
          clusterTolerations: config.spec.placement.clusterTolerations,
        }),
        ...(config.spec.placement.spreadConstraints && config.spec.placement.spreadConstraints.length > 0 && {
          spreadConstraints: config.spec.placement.spreadConstraints,
        }),
        ...(config.spec.placement.replicaScheduling && {
          replicaScheduling: (() => {
            const replicaScheduling = { ...config.spec.placement.replicaScheduling };
            
            // 如果是加权分发，确保所有集群都有权重配置
            if (
              replicaScheduling.replicaDivisionPreference === 'Weighted' &&
              replicaScheduling.replicaSchedulingType === 'Divided' &&
              config.spec.placement.clusters &&
              config.spec.placement.clusters.length > 0
            ) {
              const existingWeights = replicaScheduling.weightPreference?.staticWeightList || [];
              const newWeights: Array<{
                targetCluster: { clusterNames: string[] };
                weight: number;
              }> = [];
              
              // 为每个集群确保有权重配置
              config.spec.placement.clusters.forEach(cluster => {
                const existingWeight = existingWeights.find(w => 
                  w.targetCluster.clusterNames?.includes(cluster)
                );
                
                newWeights.push({
                  targetCluster: { clusterNames: [cluster] },
                  weight: existingWeight?.weight || 1
                });
              });
              
              replicaScheduling.weightPreference = {
                staticWeightList: newWeights
              };
            }
            
            return replicaScheduling;
          })(),
        }),
      },
      ...(config.spec.preemption && { preemption: config.spec.preemption }),
      ...(config.spec.conflictResolution && { conflictResolution: config.spec.conflictResolution }),
      ...(config.spec.priority !== undefined && { priority: config.spec.priority }),
      ...(config.spec.schedulerName && { schedulerName: config.spec.schedulerName }),
      ...(config.spec.suspendDispatching !== undefined && { suspendDispatching: config.spec.suspendDispatching }),
      ...(config.spec.failover && { failover: config.spec.failover }),
    };

    return {
      apiVersion,
      kind: kindLabel,
      metadata: baseMetadata,
      spec,
      _comments: comments, // 注释信息
    };
  };

  const handleNext = async () => {
    try {
      // 表单验证
      await form.validateFields();
      
      // 根据当前步骤进行额外验证
      if (currentStep === 1) {
        // 资源配置步骤验证
        const resourceErrors: string[] = [];
        policyConfig.spec.resourceSelectors.forEach((selector, index) => {
          if (!selector.kind) {
            resourceErrors.push(`资源选择器 ${index + 1}: 请选择资源类型`);
          }
          if (!selector.name && (!selector.labelSelector || Object.keys(selector.labelSelector).length === 0)) {
            resourceErrors.push(`资源选择器 ${index + 1}: 请指定资源名称或配置标签选择器`);
          }
          if (scope === PolicyScope.Namespace && !selector.namespace) {
            resourceErrors.push(`资源选择器 ${index + 1}: 请选择命名空间`);
          }
        });
        
        if (resourceErrors.length > 0) {
          message.error(resourceErrors.join('; '));
          return;
        }
      }
      
      if (currentStep === 2) {
        // 调度配置步骤验证
        if (!policyConfig.spec.placement.clusters || policyConfig.spec.placement.clusters.length === 0) {
          message.error('请至少选择一个目标集群');
          return;
        }
      }
      
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        // 最终验证
        const validation = validateConfiguration(policyConfig);
        if (!validation.isValid) {
          message.error(`配置验证失败: ${validation.errors.join('; ')}`);
          return;
        }
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
      const yamlObject = generateYAML(policyConfig);
      const yamlContent = stringify(yamlObject);
      
      const ret = await CreatePropagationPolicy({
        isClusterScope: scope === PolicyScope.Cluster,
        namespace: policyConfig.metadata.namespace || '',
        name: policyConfig.metadata.name,
        propagationData: yamlContent,
      });

      await onOk(ret);
      handleReset();
    } catch (error) {
      console.error('创建传播策略失败:', error);
      message.error('创建传播策略失败');
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
        namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
        labels: {},
        annotations: {},
      },
      spec: {
        resourceSelectors: [
          {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: '', // 默认为名称模式，设置空字符串
          },
        ],
        placement: {
          replicaScheduling: {
            replicaDivisionPreference: 'Aggregated' as const,
            replicaSchedulingType: 'Duplicated' as const,
          },
        },
      },
    };
    setPolicyConfig(defaultConfig);
    // 重置表单字段值
    form.setFieldsValue({
      name: '',
      namespace: scope === PolicyScope.Namespace ? 'default' : undefined,
      preemption: 'Never',
      conflictResolution: 'Abort',
      replicaDivisionPreference: 'Aggregated',
      replicaSchedulingType: 'Duplicated',
    });
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const updatePolicyConfig = (path: string, value: any) => {
    setPolicyConfig(prev => {
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

  const addResourceSelector = () => {
    const newConfig = { ...policyConfig };
    newConfig.spec.resourceSelectors.push({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      name: '', // 默认为名称模式，设置空字符串
    });
    setPolicyConfig(newConfig);
  };

  const removeResourceSelector = (index: number) => {
    const newConfig = { ...policyConfig };
    newConfig.spec.resourceSelectors.splice(index, 1);
    setPolicyConfig(newConfig);
  };

  const updateResourceSelector = (index: number, field: string, value: any) => {
    const newConfig = { ...policyConfig };
    const keys = field.split('.');
    let current: any = newConfig.spec.resourceSelectors[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setPolicyConfig(newConfig);
  };

  // 资源名称选择组件
  const ResourceNameSelect: React.FC<{
    selectorIndex: number;
    selector: ResourceSelector;
    updateResourceSelector: (index: number, field: string, value: any) => void;
  }> = ({ selectorIndex, selector, updateResourceSelector }) => {
    // 根据资源类型获取对应的资源列表
    const { data: resourceData, isLoading: isResourceLoading } = useQuery({
      queryKey: ['GetResources', selector.kind, selector.namespace],
      queryFn: async () => {
        if (!selector.namespace) return null;
        
        switch (selector.kind) {
          case 'Deployment':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Deployment
            });
          case 'Service':
            return await GetServices({
              namespace: selector.namespace
            });
          case 'Ingress':
            return await GetIngress({
              namespace: selector.namespace
            });
          case 'ConfigMap':
            return await GetConfigMaps({
              namespace: selector.namespace
            });
          case 'Secret':
            return await GetSecrets({
              namespace: selector.namespace
            });
          case 'Job':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Job
            });
          case 'CronJob':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Cronjob
            });
          case 'StatefulSet':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Statefulset
            });
          case 'DaemonSet':
            return await GetWorkloads({
              namespace: selector.namespace,
              kind: WorkloadKind.Daemonset
            });
          default:
            return null;
        }
      },
      enabled: !!selector.namespace && !!selector.kind,
    });

    // 转换资源数据为选项格式
    const resourceOptions = React.useMemo(() => {
      if (!resourceData?.data) return [];
      
      let items: any[] = [];
      const data = resourceData.data as any;
      
      // 根据不同的API响应格式获取数据
      if (selector.kind === 'Deployment' || selector.kind === 'Job' || selector.kind === 'CronJob' || 
          selector.kind === 'StatefulSet' || selector.kind === 'DaemonSet') {
        items = data.deployments || data.jobs || data.items || [];
      } else if (selector.kind === 'Service') {
        items = data.services || [];
      } else if (selector.kind === 'Ingress') {
        items = data.items || [];
      } else if (selector.kind === 'ConfigMap') {
        items = data.items || [];
      } else if (selector.kind === 'Secret') {
        items = data.secrets || [];
      }
      
      return items.map((item: any) => ({
        label: item.objectMeta?.name || item.name,
        value: item.objectMeta?.name || item.name,
      }));
    }, [resourceData, selector.kind]);

    return (
      <Select
        size="small"
        value={selector.name}
        onChange={(value) => updateResourceSelector(selectorIndex, 'name', value)}
        placeholder={selector.namespace ? "选择资源" : "请先选择命名空间"}
        style={{ width: '100%' }}
        showSearch
        filterOption={(input, option) =>
          (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
        }
        loading={isResourceLoading}
        disabled={!selector.namespace}
        options={resourceOptions}
        notFoundContent={isResourceLoading ? '加载中...' : '暂无资源'}
      />
    );
  };

  const renderBasicConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <Alert
        message={
          <Space>
            {getScopeIcon(scope)}
            <Text strong>{getScopeLabel(scope)}</Text>
          </Space>
        }
        description={getScopeDescription(scope)}
        type="info"
        showIcon={false}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" size="large">
        <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}>基本信息</Text>
          <Row gutter={16}>
            <Col span={scope === PolicyScope.Namespace ? 12 : 24}>
              <Form.Item
                label="策略名称"
                name="name"
                initialValue={policyConfig.metadata.name}
                rules={[
                  { required: true, message: '请输入策略名称' },
                  { pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, message: '名称只能包含小写字母、数字和连字符' }
                ]}
                style={{ marginBottom: 8 }}
              >
                <Input
                  size="small"
                  placeholder="输入策略名称"
                  onChange={(e) => {
                    updatePolicyConfig('metadata.name', e.target.value);
                    form.setFieldValue('name', e.target.value);
                  }}
                />
              </Form.Item>
            </Col>
            {scope === PolicyScope.Namespace && (
              <Col span={12}>
                <Form.Item
                  label="命名空间"
                  name="namespace"
                  initialValue={policyConfig.metadata.namespace}
                  rules={[{ required: true, message: '请选择命名空间' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    size="small"
                    placeholder="选择命名空间"
                    onChange={(value) => {
                      updatePolicyConfig('metadata.namespace', value);
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
            )}
          </Row>
        </div>

        <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}>策略配置</Text>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item label="抢占策略" name="preemption" style={{ marginBottom: 8 }}>
                <Select
                  size="small"
                  value={policyConfig.spec.preemption || 'Never'}
                  onChange={(value) => updatePolicyConfig('spec.preemption', value)}
                >
                  <Option value="Always">Always - 总是抢占</Option>
                  <Option value="Never">Never - 从不抢占</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="冲突解决" name="conflictResolution" style={{ marginBottom: 8 }}>
                <Select
                  size="small"
                  value={policyConfig.spec.conflictResolution || 'Abort'}
                  onChange={(value) => updatePolicyConfig('spec.conflictResolution', value)}
                >
                  <Option value="Abort">Abort - 中止部署</Option>
                  <Option value="Overwrite">Overwrite - 覆盖冲突</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 8]}>
            <Col span={8}>
              <Form.Item label="优先级" style={{ marginBottom: 8 }}>
                <InputNumber
                  size="small"
                  value={policyConfig.spec.priority}
                  onChange={(value) => updatePolicyConfig('spec.priority', value)}
                  style={{ width: '100%' }}
                  min={0}
                  max={1000}
                  placeholder="0-1000"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="调度器名称" style={{ marginBottom: 8 }}>
                <Input
                  size="small"
                  value={policyConfig.spec.schedulerName}
                  onChange={(e) => updatePolicyConfig('spec.schedulerName', e.target.value)}
                  placeholder="default-scheduler"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="暂停分发" style={{ marginBottom: 8 }}>
                <Switch
                  checked={policyConfig.spec.suspendDispatching}
                  onChange={(checked) => updatePolicyConfig('spec.suspendDispatching', checked)}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </div>
  );

  const renderResourceConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Space>
            <DeploymentUnitOutlined />
            <Text strong>资源选择器</Text>
            <Badge count={policyConfig.spec.resourceSelectors.length} size="small" />
          </Space>
        </div>
        
        {policyConfig.spec.resourceSelectors.map((selector, selectorIndex) => (
          <div
            key={selectorIndex}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              backgroundColor: '#f5f5f5',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Space>
                <Badge count={selectorIndex + 1} size="small" style={{ backgroundColor: '#1890ff' }}>
                  <div style={{ width: 16, height: 16 }} />
                </Badge>
                <Text strong>{selector.kind || `选择器 ${selectorIndex + 1}`}</Text>
              </Space>
              {policyConfig.spec.resourceSelectors.length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeResourceSelector(selectorIndex)}
                >
                  删除
                </Button>
              )}
            </div>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item label="资源类型" required style={{ marginBottom: 8 }}>
                  <Select
                    size="small"
                    value={selector.kind}
                    onChange={(value) => {
                      // 根据资源类型自动设置正确的API版本
                      const getApiVersionForKind = (kind: string) => {
                        switch (kind) {
                          case 'Service':
                          case 'ConfigMap':
                          case 'Secret':
                          case 'Namespace':
                            return 'v1';
                          case 'Deployment':
                          case 'StatefulSet':
                          case 'DaemonSet':
                          case 'ReplicaSet':
                            return 'apps/v1';
                          case 'Ingress':
                            return 'networking.k8s.io/v1';
                          case 'Job':
                          case 'CronJob':
                            return 'batch/v1';
                          case 'PersistentVolume':
                          case 'PersistentVolumeClaim':
                            return 'v1';
                          case 'StorageClass':
                            return 'storage.k8s.io/v1';
                          default:
                            return 'v1';
                        }
                      };
                      
                      const apiVersion = getApiVersionForKind(value);
                      updateResourceSelector(selectorIndex, 'kind', value);
                      updateResourceSelector(selectorIndex, 'apiVersion', apiVersion);
                    }}
                    style={{ width: '100%' }}
                  >
                    <Option value="Deployment">Deployment (应用部署)</Option>
                    <Option value="Service">Service (服务)</Option>
                    <Option value="Ingress">Ingress (入口)</Option>
                    <Option value="ConfigMap">ConfigMap (配置映射)</Option>
                    <Option value="Secret">Secret (密钥)</Option>
                    <Option value="Job">Job (任务)</Option>
                    <Option value="CronJob">CronJob (定时任务)</Option>
                    <Option value="StatefulSet">StatefulSet (有状态集)</Option>
                    <Option value="DaemonSet">DaemonSet (守护集)</Option>
                    <Option value="PersistentVolumeClaim">PersistentVolumeClaim (存储卷声明)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="API版本" required style={{ marginBottom: 8 }}>
                  <Select
                    size="small"
                    value={selector.apiVersion}
                    onChange={(value) => updateResourceSelector(selectorIndex, 'apiVersion', value)}
                    style={{ width: '100%' }}
                    disabled
                  >
                    <Option value="v1">v1</Option>
                    <Option value="apps/v1">apps/v1</Option>
                    <Option value="networking.k8s.io/v1">networking.k8s.io/v1</Option>
                    <Option value="batch/v1">batch/v1</Option>
                    <Option value="storage.k8s.io/v1">storage.k8s.io/v1</Option>
                  </Select>
                  <Text type="secondary" style={{ 
                    fontSize: '11px', 
                    display: 'block', 
                    marginTop: '4px',
                    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif'
                  }}>
                    ✅ 已根据资源类型自动选择正确的API版本
                  </Text>
                </Form.Item>
              </Col>
            </Row>

            {/* 选择模式：资源名称 vs 标签选择器 */}
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Form.Item label="选择模式" style={{ marginBottom: 8 }}>
                  <Radio.Group
                    size="small"
                    value={
                      // 简化判断逻辑：有name属性（不管是否为空）就是名称模式，否则是标签模式
                      selector.name !== undefined ? 'name' : 'label'
                    }
                    onChange={(e) => {
                      if (e.target.value === 'name') {
                        // 切换到名称模式：设置name为空字符串，清除labelSelector
                        updateResourceSelector(selectorIndex, 'name', '');
                        updateResourceSelector(selectorIndex, 'labelSelector', undefined);
                      } else {
                        // 切换到标签模式：清除name，设置labelSelector为空对象
                        updateResourceSelector(selectorIndex, 'name', undefined);
                        updateResourceSelector(selectorIndex, 'labelSelector', {});
                      }
                    }}
                  >
                    <Radio value="name">指定资源名称</Radio>
                    <Radio value="label">使用标签选择器</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item label="命名空间" required style={{ marginBottom: 8 }}>
                  <Select
                    size="small"
                    value={selector.namespace}
                    onChange={(value) => updateResourceSelector(selectorIndex, 'namespace', value)}
                    placeholder="选择命名空间"
                    style={{ width: '100%' }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    loading={isNsDataLoading}
                  >
                    {nsOptions.map((ns: any) => (
                      <Option key={ns.value} value={ns.value}>
                        {ns.title}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              {/* 根据选择模式显示不同的输入方式 - 使用与Radio.Group相同的判断逻辑 */}
              <Col span={12}>
                {selector.name !== undefined ? (
                  <Form.Item label="资源名称" required style={{ marginBottom: 8 }}>
                    <ResourceNameSelect
                      selectorIndex={selectorIndex}
                      selector={selector}
                      updateResourceSelector={updateResourceSelector}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item label="标签匹配" style={{ marginBottom: 8 }}>
                    <div style={{ 
                      border: '1px dashed #d9d9d9', 
                      borderRadius: 4, 
                      padding: 8,
                      backgroundColor: '#fafafa',
                      minHeight: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text type="secondary" style={{ fontSize: '12px', fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' }}>
                        {selector.labelSelector && Object.keys(selector.labelSelector).length > 0
                          ? `${Object.keys(selector.labelSelector).length} 个标签条件`
                          : '请在下方配置标签选择器'
                        }
                      </Text>
                    </div>
                  </Form.Item>
                )}
              </Col>
            </Row>

            {/* 标签选择器面板 - 只在标签模式下显示 */}
            {selector.name === undefined && (
              <Collapse ghost size="small">
                <Panel header="标签选择器" key="labelSelector">
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      if (!selector.labelSelector) {
                        updateResourceSelector(selectorIndex, 'labelSelector', {});
                      }
                      const key = `label-${Date.now()}`;
                      updateResourceSelector(selectorIndex, `labelSelector.${key}`, '');
                    }}
                    style={{ marginBottom: 8 }}
                    size="small"
                  >
                    添加标签
                  </Button>
                  {selector.labelSelector && Object.entries(selector.labelSelector).map(([key, value], index) => (
                    <Row key={`${key}-${index}`} gutter={8} style={{ marginBottom: 8 }}>
                      <Col span={10}>
                        <Input
                          size="small"
                          placeholder="标签键"
                          value={key}
                          style={{ fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' }}
                          onChange={(e) => {
                            const newLabelSelector = { ...selector.labelSelector };
                            if (key !== e.target.value) {
                              delete newLabelSelector[key];
                              newLabelSelector[e.target.value] = value;
                              updateResourceSelector(selectorIndex, 'labelSelector', newLabelSelector);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== key) {
                              const newLabelSelector = { ...selector.labelSelector };
                              delete newLabelSelector[key];
                              newLabelSelector[e.target.value] = value;
                              updateResourceSelector(selectorIndex, 'labelSelector', newLabelSelector);
                            }
                          }}
                        />
                      </Col>
                      <Col span={10}>
                        <Input
                          size="small"
                          placeholder="标签值"
                          value={value as string}
                          style={{ fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' }}
                          onChange={(e) => {
                            const newLabelSelector = { ...selector.labelSelector };
                            newLabelSelector[key] = e.target.value;
                            updateResourceSelector(selectorIndex, 'labelSelector', newLabelSelector);
                          }}
                        />
                      </Col>
                      <Col span={4}>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            const newLabelSelector = { ...selector.labelSelector };
                            delete newLabelSelector[key];
                            updateResourceSelector(selectorIndex, 'labelSelector', newLabelSelector);
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                </Panel>
              </Collapse>
            )}
          </div>
        ))}
        
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addResourceSelector}
          style={{ width: '100%', marginTop: 8 }}
          size="middle"
        >
          添加资源选择器
        </Button>
      </div>
    </div>
  );

  const renderPlacementConfig = () => (
    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
      {/* 集群调度配置 */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Space>
            <ClusterOutlined />
            <Text strong>目标集群</Text>
            <Badge count={policyConfig.spec.placement.clusters?.length || 0} size="small" />
          </Space>
        </div>
        
        {/* 批量选择集群 */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ marginBottom: 8, display: 'block' }}>选择目标集群：</Text>
          <Select
            mode="multiple"
            size="small"
            placeholder="选择一个或多个集群"
            style={{ width: '100%' }}
            value={policyConfig.spec.placement.clusters || []}
            onChange={(value) => {
              updatePolicyConfig('spec.placement.clusters', value);
              
              // 如果是加权分发且分割模式，自动为所有集群初始化权重
              if (policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference === 'Weighted' && 
                  policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType === 'Divided' &&
                  value && value.length > 0) {
                
                const existingWeights = policyConfig.spec.placement.replicaScheduling?.weightPreference?.staticWeightList || [];
                const newWeights: Array<{
                  targetCluster: { clusterNames: string[] };
                  weight: number;
                }> = [];
                
                // 为每个集群确保有权重配置
                value.forEach(cluster => {
                  const existingWeight = existingWeights.find(w => 
                    w.targetCluster.clusterNames?.includes(cluster)
                  );
                  
                  newWeights.push({
                    targetCluster: { clusterNames: [cluster] },
                    weight: existingWeight?.weight || 1
                  });
                });
                
                updatePolicyConfig('spec.placement.replicaScheduling.weightPreference.staticWeightList', newWeights);
              }
            }}
            loading={isClusterDataLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={clusterOptions}
            notFoundContent={isClusterDataLoading ? '加载中...' : '暂无集群'}
          />
        </div>
        
        {/* 显示已选择的集群 */}
        {policyConfig.spec.placement.clusters && policyConfig.spec.placement.clusters.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已选择 {policyConfig.spec.placement.clusters.length} 个集群
            </Text>
          </div>
        )}
      </div>

      {/* 副本调度配置 */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>副本调度</Text>
        
        {/* 配置说明 */}
        <Alert
          message="副本调度配置说明"
          description={
            <div style={{ fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' }}>
              <div><strong>分发偏好：</strong></div>
              <div>• <strong>聚合</strong>：副本将被聚合分发，尽量减少分布的集群数量</div>
              <div>• <strong>加权</strong>：副本将按权重比例分发到各个集群</div>
              <br />
              <div><strong>调度类型：</strong></div>
              <div>• <strong>复制</strong>：在每个目标集群中创建完整的副本（副本数相同）</div>
              <div>• <strong>分割</strong>：将总副本数分割到多个集群中</div>
            </div>
          }
          type="info"
          showIcon
          style={{ 
            marginBottom: '16px', 
            fontSize: '12px',
            fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif'
          }}
        />
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item label="分发偏好" style={{ marginBottom: 8 }}>
              <Radio.Group
                size="small"
                value={policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference || 'Aggregated'}
                onChange={(e) => {
                  updatePolicyConfig('spec.placement.replicaScheduling.replicaDivisionPreference', e.target.value);
                  
                  // 如果切换到加权分发且选择了分割模式，自动为所有集群初始化权重
                  if (e.target.value === 'Weighted' && 
                      policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType === 'Divided' &&
                      policyConfig.spec.placement.clusters && 
                      policyConfig.spec.placement.clusters.length > 0) {
                    
                    const existingWeights = policyConfig.spec.placement.replicaScheduling?.weightPreference?.staticWeightList || [];
                    const newWeights: Array<{
                      targetCluster: { clusterNames: string[] };
                      weight: number;
                    }> = [];
                    
                    // 为每个集群确保有权重配置
                    policyConfig.spec.placement.clusters.forEach(cluster => {
                      const existingWeight = existingWeights.find(w => 
                        w.targetCluster.clusterNames?.includes(cluster)
                      );
                      
                      newWeights.push({
                        targetCluster: { clusterNames: [cluster] },
                        weight: existingWeight?.weight || 1
                      });
                    });
                    
                    updatePolicyConfig('spec.placement.replicaScheduling.weightPreference.staticWeightList', newWeights);
                  }
                }}
              >
                <Radio value="Aggregated">聚合</Radio>
                <Radio value="Weighted">加权</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="调度类型" style={{ marginBottom: 8 }}>
              <Radio.Group
                size="small"
                value={policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType || 'Duplicated'}
                onChange={(e) => {
                  updatePolicyConfig('spec.placement.replicaScheduling.replicaSchedulingType', e.target.value);
                  
                  // 如果切换到分割模式且选择了加权分发，自动为所有集群初始化权重
                  if (e.target.value === 'Divided' && 
                      policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference === 'Weighted' &&
                      policyConfig.spec.placement.clusters && 
                      policyConfig.spec.placement.clusters.length > 0) {
                    
                    const existingWeights = policyConfig.spec.placement.replicaScheduling?.weightPreference?.staticWeightList || [];
                    const newWeights: Array<{
                      targetCluster: { clusterNames: string[] };
                      weight: number;
                    }> = [];
                    
                    // 为每个集群确保有权重配置
                    policyConfig.spec.placement.clusters.forEach(cluster => {
                      const existingWeight = existingWeights.find(w => 
                        w.targetCluster.clusterNames?.includes(cluster)
                      );
                      
                      newWeights.push({
                        targetCluster: { clusterNames: [cluster] },
                        weight: existingWeight?.weight || 1
                      });
                    });
                    
                    updatePolicyConfig('spec.placement.replicaScheduling.weightPreference.staticWeightList', newWeights);
                  }
                }}
              >
                <Radio value="Duplicated">复制</Radio>
                <Radio value="Divided">分割</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
        
        {/* 权重配置 - 仅在加权分发且选择了集群时显示 */}
        {policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference === 'Weighted' && 
         policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType === 'Divided' &&
         policyConfig.spec.placement.clusters && policyConfig.spec.placement.clusters.length > 0 && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '6px' }}>
            <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '13px' }}>
              集群权重配置 <Text type="secondary">(权重总和将自动标准化)</Text>
            </Text>
            <Row gutter={[8, 8]}>
              {policyConfig.spec.placement.clusters.map((cluster) => {
                const currentWeights = policyConfig.spec.placement.replicaScheduling?.weightPreference?.staticWeightList || [];
                const clusterWeight = currentWeights.find(w => w.targetCluster.clusterNames?.includes(cluster))?.weight || 1;
                
                return (
                  <Col span={12} key={cluster}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text style={{ minWidth: '80px', fontSize: '12px' }}>{cluster}:</Text>
                      <InputNumber
                        size="small"
                        min={1}
                        max={100}
                        value={clusterWeight}
                        onChange={(value) => {
                          const newWeights = [...currentWeights];
                          const existingIndex = newWeights.findIndex(w => w.targetCluster.clusterNames?.includes(cluster));
                          
                          if (existingIndex >= 0) {
                            newWeights[existingIndex] = {
                              targetCluster: { clusterNames: [cluster] },
                              weight: value || 1
                            };
                          } else {
                            newWeights.push({
                              targetCluster: { clusterNames: [cluster] },
                              weight: value || 1
                            });
                          }
                          
                          updatePolicyConfig('spec.placement.replicaScheduling.weightPreference.staticWeightList', newWeights);
                        }}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </Col>
                );
              })}
            </Row>
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ 
                fontSize: '11px',
                fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif'
              }}>
                💡 提示：当使用"加权"分发时，副本将按照设定的权重比例分配到各个集群。例如，权重 2:1 表示第一个集群分配到的副本数是第二个集群的两倍。
              </Text>
            </div>
          </div>
        )}
      </div>

      {/* 故障转移配置 */}
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>故障转移</Text>
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item label="容忍时间(秒)" style={{ marginBottom: 8 }}>
              <InputNumber
                size="small"
                value={policyConfig.spec.failover?.application?.decisionConditions?.tolerationSeconds}
                onChange={(value) => updatePolicyConfig('spec.failover.application.decisionConditions.tolerationSeconds', value)}
                style={{ width: '100%' }}
                min={0}
                placeholder="30"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="优雅期限(秒)" style={{ marginBottom: 8 }}>
              <InputNumber
                size="small"
                value={policyConfig.spec.failover?.application?.gracePeriodSeconds}
                onChange={(value) => updatePolicyConfig('spec.failover.application.gracePeriodSeconds', value)}
                style={{ width: '100%' }}
                min={0}
                placeholder="600"
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </div>
  );

  const renderPreview = () => {
    const validation = validateConfiguration(policyConfig);
    const yamlObject = generateYAML(policyConfig);
    
    // 生成带注释的YAML内容
    const generateYAMLWithComments = (obj: any) => {
      // 移除内部注释属性
      const { _comments, ...cleanObj } = obj;
      
      // 基础YAML内容
      let yamlContent = stringify(cleanObj);
      
      // 添加头部注释
      const headerComment = `# ${obj.kind} - ${obj.metadata.name}
# 描述: Karmada多云传播策略配置
# 创建时间: ${new Date().toLocaleString('zh-CN')}
# 作用域: ${scope === PolicyScope.Namespace ? '命名空间级别' : '集群级别'}
# 资源类型: ${policyConfig.spec.resourceSelectors.map(s => s.kind).join(', ')}
# 目标集群: ${policyConfig.spec.placement.clusters?.join(', ') || '未指定'}

`;
      
      // 在关键部分添加注释
      yamlContent = yamlContent
        .replace('apiVersion:', `${headerComment}apiVersion:`)
        .replace('metadata:', '# 策略元数据配置\nmetadata:')
        .replace('spec:', '# 策略规格配置\nspec:')
        .replace('  resourceSelectors:', '  # 资源选择器 - 指定要传播的Kubernetes资源\n  resourceSelectors:')
        .replace('  placement:', '  # 调度配置 - 定义资源如何分发到目标集群\n  placement:')
        .replace('    clusterAffinity:', '    # 目标集群列表\n    clusterAffinity:')
        .replace('    replicaScheduling:', '    # 副本调度策略\n    replicaScheduling:');
      
      // 如果有高级配置，添加注释
      if (policyConfig.spec.conflictResolution || policyConfig.spec.priority !== undefined || policyConfig.spec.failover) {
        yamlContent = yamlContent.replace('  conflictResolution:', '  # 高级配置选项\n  conflictResolution:');
        yamlContent = yamlContent.replace('  priority:', '  # 策略优先级\n  priority:');
        yamlContent = yamlContent.replace('  failover:', '  # 故障转移配置\n  failover:');
      }
      
      return yamlContent;
    };
    
    const yamlContent = generateYAMLWithComments(yamlObject);
    
    return (
      <div style={{ height: '700px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            <Space>
              <CheckCircleOutlined style={{ color: validation.isValid ? '#52c41a' : '#ff4d4f' }} />
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
              <Text type="secondary">策略类型:</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ color: '#1890ff' }}>{getScopeLabel(scope)}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">策略名称:</Text>
              <div style={{ marginTop: 4 }}>
                <Text code>{policyConfig.metadata.name}</Text>
              </div>
            </Col>
            {scope === PolicyScope.Namespace && (
              <Col span={6}>
                <Text type="secondary">命名空间:</Text>
                <div style={{ marginTop: 4 }}>
                  <Text code>{policyConfig.metadata.namespace}</Text>
                </div>
              </Col>
            )}
            <Col span={6}>
              <Text type="secondary">配置状态:</Text>
              <div style={{ marginTop: 4 }}>
        {validation.isValid ? (
                  <Text strong style={{ color: '#52c41a' }}>✅ 验证通过</Text>
                ) : (
                  <Text strong style={{ color: '#ff4d4f' }}>❌ 验证失败</Text>
                )}
              </div>
            </Col>
          </Row>
          {/* 策略配置 */}
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={6}>
              <Text type="secondary">抢占策略:</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={policyConfig.spec.preemption === 'Always' ? 'orange' : 'green'}>
                  {policyConfig.spec.preemption === 'Always' ? 'Always' : 'Never'}
                </Tag>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">冲突解决:</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={policyConfig.spec.conflictResolution === 'Overwrite' ? 'red' : 'blue'}>
                  {policyConfig.spec.conflictResolution === 'Overwrite' ? 'Overwrite' : 'Abort'}
                </Tag>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">优先级:</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong>{policyConfig.spec.priority !== undefined ? policyConfig.spec.priority : '默认'}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">暂停分发:</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={policyConfig.spec.suspendDispatching ? 'orange' : 'green'}>
                  {policyConfig.spec.suspendDispatching ? '是' : '否'}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 资源选择器配置 */}
        <Card 
          title={
            <Space>
              <span style={{ fontSize: '16px' }}>🎯</span>
              <Text strong>资源选择器</Text>
              <Badge count={policyConfig.spec.resourceSelectors.length} style={{ backgroundColor: '#1890ff' }} />
            </Space>
          }
          size="small" 
          style={{ marginBottom: 12, flexShrink: 0 }}
        >
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {policyConfig.spec.resourceSelectors.map((selector, index) => (
              <div key={index} style={{ 
                marginBottom: 8,
                padding: '8px',
                background: '#f9f9f9',
                borderRadius: '4px',
                border: '1px solid #e8e8e8'
              }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Text type="secondary">资源类型:</Text>
                    <div><Text strong>{selector.kind}</Text></div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">API版本:</Text>
                    <div><Text code style={{ fontSize: '12px' }}>{selector.apiVersion}</Text></div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">选择模式:</Text>
                    <div style={{ fontSize: '12px' }}>
                      {selector.name !== undefined ? (
                        <Tag color="blue">资源名称: {selector.name || '未指定'}</Tag>
                      ) : (
                        <Tag color="green">标签选择器: {selector.labelSelector ? Object.keys(selector.labelSelector).length : 0} 个条件</Tag>
                      )}
                    </div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">命名空间:</Text>
                    <div style={{ fontSize: '12px' }}>
                      <Text code>{selector.namespace || '未指定'}</Text>
                    </div>
                  </Col>
                </Row>
              </div>
            ))}
          </div>
        </Card>

        {/* 调度配置 */}
        <Card 
          title={
            <Space>
              <span style={{ fontSize: '16px' }}>🌐</span>
              <Text strong>调度配置</Text>
              <Badge count={policyConfig.spec.placement.clusters?.length || 0} style={{ backgroundColor: '#52c41a' }} />
            </Space>
          }
          size="small" 
          style={{ marginBottom: 12, flexShrink: 0 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Text type="secondary">目标集群:</Text>
              <div style={{ marginTop: 4 }}>
                {policyConfig.spec.placement.clusters && policyConfig.spec.placement.clusters.length > 0 ? (
                  <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
                    {policyConfig.spec.placement.clusters.map((cluster, index) => (
                      <Tag key={index} color="blue" style={{ margin: '2px' }}>
                        {cluster}
                      </Tag>
                    ))}
                  </div>
        ) : (
                  <Text type="secondary">未选择</Text>
                )}
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">分发偏好:</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference === 'Weighted' ? 'orange' : 'green'}>
                  {policyConfig.spec.placement.replicaScheduling?.replicaDivisionPreference === 'Weighted' ? '加权分发' : '聚合分发'}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <Text type="secondary">调度类型:</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType === 'Divided' ? 'purple' : 'cyan'}>
                  {policyConfig.spec.placement.replicaScheduling?.replicaSchedulingType === 'Divided' ? '分割部署' : '复制部署'}
                </Tag>
              </div>
            </Col>
          </Row>
          {/* 故障转移配置 */}
          {(policyConfig.spec.failover?.application?.decisionConditions?.tolerationSeconds || 
            policyConfig.spec.failover?.application?.gracePeriodSeconds) && (
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Text type="secondary">容忍时间:</Text>
                <div style={{ marginTop: 4 }}>
                  <Text strong>
                    {policyConfig.spec.failover?.application?.decisionConditions?.tolerationSeconds || '未设置'} 秒
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">优雅期限:</Text>
                <div style={{ marginTop: 4 }}>
                  <Text strong>
                    {policyConfig.spec.failover?.application?.gracePeriodSeconds || '未设置'} 秒
                  </Text>
                </div>
              </Col>
            </Row>
          )}
        </Card>

        {/* 配置验证状态 */}
        {!validation.isValid && (
          <Alert
            message="❌ 配置验证失败"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>请修复以下问题后再创建：</div>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: 20,
                  fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif'
                }}>
                  {validation.errors.map((error, index) => (
                    <li key={index} style={{ fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif' }}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            }
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
                    a.download = `${policyConfig.metadata.name}-${scope === PolicyScope.Namespace ? 'propagationpolicy' : 'clusterpropagationpolicy'}.yaml`;
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
      description: '设置策略基本信息',
      content: renderBasicConfig(),
      icon: <SettingOutlined />,
    },
    {
      title: '资源选择',
      description: '配置资源选择器',
      content: renderResourceConfig(),
      icon: <DeploymentUnitOutlined />,
    },
    {
      title: '调度配置',
      description: '集群调度和故障转移',
      content: renderPlacementConfig(),
      icon: <ClusterOutlined />,
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
          {getScopeIcon(scope)}
          <Text strong style={{ fontSize: '16px' }}>
            创建 {getScopeLabel(scope)}
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

export default PropagationPolicyWizardModal; 
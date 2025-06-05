# 🚀 Karmada 集群调度系统使用指南

## 📋 系统概述

Karmada集群调度系统提供了一套完整的多集群工作负载调度监控和管理功能，包括：

- **调度概览**: 查看整体调度统计信息
- **拓扑视图**: 工作负载在多集群中的分布可视化
- **详细信息**: 深入到节点级别的Pod分布详情
- **实时监控**: 集群状态、副本健康度等实时数据

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   前端界面      │◄──►│   后端API       │◄──►│   Karmada      │
│   (React)       │    │   (Go)          │    │   控制平面      │
│   Port: 5174    │    │   Port: 8000    │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 核心功能

### 1. 调度概览页面
- **统计卡片**: 总工作负载、已调度、待调度、失败数量
- **集群分布**: 显示各集群的工作负载分布和健康状态
- **命名空间统计**: 按命名空间查看调度情况

### 2. 拓扑视图页面
- **工作负载列表**: 可交互的工作负载表格
- **调度状态**: 实时显示调度阶段和副本状态
- **集群分布**: 工作负载在各集群的分布情况

### 3. 详细信息页面 🎯
- **工作负载详情**: 基本信息、副本状态、调度策略
- **集群分布详情**: 可折叠展开的集群级信息
- **节点级分布**: 详细的节点资源和Pod信息
- **Pod级详情**: 单个Pod的状态、IP、重启次数等

## 📱 界面预览

### 概览页面
```
┌─────────┬─────────┬─────────┬─────────┐
│总工作负载 │ 已调度   │ 待调度   │ 失败    │
│   2     │   2     │   0     │   0     │
└─────────┴─────────┴─────────┴─────────┘

┌─────────────────┐  ┌─────────────────┐
│   集群分布       │  │  命名空间统计     │
│                │  │                │
│ ● master       │  │ 📦 test         │
│   2个工作负载    │  │ 总计:2 调度:2   │
│   副本: 8/8     │  │                │
│   ████████ 100% │  │                │
└─────────────────┘  └─────────────────┘
```

### 详细信息页面
```
┌─────────────────────────────────────────────────────────┐
│ 🚀 工作负载详情: nginx-1                                  │
├─────────────────────────────────────────────────────────┤
│ 名称: nginx-1        │ 总副本数: 3                       │
│ 命名空间: test       │ 就绪副本数: 3                     │
│ 类型: Deployment     │ 调度状态: ✅ Scheduled            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🏗️ 集群: master  副本: 3/3  ✅ Ready                     │
├─────────────────────────────────────────────────────────┤
│ 📱 节点分布 (5个节点)                                     │
│                                                         │
│ 🖥️ m-rke2-master03.example.com (10.10.10.13) [master]   │
│   ✅ Pod: nginx-1-658b854ff4-w9xrs (Running) - 10.42.2.12│
│                                                         │
│ 🖥️ m-rke2-node01.example.com (10.10.10.14) [worker]     │
│   ✅ Pod: nginx-1-658b854ff4-nh4pd (Running) - 10.42.4.17│
│                                                         │
│ 🖥️ m-rke2-node02.example.com (10.10.10.15) [worker]     │
│   ✅ Pod: nginx-1-658b854ff4-42pgz (Running) - 10.42.3.14│
└─────────────────────────────────────────────────────────┘
```

## 🛠️ 快速开始

### 环境要求
- **Karmada**: v1.31.3+
- **Go**: 1.19+
- **Node.js**: 16+
- **操作系统**: Linux

### 1. 启动后端API服务

```bash
# 编译项目
cd /root/Karmada-Manager
KUBECONFIG=/etc/karmada/karmada-apiserver.config make

# 启动API服务
KUBECONFIG=/etc/karmada/karmada-apiserver.config \
_output/bin/linux/amd64/karmada-dashboard-api \
--karmada-kubeconfig=/etc/karmada/karmada-apiserver.config \
--karmada-context=karmada-apiserver \
--kubeconfig=/root/.kube/config \
--context=default \
--insecure-port=8000 &
```

### 2. 启动前端服务

```bash
# 安装依赖
cd ui/apps/dashboard
npm install

# 启动开发服务器
npm run dev
```

### 3. 访问系统

- **前端界面**: http://localhost:5174
- **后端API**: http://localhost:8000/api/v1
- **API文档**: [cluster-scheduling-api.md](./cluster-scheduling-api.md)

## 🧪 功能测试

### 使用测试脚本

```bash
# 运行完整API测试
./agent/backend/API/test-scheduling-api.sh
```

### 手动测试关键接口

```bash
# 1. 测试调度概览
curl "http://127.0.0.1:8000/api/v1/scheduling/overview"

# 2. 测试工作负载列表
curl "http://127.0.0.1:8000/api/v1/scheduling/namespace/test/workloads"

# 3. 测试精确调度信息 (核心功能)
curl "http://127.0.0.1:8000/api/v1/workloads/test/nginx-1/precise-scheduling?kind=Deployment"
```

### 预期测试结果

✅ **成功指标**:
- 所有API返回200状态码
- 精确调度API显示节点级Pod分布
- 前端页面正常加载和交互
- 工作负载详情页面显示完整信息

## 📊 数据说明

### 当前测试环境数据

**集群配置**:
- **主集群**: master (5个节点: 3个master + 2个worker)
- **工作负载**: 2个Deployment (nginx-1, nginx-2)
- **总副本数**: 8个 (nginx-1: 3个, nginx-2: 5个)

**节点详情**:
- **m-rke2-master01.example.com** (10.10.10.11) - Master节点
- **m-rke2-master02.example.com** (10.10.10.12) - Master节点  
- **m-rke2-master03.example.com** (10.10.10.13) - Master节点
- **m-rke2-node01.example.com** (10.10.10.14) - Worker节点
- **m-rke2-node02.example.com** (10.10.10.15) - Worker节点

**Pod分布示例**:
```
nginx-1 (3个副本):
├── master03: nginx-1-658b854ff4-w9xrs (10.42.2.12)
├── node01: nginx-1-658b854ff4-nh4pd (10.42.4.17)
└── node02: nginx-1-658b854ff4-42pgz (10.42.3.14)

nginx-2 (5个副本):
├── master01: nginx-2-7789f4d6b-wlnlb (10.42.0.34)
├── master02: nginx-2-7789f4d6b-jmjpc (10.42.1.15)
├── master03: nginx-2-7789f4d6b-lh9wm (10.42.2.13)
├── node01: nginx-2-7789f4d6b-mzf7c (10.42.4.18)
└── node02: nginx-2-7789f4d6b-w84vr (10.42.3.15)
```

## 🚨 故障排除

### 常见问题

**1. API返回空数据**
```bash
# 检查Karmada连接
kubectl --kubeconfig=/etc/karmada/karmada-apiserver.config get resourcebindings -n test

# 确认工作负载存在
kubectl --kubeconfig=/etc/karmada/karmada-apiserver.config get deployments -n test
```

**2. 前端无法访问API**
```bash
# 检查API服务状态
ps aux | grep karmada-dashboard-api

# 检查端口占用
netstat -tulnp | grep :8000
```

**3. Pod过滤不正确**
- 确认Pod标签包含 `app: workload-name`
- 检查ResourceBinding与Deployment的匹配逻辑

### 日志查看

```bash
# API服务日志
tail -f /tmp/api.log

# 前端服务日志
tail -f /tmp/frontend.log
```

## 📈 性能优化

### 后端优化
- 使用缓存减少Kubernetes API调用
- 实现增量更新机制
- 添加资源访问权限控制

### 前端优化
- 实现数据分页和虚拟滚动
- 添加实时数据刷新
- 优化大量节点的渲染性能

## 🔮 未来计划

### 短期目标
- [ ] 支持更多工作负载类型 (StatefulSet, DaemonSet等)
- [ ] 添加多集群切换功能
- [ ] 实现调度策略编辑功能

### 长期目标  
- [ ] 集成告警和通知系统
- [ ] 支持自定义调度策略
- [ ] 提供调度性能分析和优化建议

## 📞 技术支持

如遇到问题，请检查：
1. **API文档**: [cluster-scheduling-api.md](./cluster-scheduling-api.md)
2. **测试脚本**: [test-scheduling-api.sh](./test-scheduling-api.sh)
3. **系统日志**: /tmp/api.log 和 /tmp/frontend.log

---

**🎉 恭喜！你已经成功搭建了完整的Karmada集群调度监控系统！** 
# Karmada Dashboard 后端构建和部署指南

## 项目概述

Karmada Dashboard 后端服务基于 Go 语言开发，使用 Gin 框架构建 RESTful API，为前端提供完整的多云资源管理、工作负载表单创建、调度策略可视化等功能支持。

## 技术栈

- **编程语言**: Go 1.19+
- **Web框架**: Gin
- **API规范**: RESTful API
- **数据存储**: Kubernetes etcd (通过 API Server)
- **多云管理**: Karmada API
- **部署方式**: Docker + Kubernetes
- **依赖管理**: Go Modules

## 功能特性

### 已实现功能
- ✅ **工作负载表单创建**: Deployment、StatefulSet、DaemonSet、Job、CronJob
- ✅ **服务管理**: Service 的创建、更新、删除
- ✅ **策略管理**: PropagationPolicy 的自动创建和管理
- ✅ **调度可视化**: 资源调度关系树形图展示
- ✅ **集群管理**: 多集群资源视图和状态监控
- ✅ **调度模拟**: 策略模拟和副本分配预览
- ❌ **国际化功能**: 已移除，简化系统架构

### 新增接口
- `POST /api/v1/*/form` - 各类工作负载的表单创建
- `GET /api/v1/scheduling/tree` - 资源调度关系树形图
- `GET /api/v1/scheduling/clusters/resources` - 集群资源视图
- `POST /api/v1/scheduling/simulate` - 调度策略模拟

## 本地开发环境设置

### 1. 环境准备

```bash
# 安装 Go 1.19+
# 下载并安装: https://golang.org/dl/

# 验证安装
go version

# 设置环境变量
export GOPROXY=https://goproxy.cn,direct
export GO111MODULE=on
```

### 2. 克隆代码

```bash
git clone <repository-url>
cd Karmada-Manager
```

### 3. 安装依赖

```bash
# 下载依赖
go mod download

# 整理依赖
go mod tidy

# 验证依赖
go mod verify
```

### 4. 配置环境

创建本地配置文件 `config/local.yaml`:

```yaml
server:
  host: "0.0.0.0"
  port: 8443
  insecure_port: 8080

karmada:
  apiserver: "https://karmada-apiserver:5443"
  kubeconfig: "/etc/karmada/karmada-apiserver.config"

kubernetes:
  kubeconfig: "/etc/kubernetes/admin.conf"

logging:
  level: "info"
  format: "json"

features:
  enable_metrics: true
  enable_profiling: false
  enable_workload_forms: true
  enable_scheduling_visualization: true
```

### 5. 启动本地开发服务

```bash
# 方式1: 直接运行
go run cmd/api/main.go \
  --insecure-port=8080 \
  --secure-port=8443 \
  --karmada-kubeconfig=/etc/karmada/karmada-apiserver.config \
  --kubeconfig=/etc/kubernetes/admin.conf

# 方式2: 使用 Makefile
make run

# 方式3: 编译后运行
make build
./_output/bin/linux/amd64/karmada-dashboard-api \
  --insecure-port=8080 \
  --secure-port=8443
```

### 6. 验证服务

```bash
# 健康检查
curl http://localhost:8080/healthz

# API版本
curl http://localhost:8080/api/v1/overview/karmada

# 新增功能验证
curl http://localhost:8080/api/v1/scheduling/clusters/resources
curl "http://localhost:8080/api/v1/scheduling/tree?resourceType=deployment"

# Swagger文档 (如果开启)
curl http://localhost:8080/swagger/index.html
```

## 构建和打包

### 1. 代码质量检查

```bash
# 运行所有测试
make test

# 代码格式化
make fmt

# 代码检查
make vet

# golangci-lint 检查
make lint

# 生成代码覆盖率报告
make coverage
```

### 2. 本地构建

```bash
# 构建所有平台
make build

# 构建指定平台
GOOS=linux GOARCH=amd64 make build

# 构建输出位置
ls _output/bin/linux/amd64/

# 构建特定组件
make build-api
make build-metrics-scraper
```

### 3. Docker 构建

```bash
# 构建 Docker 镜像
make docker-build

# 指定镜像标签
make docker-build IMG=karmada-dashboard-api:v1.0.0

# 推送镜像
make docker-push IMG=karmada-dashboard-api:v1.0.0

# 构建所有组件镜像
make docker-build-all
```

### 4. 多架构构建

```bash
# 构建多架构镜像
make docker-buildx IMG=karmada-dashboard-api:v1.0.0

# 支持的架构
PLATFORMS=linux/amd64,linux/arm64 make docker-buildx
```

## 部署指南

### 1. Kubernetes 部署

创建部署文件 `deploy/api-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karmada-dashboard-api
  namespace: karmada-system
  labels:
    app: karmada-dashboard-api
    component: api-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: karmada-dashboard-api
  template:
    metadata:
      labels:
        app: karmada-dashboard-api
        component: api-server
    spec:
      serviceAccountName: karmada-dashboard
      containers:
      - name: api
        image: karmada-dashboard-api:v1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        - containerPort: 8443
          name: https
          protocol: TCP
        - containerPort: 8090
          name: metrics
          protocol: TCP
        env:
        - name: KARMADA_KUBECONFIG
          value: "/etc/karmada/karmada-apiserver.config"
        - name: LOG_LEVEL
          value: "info"
        - name: ENABLE_WORKLOAD_FORMS
          value: "true"
        - name: ENABLE_SCHEDULING_VISUALIZATION
          value: "true"
        volumeMounts:
        - name: karmada-config
          mountPath: /etc/karmada
          readOnly: true
        - name: kubeconfig
          mountPath: /etc/kubernetes
          readOnly: true
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      volumes:
      - name: karmada-config
        secret:
          secretName: karmada-kubeconfig
      - name: kubeconfig
        secret:
          secretName: admin-kubeconfig
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: karmada-dashboard-api
  namespace: karmada-system
  labels:
    app: karmada-dashboard-api
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 8080
    targetPort: 8080
    protocol: TCP
  - name: https
    port: 8443
    targetPort: 8443
    protocol: TCP
  - name: metrics
    port: 8090
    targetPort: 8090
    protocol: TCP
  selector:
    app: karmada-dashboard-api
```

### 2. ServiceAccount 和 RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: karmada-dashboard
  namespace: karmada-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: karmada-dashboard
rules:
- apiGroups: [""]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["apps"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["batch"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["policy.karmada.io"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["cluster.karmada.io"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["work.karmada.io"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: karmada-dashboard
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: karmada-dashboard
subjects:
- kind: ServiceAccount
  name: karmada-dashboard
  namespace: karmada-system
```

### 3. ConfigMap 配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: karmada-dashboard-config
  namespace: karmada-system
data:
  config.yaml: |
    server:
      host: "0.0.0.0"
      port: 8443
      insecure_port: 8080
      metrics_port: 8090
    
    features:
      enable_metrics: true
      enable_profiling: false
      enable_workload_forms: true
      enable_scheduling_visualization: true
    
    logging:
      level: "info"
      format: "json"
    
    cors:
      allowed_origins: ["*"]
      allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      allowed_headers: ["*"]
```

### 4. Helm 部署

创建 `charts/karmada-dashboard/values.yaml`:

```yaml
# 默认值
replicaCount: 2

image:
  repository: karmada-dashboard-api
  tag: v1.0.0
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080
  httpsPort: 8443
  metricsPort: 8090

ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: dashboard-api.example.local
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

features:
  enableWorkloadForms: true
  enableSchedulingVisualization: true
  enableMetrics: true
  enableProfiling: false

security:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
```

部署命令：

```bash
# 安装
helm install karmada-dashboard ./charts/karmada-dashboard \
  --namespace karmada-system \
  --create-namespace

# 升级
helm upgrade karmada-dashboard ./charts/karmada-dashboard \
  --namespace karmada-system

# 卸载
helm uninstall karmada-dashboard --namespace karmada-system
```

## 监控和观测

### 1. Metrics 配置

```yaml
# Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: karmada-dashboard-api
  namespace: karmada-system
spec:
  selector:
    matchLabels:
      app: karmada-dashboard-api
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### 2. 日志配置

```yaml
# Fluent Bit 日志收集配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name tail
        Path /var/log/containers/karmada-dashboard-api-*.log
        Parser docker
        Tag karmada.dashboard.api
    
    [OUTPUT]
        Name forward
        Match karmada.*
        Host fluent-bit-forwarder
        Port 24224
```

### 3. 健康检查

API 提供以下健康检查端点：

- `/healthz` - 存活性检查
- `/readyz` - 就绪性检查
- `/metrics` - Prometheus 指标
- `/debug/pprof/` - 性能分析（需启用）

## 故障排查

### 1. 常见问题

**问题1: API 启动失败**
```bash
# 检查日志
kubectl logs -n karmada-system deployment/karmada-dashboard-api

# 检查配置
kubectl get configmap -n karmada-system karmada-dashboard-config -o yaml

# 检查权限
kubectl auth can-i --list --as=system:serviceaccount:karmada-system:karmada-dashboard
```

**问题2: 无法访问 Karmada API**
```bash
# 检查 Karmada 连接
kubectl exec -n karmada-system deployment/karmada-dashboard-api -- \
  curl -k https://karmada-apiserver:5443/healthz

# 检查证书
kubectl get secret -n karmada-system karmada-kubeconfig -o yaml
```

**问题3: 工作负载创建失败**
```bash
# 检查 RBAC 权限
kubectl auth can-i create deployments --as=system:serviceaccount:karmada-system:karmada-dashboard

# 检查资源配额
kubectl describe quota -n target-namespace

# 检查网络策略
kubectl get networkpolicy -n target-namespace
```

### 2. 调试模式

启用调试模式：

```bash
# 本地调试
go run cmd/api/main.go --log-level=debug --enable-profiling=true

# 容器调试
kubectl set env deployment/karmada-dashboard-api LOG_LEVEL=debug -n karmada-system

# 查看详细日志
kubectl logs -f -n karmada-system deployment/karmada-dashboard-api
```

### 3. 性能分析

```bash
# CPU 分析
go tool pprof http://localhost:8080/debug/pprof/profile

# 内存分析
go tool pprof http://localhost:8080/debug/pprof/heap

# Goroutine 分析
go tool pprof http://localhost:8080/debug/pprof/goroutine
```

## 开发指南

### 1. 代码结构

```
cmd/api/                    # API 服务入口
├── app/                   # 应用核心
│   ├── options/          # 命令行选项
│   ├── router/           # 路由配置
│   ├── routes/           # 路由处理器
│   └── types/            # 数据类型定义
pkg/                       # 共享包
├── client/               # 客户端工具
├── common/               # 通用工具
├── resource/             # 资源管理
└── dataselect/           # 数据选择器
```

### 2. 添加新功能

创建新的工作负载类型示例：

```bash
# 1. 创建类型定义
mkdir -p cmd/api/app/types/api/v1
touch cmd/api/app/types/api/v1/newworkload.go

# 2. 创建路由处理器
mkdir -p cmd/api/app/routes/newworkload
touch cmd/api/app/routes/newworkload/handler.go
touch cmd/api/app/routes/newworkload/misc.go

# 3. 注册路由
# 编辑 cmd/api/app/router/router.go

# 4. 编写测试
touch cmd/api/app/routes/newworkload/handler_test.go

# 5. 更新文档
# 编辑 doc/agent/backend/API_Spec.md
```

### 3. 测试

```bash
# 单元测试
go test ./...

# 集成测试
make test-integration

# 端到端测试
make test-e2e

# 性能测试
make test-performance
```

## 版本发布

### 1. 发布流程

```bash
# 1. 更新版本号
git tag v1.0.0

# 2. 构建发布版本
make release VERSION=v1.0.0

# 3. 构建镜像
make docker-build IMG=karmada-dashboard-api:v1.0.0

# 4. 推送镜像
make docker-push IMG=karmada-dashboard-api:v1.0.0

# 5. 创建 GitHub Release
# 上传构建产物和更新说明
```

### 2. 版本兼容性

| API 版本 | Karmada 版本 | Kubernetes 版本 |
|----------|--------------|-----------------|
| v1.0.0   | v1.7.0+      | v1.22+          |
| v0.9.0   | v1.6.0+      | v1.20+          |

## 安全注意事项

1. **权限最小化**: 确保 ServiceAccount 只有必要的权限
2. **网络安全**: 使用 NetworkPolicy 限制网络访问
3. **容器安全**: 使用非 root 用户运行容器
4. **密钥管理**: 使用 Kubernetes Secret 管理敏感信息
5. **镜像安全**: 定期扫描容器镜像漏洞

## 贡献指南

1. Fork 项目仓库
2. 创建功能分支
3. 提交代码变更
4. 编写测试用例
5. 更新文档
6. 提交 Pull Request

详细的贡献指南请参考项目根目录的 `CONTRIBUTING.md` 文件。 
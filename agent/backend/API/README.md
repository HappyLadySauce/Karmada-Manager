# Karmada Dashboard API 测试工具

本目录包含了用于测试 Karmada Dashboard API 接口的工具和文档。

## 文件说明

- `karmada_api_test.py` - Python 版本的 API 测试脚本
- `karmada_api_test.sh` - Shell/Curl 版本的 API 测试脚本  
- `karmada_api_documentation.md` - 完整的 API 接口文档
- `README.md` - 本说明文件

## Python 测试脚本使用方法

### 安装依赖

```bash
pip install requests pyyaml
```

### 基本使用

```bash
# 使用默认设置 (http://localhost:8000)
python karmada_api_test.py

# 指定 API 地址
python karmada_api_test.py --url http://your-api-server:8000

# 使用认证 token
python karmada_api_test.py --token your-jwt-token

# 详细输出模式
python karmada_api_test.py --verbose

# 组合使用
python karmada_api_test.py --url http://localhost:8000 --token your-token --verbose
```

### 环境变量

你也可以使用环境变量来配置：

```bash
export API_BASE_URL=http://localhost:8000
export TOKEN=your-jwt-token
python karmada_api_test.py
```

## Shell 测试脚本使用方法

### 依赖检查

确保系统已安装：
- `curl` (必需)
- `jq` (可选，用于 JSON 格式化)

### 基本使用

```bash
# 给脚本执行权限
chmod +x karmada_api_test.sh

# 使用默认设置
./karmada_api_test.sh

# 指定 API 地址
./karmada_api_test.sh --url http://your-api-server:8000

# 使用认证 token
./karmada_api_test.sh --token your-jwt-token

# 详细输出模式
./karmada_api_test.sh --verbose

# 查看帮助
./karmada_api_test.sh --help
```

### 环境变量

```bash
export API_BASE_URL=http://localhost:8000
export TOKEN=your-token
export VERBOSE=true
./karmada_api_test.sh
```

## 测试内容

两个测试脚本都会测试以下 API 接口：

### 认证接口
- 用户登录 (`POST /api/v1/login`)
- 获取用户信息 (`GET /api/v1/me`)

### 系统概览
- 获取系统概览 (`GET /api/v1/overview`)

### 集群管理
- 获取集群列表 (`GET /api/v1/cluster`)
- 获取集群详情 (`GET /api/v1/cluster/{name}`)
- 创建集群 (`POST /api/v1/cluster`)
- 更新集群 (`PUT /api/v1/cluster/{name}`)
- 删除集群 (`DELETE /api/v1/cluster/{name}`)

### 命名空间管理
- 获取命名空间列表 (`GET /api/v1/namespace`)
- 获取命名空间详情 (`GET /api/v1/namespace/{name}`)
- 获取命名空间事件 (`GET /api/v1/namespace/{name}/event`)
- 创建命名空间 (`POST /api/v1/namespace`)

### 工作负载管理
- 部署 (Deployment)
- 服务 (Service)
- 状态副本集 (StatefulSet)
- 守护进程集 (DaemonSet)
- 任务 (Job)
- 定时任务 (CronJob)
- 入口 (Ingress)

### 配置管理
- 配置映射 (ConfigMap)
- 密钥 (Secret)

### 策略管理
- 传播策略 (PropagationPolicy)
- 集群传播策略 (ClusterPropagationPolicy)
- 覆盖策略 (OverridePolicy)
- 集群覆盖策略 (ClusterOverridePolicy)

### 非结构化资源
- 获取任意 Kubernetes 资源
- 删除非结构化资源

### 成员集群
- 获取成员集群节点
- 获取成员集群服务

## 测试结果

测试脚本会输出详细的测试结果，包括：

- ✅ 通过的测试 (绿色)
- ❌ 失败的测试 (红色)
- 测试统计信息
- 成功率

### 状态码说明

测试脚本会检查以下 HTTP 状态码：

- `200` - 请求成功
- `201` - 资源创建成功
- `400` - 请求参数错误 (某些测试中认为是正常的)
- `401` - 未认证 (没有 token 时是正常的)
- `403` - 权限不足 (某些情况下是正常的)
- `404` - 资源不存在 (某些测试中是正常的)
- `409` - 资源冲突
- `422` - 数据验证失败

## 使用建议

### 1. 开发环境测试

在开发环境中，你可以直接运行测试脚本来验证 API 是否正常工作：

```bash
# 启动 Karmada Dashboard API 服务
cd /path/to/karmada-dashboard
make run-api

# 在另一个终端运行测试
./agent/backend/API/karmada_api_test.sh --url http://localhost:8000
```

### 2. CI/CD 集成

可以将测试脚本集成到 CI/CD 流水线中：

```yaml
# GitHub Actions 示例
- name: Test API
  run: |
    python agent/backend/API/karmada_api_test.py --url ${{ env.API_URL }}
```

### 3. 监控和告警

可以定期运行测试脚本来监控 API 健康状态：

```bash
# 定时任务示例
*/5 * * * * /path/to/karmada_api_test.sh --url http://api.example.com >> /var/log/api_test.log 2>&1
```

## 自定义测试

### 添加新的测试用例

如果需要测试新的 API 接口，可以：

1. **Python 脚本**: 在 `KarmadaAPITester` 类中添加新的测试方法
2. **Shell 脚本**: 添加新的测试函数

示例（Python）：

```python
def test_new_api(self):
    """新接口测试"""
    logger.info("开始新接口测试...")
    
    try:
        response = self.make_request("GET", "/new-endpoint")
        success = response.status_code in [200, 401, 403]
        self.log_test_result("新接口测试", success, f"状态码: {response.status_code}")
    except Exception as e:
        self.log_test_result("新接口测试", False, str(e))
```

### 修改预期状态码

如果某个接口的预期行为发生变化，可以修改对应测试中的预期状态码列表。

## 故障排除

### 常见问题

1. **连接被拒绝**
   - 确认 API 服务是否已启动
   - 检查 URL 和端口是否正确

2. **认证失败**
   - 确认 token 是否有效
   - 检查 token 格式是否正确

3. **权限不足**
   - 确认用户是否有相应权限
   - 检查角色绑定配置

4. **请求超时**
   - 检查网络连接
   - 适当增加超时时间

### 调试模式

使用 `--verbose` 参数可以看到详细的请求和响应信息，有助于问题排查。

## 贡献

如果你发现测试脚本的问题或需要添加新的测试用例，欢迎提交 PR 或 Issue。

## 更新日志

- **v1.0.0** (2024年): 初始版本
  - 包含完整的 API 测试覆盖
  - 支持 Python 和 Shell 两种实现
  - 提供详细的 API 文档 

# Karmada Dashboard 调度接口测试脚本

这是一个专门用于测试 Karmada Dashboard 调度相关 API 接口的综合测试脚本。

## 📋 功能特性

### 🎯 测试范围
- **健康检查测试**: 验证服务基础可用性
- **工作负载调度测试**: 测试各种工作负载的调度信息接口
- **调度概览测试**: 验证调度概览数据接口
- **命名空间工作负载测试**: 测试命名空间级别的工作负载调度
- **压力测试**: 并发和连续请求测试

### 🛠️ 增强功能
- **灵活参数配置**: 30+ 个可配置参数
- **多种输出格式**: Console、JSON、JUnit XML
- **测试套件选择**: 可选择性运行特定测试类型
- **重试机制**: 自动重试失败的请求
- **响应时间统计**: 精确的性能指标
- **自定义测试数据**: 支持外部测试数据文件
- **代理支持**: HTTP代理配置
- **信号处理**: 优雅的中断处理

## 🚀 快速开始

### 基础使用

```bash
# 最简单的使用方式
./scheduling_api_test.sh

# 指定API地址和认证token
./scheduling_api_test.sh --url http://localhost:8000 --token your-jwt-token

# 详细输出模式
./scheduling_api_test.sh --verbose

# 查看帮助信息
./scheduling_api_test.sh --help
```

### 测试套件选择

```bash
# 仅运行健康检查
./scheduling_api_test.sh --suite health

# 仅运行工作负载相关测试
./scheduling_api_test.sh --suite workload

# 仅运行调度概览测试
./scheduling_api_test.sh --suite overview

# 仅运行命名空间测试
./scheduling_api_test.sh --suite namespace

# 仅运行压力测试
./scheduling_api_test.sh --suite stress
```

## 📊 输出格式

### Console 输出 (默认)
彩色的控制台输出，实时显示测试进度和结果。

### JSON 输出
```bash
./scheduling_api_test.sh --output json --output-file results.json
```

生成的JSON包含完整的测试结果和统计信息：
```json
{
  "summary": {
    "total": 45,
    "passed": 40,
    "failed": 3,
    "skipped": 2,
    "success_rate": 88,
    "timestamp": "2025-06-04T14:30:00Z",
    "duration": "120s"
  },
  "tests": [...]
}
```

### JUnit XML 输出
```bash
./scheduling_api_test.sh --output junit --output-file test-results.xml
```

适合CI/CD集成的JUnit格式报告。

## ⚙️ 配置选项

### 基础配置

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| `--url` | `API_BASE_URL` | `http://localhost:8000` | API基础URL |
| `--token` | `TOKEN` | - | 认证token |
| `--verbose` | `VERBOSE` | `false` | 详细输出 |

### 测试控制

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| `--suite` | `TEST_SUITE` | `all` | 测试套件选择 |
| `--skip-health` | `SKIP_HEALTH_CHECK` | `false` | 跳过健康检查 |
| `--stress` | `STRESS_TEST` | `false` | 启用压力测试 |
| `--fail-fast` | `FAIL_FAST` | `false` | 遇到失败立即停止 |
| `--concurrency` | `CONCURRENCY` | `5` | 压力测试并发数 |

### 网络配置

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| `--timeout` | `TIMEOUT` | `30` | 请求超时时间(秒) |
| `--retries` | `MAX_RETRIES` | `3` | 最大重试次数 |
| `--retry-delay` | `RETRY_DELAY` | `2` | 重试间隔(秒) |
| `--proxy` | `PROXY` | - | HTTP代理设置 |
| `--headers` | `CUSTOM_HEADERS` | - | 自定义请求头 |

### 输出配置

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| `--log-level` | `LOG_LEVEL` | `INFO` | 日志级别 |
| `--output` | `OUTPUT_FORMAT` | `console` | 输出格式 |
| `--output-file` | `OUTPUT_FILE` | - | 结果输出文件 |
| `--save-responses` | `SAVE_RESPONSES` | `false` | 保存响应到文件 |
| `--test-data` | `TEST_DATA_FILE` | - | 测试数据文件路径 |

## 🔧 高级用法

### 使用环境变量

```bash
# 设置环境变量
export API_BASE_URL="https://karmada-dashboard.example.com"
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export LOG_LEVEL="DEBUG"
export OUTPUT_FORMAT="json"

# 运行测试
./scheduling_api_test.sh
```

### 使用配置文件

```bash
# 创建配置脚本
cat > test_config.sh << 'EOF'
#!/bin/bash
export API_BASE_URL="http://test-cluster:8000"
export TOKEN="test-token"
export TIMEOUT=60
export MAX_RETRIES=5
export VERBOSE=true
EOF

# 加载配置并运行测试
source test_config.sh && ./scheduling_api_test.sh
```

### 自定义测试数据

```bash
# 使用自定义测试数据文件
./scheduling_api_test.sh --test-data test_data_example.sh

# 创建你自己的测试数据文件
cp test_data_example.sh my_test_data.sh
# 编辑 my_test_data.sh...
./scheduling_api_test.sh --test-data my_test_data.sh
```

### 代理和自定义头

```bash
# 使用HTTP代理
./scheduling_api_test.sh --proxy http://proxy.company.com:8080

# 添加自定义请求头
./scheduling_api_test.sh --headers "X-Custom-Header:value,X-Request-ID:12345"

# 组合使用
./scheduling_api_test.sh \
  --proxy http://proxy:8080 \
  --headers "X-Environment:test,X-Version:v1.0" \
  --timeout 60 \
  --retries 5
```

## 🧪 实用示例

### CI/CD 集成

```bash
# 在CI/CD管道中运行
./scheduling_api_test.sh \
  --url "$KARMADA_API_URL" \
  --token "$KARMADA_TOKEN" \
  --output junit \
  --output-file test-results.xml \
  --fail-fast \
  --log-level WARN
```

### 开发环境验证

```bash
# 快速验证开发环境
./scheduling_api_test.sh \
  --suite health \
  --timeout 10 \
  --retries 1 \
  --log-level INFO
```

### 生产环境健康检查

```bash
# 生产环境定期检查
./scheduling_api_test.sh \
  --suite "health,overview" \
  --timeout 30 \
  --retries 3 \
  --output json \
  --output-file health-check-$(date +%Y%m%d-%H%M%S).json
```

### 性能压力测试

```bash
# 高并发压力测试
./scheduling_api_test.sh \
  --stress \
  --concurrency 20 \
  --timeout 120 \
  --save-responses \
  --output json \
  --output-file stress-test-results.json
```

### 调试模式

```bash
# 详细调试信息
./scheduling_api_test.sh \
  --verbose \
  --log-level DEBUG \
  --save-responses \
  --retries 1 \
  --timeout 10
```

## 📁 文件结构

```
agent/backend/API/
├── scheduling_api_test.sh      # 主测试脚本
├── test_data_example.sh        # 示例测试数据文件
├── README.md                   # 本文档
└── /tmp/scheduling_api_responses/  # 响应保存目录 (如果启用)
```

## 🔍 测试的API接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 健康检查 | GET | `/health` | 服务健康状态 |
| 工作负载调度 | GET | `/api/v1/workloads/:namespace/:name/scheduling` | 基础调度信息 |
| 精确调度 | GET | `/api/v1/workloads/:namespace/:name/precise-scheduling` | 精确调度信息 |
| 调度概览 | GET | `/api/v1/scheduling/overview` | 调度概览数据 |
| 命名空间工作负载 | GET | `/api/v1/scheduling/namespace/:namespace/workloads` | 命名空间级工作负载 |

## 📊 测试结果解析

### 成功率指标
- **100%**: 🎉 所有测试通过
- **80-99%**: ⚠️ 大部分测试通过，少数失败
- **<80%**: ❌ 多个测试失败，需要检查

### 常见问题排查

#### 连接失败 (HTTP 000)
- 检查API服务是否启动
- 验证URL是否正确
- 检查网络连接

#### 认证失败 (HTTP 401/403)
- 验证token是否有效
- 检查token权限
- 确认认证头格式

#### 超时问题
- 增加 `--timeout` 值
- 检查网络延迟
- 验证服务性能

#### 404错误
- 确认API路径正确
- 检查服务版本兼容性
- 验证资源是否存在

## 🛠️ 依赖要求

### 必需依赖
- `curl`: HTTP请求工具
- `bash`: Shell环境 (版本 4.0+)

### 可选依赖
- `jq`: JSON格式化 (推荐安装)
- `bc`: 精确时间计算

### 安装命令

```bash
# CentOS/RHEL
sudo yum install curl jq bc

# Ubuntu/Debian
sudo apt install curl jq bc

# macOS
brew install curl jq bc
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📝 更新日志

### v2.0 (当前版本)
- ✨ 新增30+个配置参数
- 🚀 支持多种输出格式
- 🔄 添加重试机制
- 📊 精确的性能统计
- 🎯 测试套件选择
- 🔧 自定义测试数据支持

### v1.0
- 基础API测试功能
- 简单的健康检查
- 基本的错误处理

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请：

1. 查看此README文档
2. 检查常见问题部分
3. 使用 `--verbose` 模式获取详细信息
4. 提交Issue或Pull Request

---

🎯 **目标**: 为Karmada Dashboard提供全面、可靠、易用的API测试解决方案 
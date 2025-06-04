#!/bin/bash

# Karmada Dashboard 调度接口测试脚本
# 专门测试 cmd/api/app/routes/scheduling/handler.go 中定义的调度相关 API 接口

# 不要在错误时立即退出，让脚本继续运行完所有测试
# set -e  # 注释掉这行

# 默认配置
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
API_VERSION="v1"
TOKEN="${TOKEN:-}"
VERBOSE="${VERBOSE:-false}"

# 新增配置参数
TIMEOUT="${TIMEOUT:-30}"                    # 请求超时时间(秒)
MAX_RETRIES="${MAX_RETRIES:-3}"            # 失败请求最大重试次数
RETRY_DELAY="${RETRY_DELAY:-2}"            # 重试间隔(秒)
CONCURRENCY="${CONCURRENCY:-5}"            # 压力测试并发数
OUTPUT_FORMAT="${OUTPUT_FORMAT:-console}"   # 输出格式: console/json/junit
LOG_LEVEL="${LOG_LEVEL:-INFO}"             # 日志级别: DEBUG/INFO/WARN/ERROR
TEST_SUITE="${TEST_SUITE:-all}"            # 测试套件: all/health/workload/overview/namespace/stress
SKIP_HEALTH_CHECK="${SKIP_HEALTH_CHECK:-false}"  # 跳过健康检查
SAVE_RESPONSES="${SAVE_RESPONSES:-false}"   # 保存响应到文件
OUTPUT_FILE="${OUTPUT_FILE:-}"             # 测试结果输出文件
PROXY="${PROXY:-}"                         # HTTP代理设置
CUSTOM_HEADERS="${CUSTOM_HEADERS:-}"       # 自定义请求头 (格式: "Header1:Value1,Header2:Value2")
TEST_DATA_FILE="${TEST_DATA_FILE:-}"       # 测试数据文件路径
FAIL_FAST="${FAIL_FAST:-false}"           # 遇到失败立即停止

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 测试结果数组 (用于JSON输出)
declare -a TEST_RESULTS=()

# 响应保存目录
RESPONSE_DIR="/tmp/scheduling_api_responses"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]] || [[ "$LOG_LEVEL" == "DEBUG" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

log_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED_TESTS++))
}

# 检查日志级别
should_log() {
    local level="$1"
    case "$LOG_LEVEL" in
        "DEBUG") return 0 ;;
        "INFO") [[ "$level" != "DEBUG" ]] && return 0 || return 1 ;;
        "WARN") [[ "$level" =~ ^(WARN|ERROR)$ ]] && return 0 || return 1 ;;
        "ERROR") [[ "$level" == "ERROR" ]] && return 0 || return 1 ;;
        *) return 0 ;;
    esac
}

# 增加测试计数
count_test() {
    ((TOTAL_TESTS++))
}

# 重试机制函数
retry_request() {
    local command="$1"
    local max_retries="$2"
    local delay="$3"
    local attempt=1
    
    while [[ $attempt -le $max_retries ]]; do
        if eval "$command"; then
            return 0
        fi
        
        if [[ $attempt -lt $max_retries ]]; then
            log_warning "⏳ 请求失败，${delay}秒后进行第${attempt}次重试..."
            sleep "$delay"
        fi
        
        ((attempt++))
    done
    
    return 1
}

# 保存响应到文件
save_response() {
    local test_name="$1"
    local response_content="$2"
    local http_code="$3"
    
    if [[ "$SAVE_RESPONSES" == "true" ]]; then
        mkdir -p "$RESPONSE_DIR"
        local filename="${RESPONSE_DIR}/$(echo "$test_name" | tr ' ' '_' | tr '/' '_').json"
        local response_data="{\"test_name\":\"$test_name\",\"http_code\":\"$http_code\",\"timestamp\":\"$(date -Iseconds)\",\"response\":$response_content}"
        echo "$response_data" > "$filename"
        log_debug "响应已保存到: $filename"
    fi
}

# 添加测试结果到数组
add_test_result() {
    local test_name="$1"
    local status="$2"
    local http_code="$3"
    local message="$4"
    local duration="$5"
    
    local result="{\"name\":\"$test_name\",\"status\":\"$status\",\"http_code\":\"$http_code\",\"message\":\"$message\",\"duration\":\"$duration\",\"timestamp\":\"$(date -Iseconds)\"}"
    TEST_RESULTS+=("$result")
}

# 发送 HTTP 请求的通用函数 (增强版)
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_codes="$4"
    local test_name="$5"
    
    count_test
    
    # 检查是否应该跳过这个测试
    if should_skip_test "$test_name"; then
        log_skip "跳过测试: $test_name"
        add_test_result "$test_name" "SKIPPED" "N/A" "Test skipped based on configuration" "0"
        return 0
    fi
    
    local start_time=$(date +%s.%N)
    local url="${API_BASE_URL}/api/${API_VERSION}${endpoint}"
    local response_file="/tmp/scheduling_api_response_$(date +%s%N).json"
    local curl_opts=("-s" "-w" "%{http_code}" "-o" "$response_file" "--max-time" "$TIMEOUT")
    
    # 添加代理设置
    if [[ -n "$PROXY" ]]; then
        curl_opts+=("--proxy" "$PROXY")
        log_debug "使用代理: $PROXY"
    fi
    
    # 添加认证头
    if [[ -n "$TOKEN" ]]; then
        curl_opts+=("-H" "Authorization: Bearer $TOKEN")
        log_debug "使用认证 Token: ${TOKEN:0:20}..."
    fi
    
    # 添加 Content-Type
    curl_opts+=("-H" "Content-Type: application/json")
    
    # 添加自定义请求头
    if [[ -n "$CUSTOM_HEADERS" ]]; then
        IFS=',' read -ra HEADERS <<< "$CUSTOM_HEADERS"
        for header in "${HEADERS[@]}"; do
            curl_opts+=("-H" "$header")
            log_debug "添加自定义请求头: $header"
        done
    fi
    
    # 添加请求方法和数据
    curl_opts+=("-X" "$method")
    if [[ -n "$data" ]]; then
        curl_opts+=("-d" "$data")
        log_debug "请求数据: $data"
    fi
    
    # 添加 URL
    curl_opts+=("$url")
    
    should_log "INFO" && log_info "🚀 测试: $test_name"
    should_log "INFO" && log_info "📡 请求: $method $url"
    
    if [[ "$VERBOSE" == "true" ]] || [[ "$LOG_LEVEL" == "DEBUG" ]]; then
        log_debug "完整 curl 命令: curl ${curl_opts[*]}"
    fi
    
    # 执行请求 (带重试机制)
    local http_code=""
    local curl_command="http_code=\$(curl \"\${curl_opts[@]}\" 2>/tmp/scheduling_curl_error.log || echo \"000\")"
    
    if ! retry_request "$curl_command" "$MAX_RETRIES" "$RETRY_DELAY"; then
        http_code="000"
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    # 读取响应内容
    local response_content=""
    if [[ -f "$response_file" ]]; then
        response_content=$(cat "$response_file" 2>/dev/null || echo "{}")
    else
        response_content="{}"
    fi
    
    # 读取 curl 错误信息
    local curl_error=""
    if [[ -f "/tmp/scheduling_curl_error.log" ]]; then
        curl_error=$(cat /tmp/scheduling_curl_error.log 2>/dev/null || echo "")
    fi
    
    # 显示响应信息
    should_log "INFO" && log_info "📥 响应状态码: $http_code"
    should_log "INFO" && log_info "⏱️  响应时间: ${duration}s"
    
    if [[ -n "$curl_error" ]]; then
        should_log "ERROR" && log_error "❌ Curl 错误: $curl_error"
    fi
    
    # 显示响应内容
    if [[ -n "$response_content" ]] && [[ "$response_content" != "{}" ]]; then
        should_log "DEBUG" && log_debug "📄 响应内容 (完整数据):"
        if should_log "DEBUG" && command -v jq &> /dev/null; then
            echo "$response_content" | jq . 2>/dev/null || echo "$response_content"
        elif should_log "DEBUG"; then
            echo "$response_content"
        fi
    elif [[ "$http_code" != "000" ]] && should_log "DEBUG"; then
        log_debug "📄 响应内容: (空)"
    fi
    
    # 保存响应
    save_response "$test_name" "$response_content" "$http_code"
    
    # 检查响应码并记录结果
    local test_status=""
    local test_message=""
    
    if [[ "$expected_codes" == *"$http_code"* ]]; then
        should_log "INFO" && log_success "$test_name ✅"
        test_status="PASSED"
        test_message="HTTP code $http_code as expected"
    else
        should_log "ERROR" && log_error "$test_name ❌ (状态码: $http_code, 期望: $expected_codes)"
        test_status="FAILED"
        test_message="HTTP code $http_code, expected: $expected_codes"
        
        # 如果设置了快速失败，则退出
        if [[ "$FAIL_FAST" == "true" ]]; then
            log_error "💥 快速失败模式已启用，测试停止"
            cleanup_and_exit 1
        fi
    fi
    
    # 添加测试结果
    add_test_result "$test_name" "$test_status" "$http_code" "$test_message" "$duration"
    
    # 清理临时文件
    rm -f "$response_file"
    
    should_log "DEBUG" && echo "----------------------------------------"
}

# 判断是否应该跳过测试
should_skip_test() {
    local test_name="$1"
    
    # 根据测试套件设置判断是否跳过
    case "$TEST_SUITE" in
        "health")
            [[ "$test_name" != *"健康检查"* ]] && return 0
            ;;
        "workload")
            [[ "$test_name" != *"工作负载"* ]] && [[ "$test_name" != *"Deployment"* ]] && [[ "$test_name" != *"StatefulSet"* ]] && [[ "$test_name" != *"DaemonSet"* ]] && return 0
            ;;
        "overview")
            [[ "$test_name" != *"概览"* ]] && [[ "$test_name" != *"overview"* ]] && return 0
            ;;
        "namespace")
            [[ "$test_name" != *"命名空间"* ]] && [[ "$test_name" != *"namespace"* ]] && return 0
            ;;
        "stress")
            [[ "$test_name" != *"并发"* ]] && [[ "$test_name" != *"压力"* ]] && [[ "$test_name" != *"连续"* ]] && return 0
            ;;
        "all")
            # 运行所有测试
            return 1
            ;;
    esac
    
    return 1
}

# 输出不同格式的测试结果
output_test_results() {
    case "$OUTPUT_FORMAT" in
        "json")
            output_json_results
            ;;
        "junit")
            output_junit_results
            ;;
        "console")
            # 默认控制台输出，已经在主流程中处理
            ;;
    esac
}

# 输出JSON格式结果
output_json_results() {
    local json_output=""
    json_output=$(cat << EOF
{
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "success_rate": $(( TOTAL_TESTS > 0 ? PASSED_TESTS * 100 / TOTAL_TESTS : 0 )),
    "timestamp": "$(date -Iseconds)",
    "duration": "${duration}s"
  },
  "tests": [
$(IFS=,; echo "${TEST_RESULTS[*]}")
  ]
}
EOF
)
    
    if [[ -n "$OUTPUT_FILE" ]]; then
        echo "$json_output" > "$OUTPUT_FILE"
        log_info "📄 JSON 测试结果已保存到: $OUTPUT_FILE"
    else
        echo "$json_output"
    fi
}

# 输出JUnit格式结果
output_junit_results() {
    local junit_file="${OUTPUT_FILE:-scheduling_test_results.xml}"
    
    cat > "$junit_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Karmada Scheduling API Tests" 
           tests="$TOTAL_TESTS" 
           failures="$FAILED_TESTS" 
           skipped="$SKIPPED_TESTS" 
           time="$duration">
EOF
    
    for result in "${TEST_RESULTS[@]}"; do
        local name=$(echo "$result" | jq -r '.name' 2>/dev/null || echo "unknown")
        local status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "unknown")
        local message=$(echo "$result" | jq -r '.message' 2>/dev/null || echo "")
        local test_duration=$(echo "$result" | jq -r '.duration' 2>/dev/null || echo "0")
        
        echo "  <testcase name=\"$name\" time=\"$test_duration\">" >> "$junit_file"
        
        case "$status" in
            "FAILED")
                echo "    <failure message=\"$message\"/>" >> "$junit_file"
                ;;
            "SKIPPED")
                echo "    <skipped message=\"$message\"/>" >> "$junit_file"
                ;;
        esac
        
        echo "  </testcase>" >> "$junit_file"
    done
    
    echo "</testsuite>" >> "$junit_file"
    log_info "📄 JUnit 测试结果已保存到: $junit_file"
}

# 清理和退出函数
cleanup_and_exit() {
    local exit_code="${1:-0}"
    
    # 清理临时文件
    rm -f /tmp/scheduling_api_response*.json /tmp/scheduling_curl_error.log
    
    # 输出测试结果
    output_test_results
    
    exit "$exit_code"
}

# 健康检查测试
test_health_check() {
    if [[ "$SKIP_HEALTH_CHECK" == "true" ]]; then
        log_skip "⏭️  跳过健康检查测试"
        return 0
    fi
    
    log_header "🔍 开始健康检查测试..."
    
    count_test
    local url="${API_BASE_URL}/health"
    
    log_info "🚀 测试: 健康检查"
    log_info "📡 请求: GET $url"
    
    local http_code
    local response_content
    
    # 执行健康检查请求
    response_content=$(curl -s -w "\n%{http_code}" "$url" 2>/tmp/scheduling_curl_error.log || echo -e "\n000")
    http_code=$(echo "$response_content" | tail -n1)
    response_content=$(echo "$response_content" | head -n -1)
    
    # 读取 curl 错误信息
    local curl_error=""
    if [[ -f "/tmp/scheduling_curl_error.log" ]]; then
        curl_error=$(cat /tmp/scheduling_curl_error.log 2>/dev/null || echo "")
    fi
    
    log_info "📥 响应状态码: $http_code"
    
    if [[ -n "$curl_error" ]]; then
        log_error "❌ Curl 错误: $curl_error"
    fi
    
    if [[ -n "$response_content" ]]; then
        log_info "📄 响应内容 (完整数据):"
        if command -v jq &> /dev/null; then
            echo "$response_content" | jq . 2>/dev/null || echo "$response_content"
        else
            echo "$response_content"
        fi
    fi
    
    if [[ "$http_code" == "200" ]]; then
        log_success "健康检查 ✅"
    else
        log_error "健康检查 ❌ (状态码: $http_code)"
        if [[ "$http_code" == "000" ]]; then
            log_warning "💡 提示: 可能是服务未启动或网络连接问题"
        fi
    fi
    
    echo "----------------------------------------"
}

# 工作负载调度接口测试
test_workload_scheduling_apis() {
    log_header "📋 开始工作负载调度接口测试..."
    
    # 测试用的工作负载信息
    local namespaces=("default" "kube-system" "test-namespace")
    local workload_names=("nginx-deployment" "test-deployment" "example-app")
    local workload_kinds=("Deployment" "StatefulSet" "DaemonSet")
    
    for namespace in "${namespaces[@]}"; do
        for workload_name in "${workload_names[@]}"; do
            for kind in "${workload_kinds[@]}"; do
                log_info "🔍 测试工作负载: $namespace/$workload_name (kind: $kind)"
                
                # 测试基础调度信息
                make_request "GET" "/workloads/$namespace/$workload_name/scheduling?kind=$kind" "" "200 401 403 404 500" "获取${kind}基础调度信息"
                
                # 测试精确调度信息
                make_request "GET" "/workloads/$namespace/$workload_name/precise-scheduling?kind=$kind" "" "200 401 403 404 500" "获取${kind}精确调度信息"
            done
        done
    done
    
    # 测试默认 kind (Deployment)
    log_info "🔍 测试默认 kind (Deployment)"
    make_request "GET" "/workloads/default/nginx-deployment/scheduling" "" "200 401 403 404 500" "获取默认Deployment调度信息"
    make_request "GET" "/workloads/default/nginx-deployment/precise-scheduling" "" "200 401 403 404 500" "获取默认Deployment精确调度信息"
    
    # 测试特殊情况
    log_info "🔍 测试特殊情况和边界条件"
    
    # 不存在的命名空间
    make_request "GET" "/workloads/non-existent-namespace/test-deployment/scheduling" "" "404 401 403 500" "不存在的命名空间"
    
    # 不存在的工作负载
    make_request "GET" "/workloads/default/non-existent-deployment/scheduling" "" "404 401 403 500" "不存在的工作负载"
    
    # 无效的 kind
    make_request "GET" "/workloads/default/test-deployment/scheduling?kind=InvalidKind" "" "400 404 401 403 500" "无效的工作负载类型"
    
    # 空的工作负载名称（这会导致路由不匹配）
    make_request "GET" "/workloads/default//scheduling" "" "404 401 403" "空的工作负载名称"
    
    # 特殊字符在名称中
    make_request "GET" "/workloads/default/test-deployment-with-special-chars/scheduling" "" "200 404 401 403 500" "包含特殊字符的工作负载名称"
}

# 调度概览接口测试
test_scheduling_overview_apis() {
    log_header "📊 开始调度概览接口测试..."
    
    # 测试基础概览接口
    make_request "GET" "/scheduling/overview" "" "200 401 403 500" "获取调度概览信息"
    
    # 测试带命名空间过滤的概览接口
    local namespaces=("default" "kube-system" "test-namespace" "")
    
    for namespace in "${namespaces[@]}"; do
        if [[ -n "$namespace" ]]; then
            log_info "🔍 测试命名空间过滤: $namespace"
            make_request "GET" "/scheduling/overview?namespace=$namespace" "" "200 401 403 404 500" "获取${namespace}命名空间调度概览"
        else
            log_info "🔍 测试空命名空间过滤"
            make_request "GET" "/scheduling/overview?namespace=" "" "200 401 403 500" "获取空命名空间过滤调度概览"
        fi
    done
    
    # 测试不存在的命名空间
    make_request "GET" "/scheduling/overview?namespace=non-existent-namespace" "" "200 404 401 403 500" "不存在的命名空间概览"
}

# 命名空间工作负载调度接口测试
test_namespace_workloads_scheduling_apis() {
    log_header "📁 开始命名空间工作负载调度接口测试..."
    
    local namespaces=("default" "kube-system" "test-namespace")
    
    for namespace in "${namespaces[@]}"; do
        log_info "🔍 测试命名空间: $namespace"
        
        # 基础测试
        make_request "GET" "/scheduling/namespace/$namespace/workloads" "" "200 401 403 404 500" "获取${namespace}命名空间工作负载调度信息"
        
        # 测试分页参数
        make_request "GET" "/scheduling/namespace/$namespace/workloads?page=1&pageSize=10" "" "200 401 403 404 500" "分页获取${namespace}命名空间工作负载(第1页,10条)"
        make_request "GET" "/scheduling/namespace/$namespace/workloads?page=2&pageSize=20" "" "200 401 403 404 500" "分页获取${namespace}命名空间工作负载(第2页,20条)"
        
        # 测试 kind 过滤
        local kinds=("Deployment" "StatefulSet" "DaemonSet" "Job" "CronJob")
        for kind in "${kinds[@]}"; do
            make_request "GET" "/scheduling/namespace/$namespace/workloads?kind=$kind" "" "200 401 403 404 500" "获取${namespace}命名空间${kind}调度信息"
        done
        
        # 测试组合参数
        make_request "GET" "/scheduling/namespace/$namespace/workloads?page=1&pageSize=5&kind=Deployment" "" "200 401 403 404 500" "组合参数获取${namespace}命名空间Deployment调度信息"
    done
    
    # 测试边界条件
    log_info "🔍 测试边界条件"
    
    # 不存在的命名空间
    make_request "GET" "/scheduling/namespace/non-existent-namespace/workloads" "" "404 401 403 500" "不存在的命名空间工作负载调度"
    
    # 无效的分页参数
    make_request "GET" "/scheduling/namespace/default/workloads?page=0&pageSize=0" "" "200 400 401 403 500" "无效的分页参数(page=0,pageSize=0)"
    make_request "GET" "/scheduling/namespace/default/workloads?page=-1&pageSize=-5" "" "200 400 401 403 500" "负数分页参数"
    make_request "GET" "/scheduling/namespace/default/workloads?page=abc&pageSize=xyz" "" "200 400 401 403 500" "非数字分页参数"
    
    # 无效的 kind
    make_request "GET" "/scheduling/namespace/default/workloads?kind=InvalidKind" "" "200 400 401 403 500" "无效的工作负载类型过滤"
    
    # 大分页参数
    make_request "GET" "/scheduling/namespace/default/workloads?page=1000&pageSize=1000" "" "200 401 403 500" "大分页参数测试"
}

# 加载测试数据文件
load_test_data() {
    if [[ -n "$TEST_DATA_FILE" ]] && [[ -f "$TEST_DATA_FILE" ]]; then
        log_info "📂 从文件加载测试数据: $TEST_DATA_FILE"
        source "$TEST_DATA_FILE"
        log_success "✅ 测试数据加载成功"
    else
        log_debug "使用默认测试数据"
    fi
}

# 压力测试（可选）
test_scheduling_stress_test() {
    if [[ "$STRESS_TEST" != "true" ]]; then
        log_info "💡 跳过压力测试 (设置 STRESS_TEST=true 启用)"
        return 0
    fi
    
    log_header "⚡ 开始调度接口压力测试..."
    
    log_info "🔥 并发请求测试 (并发数: $CONCURRENCY)"
    
    # 并发请求基础调度信息
    local pids=()
    for ((i=1; i<=CONCURRENCY; i++)); do
        {
            make_request "GET" "/workloads/default/test-deployment/scheduling" "" "200 401 403 404 500" "并发测试-基础调度信息-$i"
        } &
        pids+=($!)
    done
    
    # 等待所有并发请求完成
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    log_info "🔥 快速连续请求测试"
    
    # 快速连续请求
    for i in {1..20}; do
        make_request "GET" "/scheduling/overview" "" "200 401 403 500" "连续请求-调度概览-$i"
    done
    
    log_info "🔥 大数据量请求测试"
    
    # 测试大分页请求
    make_request "GET" "/scheduling/namespace/default/workloads?pageSize=1000" "" "200 401 403 500" "大分页请求测试"
}

# 显示帮助信息
show_help() {
    cat << EOF
Karmada Dashboard 调度接口测试脚本

专门测试 cmd/api/app/routes/scheduling/handler.go 中定义的调度相关 API 接口

用法: $0 [选项]

基础选项:
    --url URL                API 基础 URL (默认: http://localhost:8000)
    --token TOKEN            认证 token
    --verbose               详细输出模式
    --help                  显示此帮助信息

测试控制选项:
    --suite SUITE           测试套件 (all/health/workload/overview/namespace/stress)
    --skip-health           跳过健康检查
    --stress                启用压力测试
    --fail-fast             遇到失败立即停止
    --concurrency NUM       压力测试并发数 (默认: 5)

网络选项:
    --timeout SECONDS       请求超时时间 (默认: 30秒)
    --retries NUM           最大重试次数 (默认: 3)
    --retry-delay SECONDS   重试间隔 (默认: 2秒)
    --proxy URL             HTTP代理设置
    --headers HEADERS       自定义请求头 (格式: "Header1:Value1,Header2:Value2")

输出选项:
    --log-level LEVEL       日志级别 (DEBUG/INFO/WARN/ERROR, 默认: INFO)
    --output FORMAT         输出格式 (console/json/junit, 默认: console)
    --output-file FILE      结果输出文件路径
    --save-responses        保存所有响应到文件
    --test-data FILE        测试数据文件路径

环境变量:
    API_BASE_URL            API 基础 URL
    TOKEN                   认证 token
    VERBOSE                 详细输出模式 (true/false)
    TIMEOUT                 请求超时时间(秒)
    MAX_RETRIES             失败请求最大重试次数
    RETRY_DELAY             重试间隔(秒)
    CONCURRENCY             压力测试并发数
    OUTPUT_FORMAT           输出格式 (console/json/junit)
    LOG_LEVEL              日志级别 (DEBUG/INFO/WARN/ERROR)
    TEST_SUITE             测试套件
    SKIP_HEALTH_CHECK      跳过健康检查 (true/false)
    SAVE_RESPONSES         保存响应到文件 (true/false)
    OUTPUT_FILE            测试结果输出文件
    PROXY                  HTTP代理设置
    CUSTOM_HEADERS         自定义请求头
    TEST_DATA_FILE         测试数据文件路径
    FAIL_FAST              遇到失败立即停止 (true/false)
    STRESS_TEST            启用压力测试 (true/false)

测试的接口:
    GET /api/v1/workloads/:namespace/:name/scheduling
    GET /api/v1/workloads/:namespace/:name/precise-scheduling
    GET /api/v1/scheduling/overview
    GET /api/v1/scheduling/namespace/:namespace/workloads

示例:
    # 基础使用
    $0 --url http://localhost:8000 --verbose
    
    # 带认证和输出文件
    $0 --token your-jwt-token --output json --output-file results.json
    
    # 仅运行健康检查
    $0 --suite health --log-level WARN
    
    # 压力测试
    $0 --stress --concurrency 10 --timeout 60
    
    # 使用代理和自定义头
    $0 --proxy http://proxy:8080 --headers "X-Custom:value,X-Test:123"
    
    # 快速失败模式
    $0 --fail-fast --retries 1
    
    # 使用环境变量
    API_BASE_URL=http://localhost:8000 TOKEN=your-token VERBOSE=true $0

测试数据文件格式 (可选):
    # test_data.sh
    # 可以覆盖默认的测试数据
    namespaces=("custom-ns1" "custom-ns2")
    workload_names=("custom-app1" "custom-app2")
    workload_kinds=("Deployment" "StatefulSet")

EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        # 基础选项
        --url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --token)
            TOKEN="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        
        # 测试控制选项
        --suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        --skip-health)
            SKIP_HEALTH_CHECK="true"
            shift
            ;;
        --stress)
            STRESS_TEST="true"
            shift
            ;;
        --fail-fast)
            FAIL_FAST="true"
            shift
            ;;
        --concurrency)
            CONCURRENCY="$2"
            shift 2
            ;;
        
        # 网络选项
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --retry-delay)
            RETRY_DELAY="$2"
            shift 2
            ;;
        --proxy)
            PROXY="$2"
            shift 2
            ;;
        --headers)
            CUSTOM_HEADERS="$2"
            shift 2
            ;;
        
        # 输出选项
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --output-file)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --save-responses)
            SAVE_RESPONSES="true"
            shift
            ;;
        --test-data)
            TEST_DATA_FILE="$2"
            shift 2
            ;;
        
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看可用选项"
            exit 1
            ;;
    esac
done

# 验证参数
validate_parameters() {
    # 验证测试套件
    case "$TEST_SUITE" in
        "all"|"health"|"workload"|"overview"|"namespace"|"stress")
            ;;
        *)
            log_error "❌ 无效的测试套件: $TEST_SUITE"
            log_error "   支持的套件: all, health, workload, overview, namespace, stress"
            exit 1
            ;;
    esac
    
    # 验证输出格式
    case "$OUTPUT_FORMAT" in
        "console"|"json"|"junit")
            ;;
        *)
            log_error "❌ 无效的输出格式: $OUTPUT_FORMAT"
            log_error "   支持的格式: console, json, junit"
            exit 1
            ;;
    esac
    
    # 验证日志级别
    case "$LOG_LEVEL" in
        "DEBUG"|"INFO"|"WARN"|"ERROR")
            ;;
        *)
            log_error "❌ 无效的日志级别: $LOG_LEVEL"
            log_error "   支持的级别: DEBUG, INFO, WARN, ERROR"
            exit 1
            ;;
    esac
    
    # 验证数值参数
    if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT" -le 0 ]]; then
        log_error "❌ 超时时间必须是正整数: $TIMEOUT"
        exit 1
    fi
    
    if ! [[ "$MAX_RETRIES" =~ ^[0-9]+$ ]] || [[ "$MAX_RETRIES" -lt 0 ]]; then
        log_error "❌ 重试次数必须是非负整数: $MAX_RETRIES"
        exit 1
    fi
    
    if ! [[ "$RETRY_DELAY" =~ ^[0-9]+$ ]] || [[ "$RETRY_DELAY" -lt 0 ]]; then
        log_error "❌ 重试间隔必须是非负整数: $RETRY_DELAY"
        exit 1
    fi
    
    if ! [[ "$CONCURRENCY" =~ ^[0-9]+$ ]] || [[ "$CONCURRENCY" -le 0 ]]; then
        log_error "❌ 并发数必须是正整数: $CONCURRENCY"
        exit 1
    fi
    
    # 验证测试数据文件
    if [[ -n "$TEST_DATA_FILE" ]] && [[ ! -f "$TEST_DATA_FILE" ]]; then
        log_error "❌ 测试数据文件不存在: $TEST_DATA_FILE"
        exit 1
    fi
}

# 执行参数验证
validate_parameters

# 主测试函数
run_all_tests() {
    local start_time=$(date +%s)
    
    # 加载测试数据
    load_test_data
    
    log_info "🎯 开始运行 Karmada Dashboard 调度接口测试..."
    log_info "🌐 API 基础 URL: $API_BASE_URL"
    log_info "📋 测试套件: $TEST_SUITE"
    log_info "📊 输出格式: $OUTPUT_FORMAT"
    log_info "📝 日志级别: $LOG_LEVEL"
    
    if [[ -n "$TOKEN" ]]; then
        log_info "🔐 使用认证 Token: ${TOKEN:0:20}..."
    else
        log_warning "⚠️  未提供认证 Token，某些接口可能返回 401/403"
    fi
    
    if [[ "$VERBOSE" == "true" ]] || [[ "$LOG_LEVEL" == "DEBUG" ]]; then
        log_info "🔍 详细模式已启用"
    fi
    
    if [[ "$STRESS_TEST" == "true" ]]; then
        log_info "⚡ 压力测试已启用 (并发数: $CONCURRENCY)"
    fi
    
    if [[ "$FAIL_FAST" == "true" ]]; then
        log_info "💥 快速失败模式已启用"
    fi
    
    if [[ -n "$PROXY" ]]; then
        log_info "🌐 使用代理: $PROXY"
    fi
    
    if [[ "$SAVE_RESPONSES" == "true" ]]; then
        log_info "💾 响应将保存到: $RESPONSE_DIR"
        mkdir -p "$RESPONSE_DIR"
    fi
    
    echo "===================================================="
    
    # 执行测试，使用 trap 捕获中断信号
    trap 'cleanup_and_exit 130' INT TERM
    
    # 根据测试套件选择性执行测试
    case "$TEST_SUITE" in
        "all")
            test_health_check || true
            test_workload_scheduling_apis || true
            test_scheduling_overview_apis || true
            test_namespace_workloads_scheduling_apis || true
            test_scheduling_stress_test || true
            ;;
        "health")
            test_health_check || true
            ;;
        "workload")
            test_workload_scheduling_apis || true
            ;;
        "overview")
            test_scheduling_overview_apis || true
            ;;
        "namespace")
            test_namespace_workloads_scheduling_apis || true
            ;;
        "stress")
            test_scheduling_stress_test || true
            ;;
    esac
    
    echo "===================================================="
    
    # 计算耗时
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 输出测试结果汇总
    should_log "INFO" && log_info "📊 调度接口测试结果汇总:"
    echo "  📈 总测试数: $TOTAL_TESTS"
    echo "  ✅ 通过数: $PASSED_TESTS"
    echo "  ❌ 失败数: $FAILED_TESTS"
    echo "  ⏭️  跳过数: $SKIPPED_TESTS"
    echo "  ⏱️  测试耗时: ${duration} 秒"
    
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo "  📊 成功率: ${success_rate}%"
        
        if [[ $success_rate -eq 100 ]]; then
            log_success "🎉 所有调度接口测试通过！"
        elif [[ $success_rate -ge 80 ]]; then
            log_warning "⚠️  大部分调度接口测试通过，少数失败"
        else
            log_error "❌ 多个调度接口测试失败，需要检查服务状态"
        fi
    fi
    
    echo "===================================================="
    
    # 输出测试结果
    output_test_results
    
    # 清理临时文件
    rm -f /tmp/scheduling_api_response*.json /tmp/scheduling_curl_error.log
    
    # 根据测试结果设置退出码
    if [[ $FAILED_TESTS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v bc &> /dev/null; then
        log_warning "⚠️  bc 未安装，时间计算可能不准确"
        log_info "💡 安装 bc 获得精确的响应时间: sudo yum install bc 或 sudo apt install bc"
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "⚠️  jq 未安装，JSON 响应将以原始格式显示"
        log_info "💡 安装 jq 可获得更好的 JSON 格式化显示: sudo yum install jq 或 sudo apt install jq"
        
        # 如果选择了JSON输出格式但没有jq，给出警告
        if [[ "$OUTPUT_FORMAT" == "json" ]]; then
            log_warning "⚠️  JSON 输出格式需要 jq 工具，建议安装后重新运行"
        fi
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "❌ 缺少必要的依赖: ${missing_deps[*]}"
        echo "请安装这些工具后再运行测试"
        exit 1
    fi
}

# 主程序入口
main() {
    # 检查依赖
    check_dependencies
    
    # 显示启动信息
    echo "=================================================="
    echo "📋 Karmada Dashboard 调度接口测试脚本"
    echo "📅 启动时间: $(date)"
    echo "🖥️  运行环境: $(uname -s) $(uname -r)"
    echo "🎯 测试目标: 调度相关 API 接口"
    echo "=================================================="
    
    # 运行测试
    run_all_tests
}

# 如果脚本被直接执行，则运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 
#!/bin/bash

# Karmada 集群调度 API 测试脚本
# 测试所有调度相关的API接口

API_BASE="http://127.0.0.1:8000/api/v1"

echo "🚀 开始测试 Karmada 集群调度 API"
echo "================================="

# 测试函数
test_api() {
    local name="$1"
    local url="$2"
    local description="$3"
    
    echo
    echo "📡 测试: $name"
    echo "描述: $description"
    echo "URL: $url"
    echo "-----------------------------------"
    
    response=$(curl -s "$url")
    
    # 检查是否是有效的JSON
    if echo "$response" | jq . > /dev/null 2>&1; then
        code=$(echo "$response" | jq -r '.code // "unknown"')
        message=$(echo "$response" | jq -r '.message // "unknown"')
        
        if [ "$code" = "200" ]; then
            echo "✅ 状态: 成功 (code: $code, message: $message)"
            
            # 显示关键数据统计
            case "$name" in
                "调度概览")
                    total_workloads=$(echo "$response" | jq -r '.data.totalWorkloads // 0')
                    scheduled_workloads=$(echo "$response" | jq -r '.data.scheduledWorkloads // 0')
                    echo "   📊 总工作负载: $total_workloads, 已调度: $scheduled_workloads"
                    ;;
                "命名空间工作负载列表")
                    total=$(echo "$response" | jq -r '.data.pagination.total // 0')
                    workload_count=$(echo "$response" | jq '.data.data | length')
                    echo "   📊 工作负载总数: $total, 当前页: $workload_count"
                    if [ "$workload_count" -gt 0 ]; then
                        echo "   工作负载列表:"
                        echo "$response" | jq -r '.data.data[] | "   - \(.workloadInfo.name) (\(.workloadInfo.kind)) - \(.schedulingStatus.phase)"'
                    fi
                    ;;
                "基础调度信息" | "精确调度信息")
                    workload_name=$(echo "$response" | jq -r '.data.workloadInfo.name // "unknown"')
                    total_replicas=$(echo "$response" | jq -r '.data.totalReplicas // 0')
                    ready_replicas=$(echo "$response" | jq -r '.data.readyReplicas // 0')
                    phase=$(echo "$response" | jq -r '.data.schedulingStatus.phase // "unknown"')
                    echo "   📊 工作负载: $workload_name, 副本: $ready_replicas/$total_replicas, 状态: $phase"
                    
                    if [ "$name" = "精确调度信息" ]; then
                        cluster_count=$(echo "$response" | jq '.data.clusterPlacements | length')
                        echo "   🏗️  分布在 $cluster_count 个集群:"
                        echo "$response" | jq -r '.data.clusterPlacements[] | "   - 集群: \(.clusterName), 副本: \(.actualReplicas)/\(.plannedReplicas)"'
                        
                        total_nodes=$(echo "$response" | jq '[.data.clusterPlacements[].nodePlacements | length] | add')
                        total_pods=$(echo "$response" | jq '[.data.clusterPlacements[].nodePlacements[].podCount] | add')
                        echo "   🖥️  分布在 $total_nodes 个节点上，总计 $total_pods 个Pod"
                    fi
                    ;;
            esac
        else
            echo "❌ 状态: 失败 (code: $code, message: $message)"
        fi
    else
        echo "❌ 状态: 响应格式错误"
        echo "响应内容: $response"
    fi
}

# 1. 测试调度概览
test_api "调度概览" \
    "$API_BASE/scheduling/overview" \
    "获取整体调度统计信息"

# 2. 测试命名空间工作负载列表
test_api "命名空间工作负载列表" \
    "$API_BASE/scheduling/namespace/test/workloads" \
    "获取test命名空间的工作负载列表"

# 3. 测试过滤Deployment工作负载
test_api "过滤Deployment工作负载" \
    "$API_BASE/scheduling/namespace/test/workloads?kind=Deployment" \
    "获取test命名空间的Deployment类型工作负载"

# 4. 测试nginx-1基础调度信息
test_api "基础调度信息" \
    "$API_BASE/workloads/test/nginx-1/scheduling?kind=Deployment" \
    "获取nginx-1 Deployment的基础调度信息"

# 5. 测试nginx-1精确调度信息
test_api "精确调度信息" \
    "$API_BASE/workloads/test/nginx-1/precise-scheduling?kind=Deployment" \
    "获取nginx-1 Deployment的精确调度信息（包含节点级Pod分布）"

# 6. 测试nginx-2精确调度信息
test_api "nginx-2精确调度信息" \
    "$API_BASE/workloads/test/nginx-2/precise-scheduling?kind=Deployment" \
    "获取nginx-2 Deployment的精确调度信息"

# 7. 测试不存在的工作负载
test_api "不存在的工作负载" \
    "$API_BASE/workloads/test/non-existent/scheduling?kind=Deployment" \
    "测试不存在工作负载的错误处理"

echo
echo "🎉 API测试完成！"
echo "================================="
echo
echo "📝 测试总结:"
echo "- 如果所有API都返回200状态码，说明后端服务正常"
echo "- 精确调度信息API应该显示详细的节点和Pod分布"
echo "- 可以通过返回的数据验证Karmada调度功能是否正常工作"
echo
echo "🔗 相关文档: agent/backend/API/cluster-scheduling-api.md" 
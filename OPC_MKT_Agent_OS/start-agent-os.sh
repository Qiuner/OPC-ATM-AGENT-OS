#!/bin/bash
# Marketing Agent OS — 一键启动脚本
# 启动 CreatorFlow (端口3000) + Agent Chat UI (端口3001)

set -e

CREATORFLOW_DIR="/Users/jaydenworkplace/Desktop/Agent-team-project/AI自媒体工具/自媒体工具/creatorflow"
AGENT_CHAT_DIR="/Users/jaydenworkplace/Desktop/OPC_MKT_Agent_OS/agent-chat"

echo "🚀 Marketing Agent OS 启动中..."
echo ""

# 1. 启动 CreatorFlow (localhost:3000)
echo "📱 启动 CreatorFlow 自媒体工具 (port 3000)..."
cd "$CREATORFLOW_DIR"
PORT=3000 npx next dev --port 3000 &
CF_PID=$!
echo "   PID: $CF_PID"

# 2. 启动 Agent Chat UI (localhost:3001)
echo "💬 启动 Agent Chat UI (port 3001)..."
cd "$AGENT_CHAT_DIR"
PORT=3001 npx next dev --port 3001 &
AC_PID=$!
echo "   PID: $AC_PID"

echo ""
echo "✅ Agent OS 已启动！"
echo ""
echo "   CreatorFlow:  http://localhost:3000  (自媒体工具)"
echo "   Agent Chat:   http://localhost:3001  (AI Agent 聊天)"
echo ""
echo "   使用方式："
echo "   1. 打开 http://localhost:3001"
echo "   2. 在聊天框输入 @CEO 或 @XHS 开始对话"
echo "   3. CEO Agent 会自动调用 CreatorFlow API 生成内容"
echo ""
echo "   按 Ctrl+C 停止所有服务"

# 等待子进程
wait

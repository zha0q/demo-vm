#!/bin/bash

set -e

echo "=== 麻将清台游戏 - 构建脚本 ==="
echo ""

# 检查是否安装了 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm，请先安装 npm"
    exit 1
fi

echo "✓ Node.js 版本: $(node -v)"
echo "✓ npm 版本: $(npm -v)"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install

echo ""

# 构建项目
echo "🔨 构建项目..."
npm run build

echo ""
echo "✅ 构建完成！"
echo "📍 产物位置: ./dist"
echo ""

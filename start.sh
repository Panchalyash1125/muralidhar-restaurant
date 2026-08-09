#!/bin/bash

# ============================================
# MURALIDHAR RESTAURANT - QUICK START SCRIPT
# For Mac/Linux
# ============================================

echo "🍽️  Muralidhar Restaurant System"
echo "====================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm: $NPM_VERSION"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check if database exists
if [ ! -f "backend/database/restaurant.db" ]; then
    echo ""
    echo "🗄️  Setting up database..."
    npm run setup
    if [ $? -ne 0 ]; then
        echo "❌ Failed to setup database"
        exit 1
    fi
    echo "✅ Database ready"
else
    echo "✅ Database already exists"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Creating environment file..."
    cp .env.example .env
    echo "✅ .env created (edit this file to change settings)"
fi

echo ""
echo "🚀 Starting server..."
echo "====================================="
echo ""

# Start the server
npm start

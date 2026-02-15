#!/bin/bash

echo "🚀 Starting Eligio AI Backend Setup..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Setup environment file
if [ ! -f ".env" ]; then
    echo "Setting up environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your OPENAI_API_KEY"
fi

# Start the server
echo "Starting backend server..."
python run.py

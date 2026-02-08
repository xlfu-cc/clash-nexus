#!/bin/bash

# Definition of colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Clash Nexus Deployment Script ===${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose first."
    exit 1
fi

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found.${NC}"
    if [ -f .env.example ]; then
        echo -e "${BLUE}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env file with your configuration.${NC}"
    else
        echo -e "${RED}Error: .env.example not found. Cannot create .env.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Building and starting containers...${NC}"

# Use docker compose or docker-compose depending on availability
if docker compose version &> /dev/null; then
    CMD="docker compose"
else
    CMD="docker-compose"
fi

$CMD down
$CMD pull
$CMD up -d --build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== Deployment Successful! ===${NC}"
    echo -e "Access the application at: ${BLUE}http://localhost:3000${NC}"
    echo -e "To view logs, run: ${YELLOW}$CMD logs -f${NC}"
else
    echo -e "${RED}=== Deployment Failed ===${NC}"
    exit 1
fi

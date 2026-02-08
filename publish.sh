#!/bin/bash

# Definition of colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
DEFAULT_REGISTRY="ghcr.io"
DEFAULT_IMAGE_NAME="clash-nexus"
DEFAULT_TAG="latest"

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -r, --registry <url>    Docker registry (default: $DEFAULT_REGISTRY)"
    echo "  -n, --name <name>       Image name (default: $DEFAULT_IMAGE_NAME)"
    echo "  -t, --tag <tag>         Image tag (default: $DEFAULT_TAG)"
    echo "  -u, --username <user>   Registry username (for login)"
    echo "  -p, --password <pass>   Registry password (for login)"
    echo "  -h, --help              Display this help message"
    exit 1
}

# Parse arguments
REGISTRY=$DEFAULT_REGISTRY
IMAGE_NAME=$DEFAULT_IMAGE_NAME
TAG=$DEFAULT_TAG
USERNAME=""
PASSWORD=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -r|--registry) REGISTRY="$2"; shift ;;
        -n|--name) IMAGE_NAME="$2"; shift ;;
        -t|--tag) TAG="$2"; shift ;;
        -u|--username) USERNAME="$2"; shift ;;
        -p|--password) PASSWORD="$2"; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown parameter passed: $1"; usage ;;
    esac
    shift
done

FULL_IMAGE="${REGISTRY}/${USERNAME}/${IMAGE_NAME}:${TAG}"
# If username is empty, we might be pushing to docker hub root or private registry without user namespace
if [ -z "$USERNAME" ]; then
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"
    # If registry is docker.io (implied), format might be slightly different, but let's stick to standard
    # simple case: just image:tag if no registry specified? No, let's keep it explicit.
fi

# Clean up double slashes if any (except protocol)
FULL_IMAGE=$(echo "$FULL_IMAGE" | sed 's~//~/_~g' | sed 's~/_~/~g') 
# Actually strictly speaking, typical format is registry/namespace/image:tag
# Let's adjust logic:
# If user provides username, we assume registry/username/image:tag
# If not, we assume user provided full image name or it's registry/image:tag

if [ -n "$USERNAME" ]; then
    FULL_IMAGE="${REGISTRY}/${USERNAME}/${IMAGE_NAME}:${TAG}"
else
    # If no username, maybe it's included in image name or not needed
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"
fi


echo -e "${BLUE}=== Clash Nexus Publish Script ===${NC}"
echo -e "Target Image: ${YELLOW}${FULL_IMAGE}${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    exit 1
fi

# Login if credentials provided
if [ -n "$USERNAME" ] && [ -n "$PASSWORD" ]; then
    echo -e "${BLUE}Logging in to ${REGISTRY}...${NC}"
    echo "$PASSWORD" | docker login "$REGISTRY" -u "$USERNAME" --password-stdin
    if [ $? -ne 0 ]; then
        echo -e "${RED}Login failed.${NC}"
        exit 1
    fi
fi

# Build
echo -e "${BLUE}Building image...${NC}"
docker build -t "$FULL_IMAGE" .

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed.${NC}"
    exit 1
fi

# Push
echo -e "${BLUE}Pushing image...${NC}"
docker push "$FULL_IMAGE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== Publish Successful! ===${NC}"
    echo -e "Image pushed to: ${BLUE}${FULL_IMAGE}${NC}"
else
    echo -e "${RED}Push failed.${NC}"
    exit 1
fi

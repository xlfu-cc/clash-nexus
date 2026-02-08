# Deploying Clash Nexus with Docker

This guide explains how to deploy `clash-nexus` using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system.
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop/Plugin).

## Quick Start

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd clash-nexus
    ```

2.  **Configuration (Optional):**

    Copy the example environment file if you need to customize settings:

    ```bash
    cp .env.example .env
    ```

    You can edit `.env` to change the port or data directory if needed. Authentication is now handled via web UI login.

3.  **Run the deployment script:**

    ```bash
    ./deploy.sh
    ```

    This script acts as a wrapper around `docker-compose` to build and start the application.

4.  **Access the application:**

    Open your browser and navigate to `http://localhost:3000`.

    - **Default Username:** `admin`
    - **Default Password:** `changeit`

    > [!IMPORTANT]
    > Please go to "系统设置" (System Settings) to change your password and username immediately after first login.



## Manual Deployment

If you prefer to run commands manually:

1.  **Build and start:**

    ```bash
    docker-compose up -d --build
    ```

2.  **View logs:**

    ```bash
    docker-compose logs -f
    ```

3.  **Stop the application:**

    ```bash
    docker-compose down
    ```

## Publishing to Docker Registry

You can push the Docker image to a registry (like Docker Hub or GitHub Container Registry) using the `publish.sh` script.

### Usage

```bash
./publish.sh [options]
```

### Options

- `-r, --registry <url>`: Docker registry URL (default: `ghcr.io`)
- `-n, --name <name>`: Image name (default: `clash-nexus`)
- `-t, --tag <tag>`: Image tag (default: `latest`)
- `-u, --username <user>`: Registry username (for login)
- `-p, --password <pass>`: Registry password (for login)

### Examples

**Push to Docker Hub:**

```bash
./publish.sh -r docker.io -u your-username -n clash-nexus -t 1.0.0
```

**Push to GitHub Container Registry:**

```bash
./publish.sh -r ghcr.io -u your-github-username -p your-token
```

```

## GitHub Actions CI/CD

This repository includes a GitHub Actions workflow (`.github/workflows/docker-publish.yml`) that automatically builds and pushes the Docker image to the GitHub Container Registry (GHCR).

### Triggers

-   **Push to `main` branch:** Builds and pushes with the `latest` tag.
-   **Release created:** Builds and pushes with the release tag (e.g., `v1.0.0`).
-   **Pull Request:** Builds the image to ensure it works, but does **not** push it.

### Setup

1.  **Repository Visibility:** Ensure your repository is active.
2.  **Permissions:** Go to `Settings` -> `Actions` -> `General` and ensure `Workflow permissions` is set to "Read and write permissions" (or at least specifically grant `packages: write` if using fine-grained permissions, though the workflow file requests this automatically).
3.  **Container Registry:** The image will be published to `ghcr.io/<your-username>/clash-nexus`. You can verify this in the "Packages" section of your profile or organization.


All application data (subscriptions, profiles) is stored in the `data/` directory in the project root. This directory is mounted into the container, so your data persists even if the container is removed.

## Troubleshooting

-   **Port Conflicts:** If port 3000 is already in use, edit `docker-compose.yml` and change the port mapping (e.g., `"8080:3000"`).
-   **Permission Issues:** Ensure the scripts are executable (`chmod +x deploy.sh publish.sh`).

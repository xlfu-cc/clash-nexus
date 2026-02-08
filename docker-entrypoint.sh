#!/bin/sh

# If command starts with an option, prepend node
if [ "${1#-}" != "$1" ]; then
	set -- node "$@"
fi

# Fix permissions for data directory if it exists
if [ -d "/app/data" ]; then
    echo "Fixing permissions for /app/data..."
    chown -R node:node /app/data
fi

# If running as root, switch to node user
if [ "$(id -u)" = "0" ]; then
    # explicit check for 'node' command to use su-exec
    if [ "$1" = "node" ] || [ "$1" = "npm" ]; then
        exec su-exec node "$@"
    fi
fi

exec "$@"

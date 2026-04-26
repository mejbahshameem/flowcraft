#!/bin/sh
set -eu

# Strip any trailing slash from BACKEND_URL so /api/* proxies cleanly.
export BACKEND_URL="${BACKEND_URL%/}"
export PORT="${PORT:-8080}"

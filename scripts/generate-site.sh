#!/bin/bash
# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
set -e -x -v -u -o pipefail

################################################################################
SCRIPT_DIR=$(realpath "$(dirname "${BASH_SOURCE[0]}")")
source "${SCRIPT_DIR}/utilities/common.sh"
################################################################################
PYTHON_VERSION_PATH=${PWD}/scripts/.python-version \
  VENV_PATH=${PWD}/.cache/scripts/.venv \
  source "${PROJ_PATH}/scripts/utilities/ensure-venv.sh"
PYTHON_VERSION_PATH=${PWD}/scripts/.python-version \
  TOML=${PROJ_PATH}/scripts/pyproject.toml EXTRA=dev \
  DEV_VENV_PATH="${PWD}/.cache/scripts/.venv" \
  TARGET_VENV_PATH="${PWD}/.cache/scripts/.venv" \
  bash "${PROJ_PATH}/scripts/utilities/ensure-reqs.sh"
################################################################################

TMPDIR=$(mktemp -d)

SERVER_PID=

cleanup() {
  if [ -n "${SERVER_PID}" ]; then
    kill "${SERVER_PID}" 2> /dev/null || true
  fi
  sleep 0.5
  if [ -n "${SERVER_PID}" ]; then
    kill -9 "${SERVER_PID}" 2> /dev/null || true
  fi
  if [ -d "${TMPDIR}" ]; then
    rm -rf "${TMPDIR}" 2> /dev/null || true
  fi
}
trap cleanup EXIT


# FPS=5
# ffmpeg -y -i .github/export-demo.webm -c:v libsvtav1 -pix_fmt yuv420p -crf 20 -tune 0 -r 5 -vf scale=512:512 .github/export-demo-mini.webm
# ffmpeg -y -i .github/graph-demo.webm -c:v libsvtav1 -pix_fmt yuv420p -crf 20 -tune 0 -r 5 -vf scale=512:512 .github/graph-demo-mini.webm

ffmpeg -i .github/graph-demo.webm \
  -vf "fps=10,scale=512:-1:flags=lanczos,palettegen" \
  "${TMPDIR}/palette.png"
ffmpeg -i .github/graph-demo.webm -i "${TMPDIR}/palette.png" \
  -filter_complex "fps=10,scale=512:-1:flags=lanczos[x];[x][1:v]paletteuse" \
  "${TMPDIR}/graph-demo.gif"
gifsicle -O3 "${TMPDIR}/graph-demo.gif" -o .github/graph-demo.gif

npm run build

PORT=$(python3 -c 'import socket; s = socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')

cd "dist" && python3 -m http.server ${PORT} & SERVER_PID=$!


# Wait for the server to start.
while ! curl -s http://localhost:${PORT} > /dev/null; do
  echo -e "${BLUE}Waiting for server to start...${NC}"
  sleep 1
done


monolith \
  --no-metadata \
  -B -d "maxst.icons8.com" \
  -o dist/chatgpt2graph/index.html \
  http://localhost:${PORT}/chatgpt2graph/modular.html

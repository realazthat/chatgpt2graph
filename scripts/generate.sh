#!/bin/bash
# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
set -e -x -v -u -o pipefail

################################################################################
SCRIPT_DIR=$(realpath "$(dirname "${BASH_SOURCE[0]}")")
source "${SCRIPT_DIR}/utilities/common.sh"

PYTHON_VERSION_PATH=${PWD}/scripts/.python-version \
  VENV_PATH=${PWD}/.cache/scripts/.venv \
  source "${PROJ_PATH}/scripts/utilities/ensure-venv.sh"
PYTHON_VERSION_PATH=${PWD}/scripts/.python-version \
  TOML=${PROJ_PATH}/scripts/pyproject.toml EXTRA=dev \
  DEV_VENV_PATH="${PWD}/.cache/scripts/.venv" \
  TARGET_VENV_PATH="${PWD}/.cache/scripts/.venv" \
  bash "${PROJ_PATH}/scripts/utilities/ensure-reqs.sh"
################################################################################
bash scripts/generate-install-reqs.sh

npm install
npm run genversion
npm run format
bash scripts/generate-site.sh
bash scripts/generate-examples.sh
bash scripts/run-all-examples.sh
bash scripts/generate-readme.sh
################################################################################

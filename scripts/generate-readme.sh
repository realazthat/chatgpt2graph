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
NODE_VERSION_PATH=${PWD}/.nvmrc \
  bash "${PROJ_PATH}/scripts/utilities/ensure-node-version.sh"
################################################################################


bash scripts/format.sh

(


python -m snipinator.cli \
  -t "${PROJ_PATH}/.github/README.md.jinja2" \
  -o "${PROJ_PATH}/README.md" \
  --rm --force --create --chmod-ro --skip-unchanged
)
################################################################################
LAST_VERSION=$(node -p "require('./package.json').version")
python -m mdremotifier.cli \
  -i "${PROJ_PATH}/README.md" \
  --url-prefix "https://github.com/realazthat/chatgpt2graph/blob/v${LAST_VERSION}/" \
  --img-url-prefix "https://raw.githubusercontent.com/realazthat/chatgpt2graph/v${LAST_VERSION}/" \
  -o "${PROJ_PATH}/.github/README.remotified.md"

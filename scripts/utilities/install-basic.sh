#!/bin/bash
# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
set -e -x -v -u -o pipefail

RED='\033[0;31m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

################################################################################
sudo apt update
sudo apt install -y bash findutils grep xxd git xxhash rsync expect jq unzip \
  curl wget git-core gcc make zlib1g-dev libbz2-dev libreadline-dev \
  libsqlite3-dev libssl-dev libffi-dev liblzma-dev tk-dev libpq-dev
################################################################################
# Install Go, globally.

GO_VERSION=$(go version 2>/dev/null | awk '{print $3}' | cut -c 3- || true)
if [[ "$GO_VERSION" != "1.22.4" ]]; then
  echo -e "${BLUE}Go is not installed.${NC}"

  cd ~
  rm -rf go1.22.4.linux-amd64.tar.gz
  wget https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
  sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.22.4.linux-amd64.tar.gz

  EXPORT_STRING=$(cat<<'EOF'
# Add Go to PATH
#
export PATH=$PATH:/usr/local/go/bin
EOF
)

  if ! grep -q "export PATH=\$PATH:/usr/local/go/bin" "${HOME}/.bashrc"; then
    echo "$EXPORT_STRING" >> "${HOME}/.bashrc"
  fi

  if ! grep -q "export PATH=\$PATH:/usr/local/go/bin" "${HOME}/profile"; then
    echo "$EXPORT_STRING" >> "${HOME}/profile"
  fi
else
  echo -e "${GREEN}Go is installed.${NC}"
fi

################################################################################

NVM_DIR="${NVM_DIR:-"${HOME}/.nvm"}"
# sourcing nvm.sh when .nvmrc is present can return an error with no message
# (https://github.com/nvm-sh/nvm/issues/1985).
rm .nvmrc || true
{ set +x +v; } 2>/dev/null; [[ -s "${NVM_DIR}/nvm.sh" ]] && \. "${NVM_DIR}/nvm.sh"; set -x -v
NVM_VERSION=$(nvm --version 2>/dev/null || true)

if [[ "${NVM_VERSION}" != "0.39.7" ]]; then
  echo -e "${BLUE}NVM is not installed.${NC}"
  # Install nvm
  # Run as user $TARGET_USER
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  echo -e "${GREEN}NVM is installed.${NC}"
else
  echo -e "${GREEN}NVM is installed.${NC}"
fi
################################################################################

#!/bin/bash
# WARNING: This file is auto-generated by snipinator. Do not edit directly.
# SOURCE: `scripts/install-reqs.sh.jinja2`.

# https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425
set -e -x -v -u -o pipefail

GREEN='\033[0;32m'
NC='\033[0m'


TMPDIR=$(mktemp -d)
function cleanup {
  rm -rf "${TMPDIR}" || true
}
trap cleanup EXIT

################################################################################
bash scripts/utilities/install-basic.sh
################################################################################
# For examples/tests:# See .github/dependencies.yml for the list of dependencies.
sudo apt-get update && sudo apt-get install -y bash findutils grep xxd git xxhash rsync expect jq libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++ ffmpeg gifsicle
################################################################################
if ! cargo --version; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  . "$HOME/.cargo/env"
fi
################################################################################
if ! monolith --version; then
  cargo install --git https://github.com/Y2Z/monolith.git --rev b6b358b3bceabecf2676dfa887e849ab2f550610
  monolith --version
fi
################################################################################
if ! ffmpeg -codecs | grep -E 'libaom|libvpx'; then
  sudo apt update
  sudo apt install -y yasm nasm cmake libtool autoconf automake git pkg-config \
    build-essential
################################################################################
  cd "${TMPDIR}"
  git clone https://gitlab.com/AOMediaCodec/SVT-AV1.git
  cd SVT-AV1
  mkdir build.cmake
  cd build.cmake
  cmake ..
  make -j$(nproc)
  sudo make install
  sudo ldconfig /usr/local/lib
################################################################################
  cd "${TMPDIR}"
  git clone https://aomedia.googlesource.com/aom
  cd aom
  mkdir build.tmp && cd build.tmp
  cmake -G "Unix Makefiles" ../ -DCMAKE_INSTALL_PREFIX=/usr/local
  make -j$(nproc)
  sudo make install
  sudo ldconfig /usr/local/lib
################################################################################
  cd "${TMPDIR}"
  git clone https://git.ffmpeg.org/ffmpeg.git
  cd ffmpeg
  ./configure --enable-libaom --enable-libsvtav1
  make -j$(nproc)
  sudo make install
  sudo ldconfig /usr/local/lib
################################################################################
  ffmpeg -codecs | grep -E 'libaom|libvpx'
  echo -e "${GREEN}ffmpeg is installed.${NC}"
fi

echo -e "${GREEN}All dependencies are installed.${NC}"

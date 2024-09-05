FROM node:20.12.1-bullseye-slim


WORKDIR /chatgpt2graph

RUN apt-get -y update && apt-get -y --no-install-recommends install bash && \
  apt-get -y clean && \
  apt-get -y autoremove && \
  rm -rf /var/lib/apt/lists/* && \
  mkdir -p /chatgpt2graph && \
  chmod -R a+wrX /chatgpt2graph && \
  chown -R node:node /chatgpt2graph


COPY --chown=node:node . /chatgpt2graph

USER node
# ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
# ENV PATH=/home/node/.npm-global/bin:$PATH
WORKDIR /chatgpt2graph
RUN npm ci --loglevel silly . --timeout=3000000

# This is where the user will mount their data to.
WORKDIR /data

ENTRYPOINT ["npx", "--prefix", "/chatgpt2graph", "chatgpt2graph"]
CMD ["--help"]
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD npx chatgpt2graph --version || exit 1

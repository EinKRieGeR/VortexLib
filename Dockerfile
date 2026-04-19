FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    unzip \
    findutils \
    calibre \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

ENV NUXT_DB_PATH=/app/data/library.db
ENV NUXT_LIBRARY_PATH=/library
ENV HOST=0.0.0.0
ENV PORT=4224
ENV DOCKERIZED=true

RUN mkdir -p /app/data

RUN npx nuxi build

EXPOSE 4224

CMD ["node", ".output/server/index.mjs"]

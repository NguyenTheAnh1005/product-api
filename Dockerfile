FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node src ./src
COPY --chown=node:node scripts/health.js ./scripts/health.js
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 CMD ["node", "scripts/health.js"]
CMD ["node", "src/server.js"]

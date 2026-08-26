FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first so code edits do not bust the layer cache.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

ENV PORT=2400 DB_PATH=/app/data/foodgen.db
EXPOSE 2400

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]

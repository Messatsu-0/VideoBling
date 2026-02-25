FROM node:20-alpine AS build

WORKDIR /app/web

COPY web/package.json /app/web/package.json
RUN npm install

COPY web /app/web
RUN npm run build

FROM caddy:2-alpine

WORKDIR /srv

COPY --from=build /app/web/dist /srv
COPY web/Caddyfile /etc/caddy/Caddyfile

ENV API_PROXY_TARGET=http://backend.railway.internal:8000

EXPOSE 5173

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

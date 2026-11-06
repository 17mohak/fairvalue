# FairValue web app (Next.js standalone). Talks to the API through FAIRVALUE_API_URL (server-side only).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
# Public site address for canonical and share-image URLs. Needed at build time: statically
# generated pages resolve it when they are built. Required for any public deployment.
ARG FAIRVALUE_SITE_URL=
ENV NEXT_TELEMETRY_DISABLED=1 FAIRVALUE_SITE_URL=$FAIRVALUE_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
# ...and at run time, for pages rendered per request (the Overview, dossiers, share images).
ARG FAIRVALUE_SITE_URL=
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    FAIRVALUE_API_URL=http://api:8000 FAIRVALUE_SITE_URL=$FAIRVALUE_SITE_URL
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Licensed player portraits (docs/PLAYER_ASSETS.md); standalone output does not include public/.
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]

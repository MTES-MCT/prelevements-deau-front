FROM node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS base
RUN apk upgrade --no-cache && apk add --no-cache 'zlib>=1.4-r0'
WORKDIR /app
COPY package.json ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')" --ignore-scripts --no-audit --no-fund

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./

RUN npm ci

FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG API_URL
ARG FRONT_URL
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_PROCEDURE_DS_ID
ARG NEXT_PUBLIC_STORAGE_URL
ARG NEXT_PUBLIC_DEPLOY_ENV
ARG NEXT_PUBLIC_BUILD_SHA
ARG NEXT_PUBLIC_CRISP_DISABLED

ENV API_URL=$API_URL
ENV FRONT_URL=$FRONT_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_PROCEDURE_DS_ID=$NEXT_PUBLIC_PROCEDURE_DS_ID
ENV NEXT_PUBLIC_STORAGE_URL=$NEXT_PUBLIC_STORAGE_URL
ENV NEXT_PUBLIC_DEPLOY_ENV=$NEXT_PUBLIC_DEPLOY_ENV
ENV NEXT_PUBLIC_BUILD_SHA=$NEXT_PUBLIC_BUILD_SHA
ENV NEXT_PUBLIC_CRISP_DISABLED=$NEXT_PUBLIC_CRISP_DISABLED

RUN NEXT_TELEMETRY_DISABLED=1 npm run build

FROM base AS runner
WORKDIR /app

# The standalone server runs directly with Node; package managers are build-only.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

ARG API_URL
ARG FRONT_URL
ARG NEXTAUTH_URL

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV API_URL=$API_URL
ENV FRONT_URL=$FRONT_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
EXPOSE 8080

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

CMD ["node", "server.js"]

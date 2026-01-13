FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable
ENV YARN_NODE_LINKER=node-modules

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ .yarn/

RUN yarn --immutable

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable
ENV YARN_NODE_LINKER=node-modules

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_PROCEDURE_DS_ID
ARG NEXT_PUBLIC_STORAGE_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_PROCEDURE_DS_ID=$NEXT_PUBLIC_PROCEDURE_DS_ID
ENV NEXT_PUBLIC_STORAGE_URL=$NEXT_PUBLIC_STORAGE_URL

RUN yarn build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
EXPOSE 8080

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

CMD ["node", "server.js"]

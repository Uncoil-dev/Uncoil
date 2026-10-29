# Slim production image for Coolify. Three stages: install, build, run.
# The final image holds only the standalone server, static assets and public
# files (a few hundred MB) instead of the whole source tree and node_modules.
#
# NEXT_PUBLIC_* values are baked into the browser bundle at build time, so they
# are passed in as build args. Coolify forwards the app's environment variables
# as build args automatically.

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG CONVEX_SITE_URL
ARG NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
ARG NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
ARG NEXT_PUBLIC_MARKETING_ORIGIN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_UNCOIL_DASHBOARD_V
ARG NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND
ARG NEXT_PUBLIC_UNCOIL_REGION
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/content ./content
USER app
EXPOSE 3000
CMD ["node", "server.js"]

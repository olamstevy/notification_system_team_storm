FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy app source
COPY apps/api_gateway ./apps/api_gateway

# Generate Prisma client
RUN npx prisma generate --schema=./apps/api_gateway/prisma/schema.prisma

# Build the app
RUN npm run build api_gateway

# Stage 2: Run
FROM node:22-alpine

WORKDIR /app

# Copy dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/api_gateway/prisma ./apps/api_gateway/prisma

EXPOSE 3000

CMD ["node", "dist/apps/api_gateway/main.js"]

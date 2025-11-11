
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY ../../package*.json ./
RUN npm install

# Copy the app source code
COPY ./tsconfig*.json ./
COPY ./nest-cli.json ../../nest-cli.json
COPY ./apps/push_service/src ./src

# Build the app
RUN npm run build push_service

# Stage 2: Run
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Copy env
COPY ./apps/push_service/.env .env

EXPOSE 3000

CMD ["node", "dist/main.js"]

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist
EXPOSE 80
CMD ["serve", "-s", "/app/dist", "-l", "80"]

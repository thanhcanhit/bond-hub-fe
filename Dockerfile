# Sử dụng hình ảnh Node.js chính thức làm cơ sở
FROM node:18-alpine AS base

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt các gói phụ thuộc chỉ khi cần thiết
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile --legacy-peer-deps

# Xây dựng ứng dụng
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Chuẩn bị hình ảnh sản phẩm cuối cùng
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

# Sao chép các tệp cần thiết từ giai đoạn xây dựng
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Mở cổng 3000
EXPOSE 3000

# Khởi động ứng dụng
CMD ["node", "server.js"]

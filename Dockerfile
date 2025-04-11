# Sử dụng hình ảnh Node.js làm cơ sở cho quá trình build
FROM node:20-alpine AS builder

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép các tệp package
COPY package.json package-lock.json ./

# Cài đặt các phụ thuộc
RUN npm ci --legacy-peer-deps --ignore-scripts

# Sao chép mã nguồn
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Hình ảnh cho môi trường production
FROM node:20-alpine AS runner

# Thiết lập thư mục làm việc
WORKDIR /app

# Thiết lập biến môi trường cho production
ENV NODE_ENV=production
# Thiết lập runtime cho Next.js
ENV NEXT_RUNTIME=nodejs
# Thiết lập timeout cho server
ENV NEXT_SERVER_RESPONSE_TIMEOUT=180000

# Sao chép các tệp cần thiết từ builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src ./src
# Bao gồm tệp .env nếu tồn tại
COPY --from=builder /app/.env ./.env

# Cài đặt chỉ các phụ thuộc cần thiết cho production
RUN npm ci  --legacy-peer-deps --ignore-scripts

# Mở cổng mà ứng dụng sẽ chạy
EXPOSE 3000

# Lệnh để khởi động ứng dụng Next.js
CMD ["npm", "start"]

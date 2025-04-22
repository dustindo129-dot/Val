# Use a specific version of Node.js
FROM node:20.18.3-slim

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install frontend dependencies and build
RUN npm install

# Copy frontend source
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.js ./

# Build frontend
RUN npm run build

# Switch to server directory
WORKDIR /app/server

# Copy server package.json and package-lock.json
COPY server/package*.json ./
COPY server/fix-mongoose.js ./

# Install server dependencies
RUN npm install

# Apply mongoose patch
RUN node fix-mongoose.js || echo "mongoose patch skipped"

# Copy server source
COPY server/ ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_OPTIONS="--experimental-specifier-resolution=node"

# Create a health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["node", "index.js"] 
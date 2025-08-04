# Use Node.js 18 LTS
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files and build script
COPY package*.json build.sh ./

# Make build script executable
RUN chmod +x build.sh

# Copy source code
COPY . .

# Build the application (install all deps, build, then create production dist)
RUN ./build.sh

# Change to dist directory
WORKDIR /app/dist

# Install only production dependencies
RUN npm install --production

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
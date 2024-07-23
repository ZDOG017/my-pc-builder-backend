# Use the latest Alpine image
FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm \
    yarn \
    dumb-init \
    udev \
    ttf-opensans

# Add user so we don't need --no-sandbox
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_CACHE_DIR=/home/web/.cache

# Set the working directory
WORKDIR /usr/src/app

# Copy application code
COPY . .

# Install npm dependencies
RUN npm install

# Build the TypeScript code
RUN npx tsc

# Expose the port your app runs on
EXPOSE 5000

# Run the application with dumb-init to handle PID 1
CMD ["dumb-init", "node", "dist/server.js"]

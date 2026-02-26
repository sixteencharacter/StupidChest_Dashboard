# Use the official Node.js 18 Alpine image for a lightweight footprint
FROM node:21-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Accept build arguments to avoid hardcoding API paths
ARG NEXT_PUBLIC_API_BASE_PATH
ARG NEXT_PUBLIC_DEVICE_ID

# Expose them as environment variables during the build process
ENV NEXT_PUBLIC_API_BASE_PATH=$NEXT_PUBLIC_API_BASE_PATH
ENV NEXT_PUBLIC_DEVICE_ID=$NEXT_PUBLIC_DEVICE_ID

# Build the Next.js application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the Next.js production server
CMD ["npm", "start"]
# Use the official Node.js image.
FROM node:20

# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the project
RUN npm run build

# init db
RUN npm run db

# Make the default command to run a simple shell script
CMD ["sh", "/app/run.sh"]
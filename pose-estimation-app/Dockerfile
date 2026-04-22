FROM node:22-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run the Vite dev server bound to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json  package-lock.json* ./
RUN npm install

# Copy project files
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY vite.config.ts ./
COPY index.html ./

COPY . .

EXPOSE 5173

# Run dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
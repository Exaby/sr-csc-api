# First stage: Install and configure MongoDB
FROM mongo:latest AS mongo
RUN mkdir -p /data/db
COPY mongo.conf /etc/mongo.conf
CMD ["mongod", "--config", "/etc/mongo.conf"]

# Second stage: Build and run Node.js application
FROM node:latest AS node
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
ENV MONGO_URI mongodb://localhost:27017/mydb
EXPOSE 3000
CMD ["npm", "start"]


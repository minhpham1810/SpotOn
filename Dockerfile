########################################
# Stage 1: Build React app
########################################
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG REACT_APP_SPOTIFY_CLIENT_ID
ARG REACT_APP_SPOTIFY_REDIRECT_URI
ENV REACT_APP_SPOTIFY_CLIENT_ID=$REACT_APP_SPOTIFY_CLIENT_ID
ENV REACT_APP_SPOTIFY_REDIRECT_URI=$REACT_APP_SPOTIFY_REDIRECT_URI

RUN npm run build

########################################
# Stage 2: Serve with custom NGINX
########################################
FROM nginx:stable-alpine
# Copy the custom NGINX config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the React build output
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

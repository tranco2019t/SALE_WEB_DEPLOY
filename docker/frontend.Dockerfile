FROM nginx:alpine

# Copy static frontend files to the default Nginx directory
COPY ./frontend /usr/share/nginx/html

# Copy custom Nginx configuration
COPY ./docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

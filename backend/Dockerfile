FROM php:8.4-cli-alpine

# docker-cli: o backend precisa criar contêineres irmãos de preview (Docker-out-of-Docker)
# através do socket montado. Sem este binário, o Process(['docker', ...]) do Laravel falha.
RUN apk add --no-cache docker-cli

WORKDIR /var/www/html

# Copy project files
COPY . .

# Expose Laravel dev server port
EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

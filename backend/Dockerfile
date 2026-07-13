FROM php:8.4-cli-alpine

WORKDIR /var/www/html

# Copy project files
COPY . .

# Expose Laravel dev server port
EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

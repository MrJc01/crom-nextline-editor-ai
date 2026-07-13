# Guia de Docker e Containerização

Para tornar o desenvolvimento e o deploy do **Crom Nextline Editor** portáteis e fáceis de subir, todo o ecossistema é projetado para rodar em contêineres Docker usando o **Docker Compose**.

## Estrutura de Contêineres

O sistema é dividido em três serviços principais dentro do arquivo `docker-compose.yml`:

1. **`frontend`**: Contêiner contendo o Node.js que roda a aplicação React + Vite.
2. **`backend`**: Contêiner contendo o PHP 8.3 + Swoole/Built-in server rodando a API Laravel.
3. **`cli`**: Um ambiente de desenvolvimento/compilação Go para testar e empacotar o binário `crom-cli`.

---

## Configuração do `docker-compose.yml`

Um arquivo padrão de orquestração na raiz do projeto é estruturado da seguinte forma:

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/var/www/html
      - ./cli:/var/www/cli # Compartilha a pasta do CLI Go para execução
    environment:
      - APP_ENV=local
      - APP_DEBUG=true
      - APP_KEY=base64:someGeneratedKey...
```

---

## Como Rodar o Ambiente

### Requisitos
- Docker instalado.
- Docker Compose v2+ instalado.

### Comandos de Inicialização

1. **Subir todos os serviços com rebuild:**
   ```bash
   docker compose up --build
   ```

2. **Subir em background (Detached mode):**
   ```bash
   docker compose up -d
   ```

3. **Parar todos os serviços:**
   ```bash
   docker compose down
   ```

4. **Visualizar logs em tempo real:**
   ```bash
   docker compose logs -f
   ```

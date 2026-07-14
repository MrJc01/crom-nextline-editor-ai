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

## ⚠️ Requisito crítico: cliente Docker dentro do contêiner do backend

O backend Laravel roda **dentro** de um contêiner e, ao mesmo tempo, precisa **criar contêineres irmãos** de preview (padrão *Docker-out-of-Docker*). Para isso, duas coisas precisam ser verdadeiras — e a ausência da segunda era a causa do erro "Falha ao subir Docker":

1. O socket do host precisa estar montado no contêiner: `-v /var/run/docker.sock:/var/run/docker.sock` (já presente no compose).
2. O **binário cliente `docker` precisa existir dentro do contêiner do backend**. A imagem `php:8.4-cli-alpine` não o traz, então o `new Process(['docker', 'run', ...])` do Laravel falhava com "command not found".

O `backend/Dockerfile` passa a instalar o cliente:

```dockerfile
FROM php:8.4-cli-alpine
RUN apk add --no-cache docker-cli
# ... restante
```

### `HOST_PROJECT_PATH`
Como o `docker run -v` executa no **host** (via socket), o caminho do volume precisa ser o caminho **no host**, não o caminho interno do contêiner. Defina no `.env` do backend:

```env
HOST_PROJECT_PATH=/caminho/absoluto/no/host/crom-nextline-editor-ai
```

Sem essa variável, o volume monta um diretório inexistente e o preview sobe vazio.

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

# Guia de Instalação e Implantação (Dev, Teste e Produção)

Este guia orienta na configuração, inicialização e implantação em produção ou ambiente de testes do **Crom Nextline Editor AI**.

---

## 📋 Requisitos de Sistema

Para rodar a plataforma (tanto localmente quanto em produção), a máquina host deve possuir:

- **Docker Engine** (v24.0+)
- **Docker Compose** (v2.20+)
- **Git**
- **Acesso à Internet** (para download de imagens Docker e comunicação com a API do OpenRouter)
- **Portas livres no Host:** `8000` (Backend Laravel), `5173` (Frontend React) e intervalo de portas para os previews (padrão inicia em `9001` em diante).

---

## 🛠️ 1. Instalação e Execução para Testes (Ambiente Local)

No ambiente local, toda a stack (Frontend, Backend, Banco de Dados SQLite e Docker) roda via Docker Compose de forma simples.

### Passo 1: Clonar o Repositório
```bash
git clone https://github.com/MrJc01/crom-nextline-editor-ai.git
cd crom-nextline-editor-ai
```

### Passo 2: Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto (um `.gitignore` na raiz impede que este arquivo seja enviado ao Git):
```bash
# Copie do modelo ou crie um novo
cat <<EOF > .env
# Chave de API da plataforma no OpenRouter
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui

# Tipo de URL de preview: 'port' (localhost:9001) ou 'subdomain' (slug.localhost)
PREVIEW_URL_TYPE=port
PREVIEW_BASE_URL=http://localhost:8000
EOF
```

### Passo 3: Subir os Contêineres via Docker Compose
Este comando compila as imagens do Frontend (Vite) e Backend (Laravel com CLI Go e dependências Zip):
```bash
docker compose up -d --build
```
> [!NOTE]
> O Docker Compose monta o socket do host (`/var/run/docker.sock:/var/run/docker.sock`) dentro do contêiner do Laravel. Isso permite que o Laravel suba e gerencie os contêineres filhos de preview no próprio Docker do host.

### Passo 4: Inicializar Banco de Dados e Gerar Seeds
Crie as tabelas SQLite e popule os usuários de teste (`admin@crom.run` e `client@crom.run`):
```bash
docker exec -it crom-backend-srv php artisan migrate --seed
```

### Passo 5: Acessar a Aplicação
Acesse a aplicação no seu navegador:
- **Frontend (Painel):** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)

**Credenciais de Acesso Rápidas (geradas pelo Seed):**
- **Cliente:** `client@crom.run` / senha: `password`
- **Administrador:** `admin@crom.run` / senha: `password`

---

## 🚀 2. Implantação em Produção (Hardening & Escalonamento)

Implantar em produção exige cuidados especiais com segurança (Docker Socket) e roteamento de domínios dinâmicos.

### 🛡️ A. Protegendo o Socket do Docker (Hardening Crucial)
Por padrão, o Laravel se comunica diretamente com o socket do Docker (`/var/run/docker.sock`). Se o backend sofrer um comprometimento, um invasor com acesso ao socket pode subir contêineres privilegiados e comprometer todo o servidor host.

**Recomendação para Produção:** Use o **Tecnativa Docker Socket Proxy** em vez de montar o socket diretamente:
1. Adicione um serviço de proxy no seu `docker-compose.prod.yml`:
   ```yaml
   services:
     docker-proxy:
       image: tecnativa/docker-socket-proxy
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
       environment:
         - CONTAINERS=1
         - IMAGES=1
         - POST=1
         - DELETE=1
       ports:
         - "2375:2375"
   ```
2. No contêiner do Laravel, configure o cliente Docker para utilizar a porta TCP do proxy em vez do arquivo de socket local:
   ```bash
   export DOCKER_HOST=tcp://docker-proxy:2375
   ```

---

### 🌐 B. Roteamento por Subdomínio Wildcard (Preview Premium)
Para fornecer URLs profissionais como `meusite.seudominio.com` em vez de expor portas (como `:9001`), configure o mapeamento de subdomínios dinâmicos:

1. **Configuração de DNS:**
   Crie uma entrada DNS do tipo **A** Wildcard apontando para o IP do seu servidor:
   ```text
   *.seudominio.com  IN  A  192.0.2.1
   ```

2. **Configurar as Variáveis de Ambiente no Laravel (`.env`):**
   ```env
   PREVIEW_URL_TYPE=subdomain
   PREVIEW_BASE_URL=https://seudominio.com
   ```

3. **Proxy Reverso (Nginx / Traefik / Caddy):**
   Configure o Nginx do host para interceptar as requisições de subdomínio e repassar para o backend Laravel (que atua como Proxy das portas dinâmicas dos contêineres de preview ativos):
   ```nginx
   server {
       listen 80;
       listen 443 ssl;
       server_name *.seudominio.com seudominio.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

### 📂 C. Persistência de Arquivos e Backups
Os workspaces ficam fisicamente alocados na pasta do backend em `storage/app/workspaces`.
- **Produção:** Monte esta pasta em um volume do Docker persistente ou em um armazenamento compartilhado (como AWS EFS ou NFS) para não perder dados caso o contêiner do backend seja reiniciado ou atualizado.
  ```yaml
  volumes:
    - crom_workspaces_data:/var/www/backend/storage/app/workspaces
  ```

---

## ⚙️ 3. Limitação de Recursos de Execução

Todos os contêineres criados dinamicamente para os clientes são isolados e limitados de forma rígida pelo `DockerService` do backend para mitigar ataques de Negação de Serviço (DoS):

- **Memória RAM:** Limite máximo de **512MB** por contêiner (`--memory 512m`).
- **CPU:** Limite máximo de **1 núcleo virtual** por contêiner (`--cpus 1`).
- **Processos (PIDs):** Máximo de **256 processos simultâneos** por contêiner (`--pids-limit 256`), mitigando Fork Bombs.
- **Auto-Stop:** Contêineres inativos podem ser derrubados ou desligados via Painel pelo botão "Parar Servidor" para liberar recursos de RAM do host.

---

## 🧪 4. Como Executar Testes no Ambiente de Teste (CI/CD)

Toda a infraestrutura de segurança e funcionalidades possui testes automatizados que podem ser executados localmente ou em pipelines de integração contínua.

```bash
# Executar todos os 55 testes de segurança e penetração (Pentests):
docker exec -it crom-backend-srv php artisan test --testsuite=Pentest

# Executar testes funcionais de recursos e stacks:
docker exec -it crom-backend-srv php artisan test --testsuite=Feature
```

# Angico deploy

## API no Render

1. Crie um Web Service a partir deste repo usando `render.yaml`.
2. Defina as variaveis:
   - `ANGICO_DB_URL`
   - `ANGICO_DB_USER`
   - `ANGICO_DB_PASSWORD`
   - `ANGICO_ALLOWED_ORIGINS=https://SEU_FRONTEND.vercel.app,http://localhost:5175`
   - `ANGICO_AUTH_REQUIRED=true`
   - `ANGICO_SEED_LEADERS_ENABLED=true`
   - `ANGICO_SEED_LEADER_PASSWORD=uma-senha-forte`
   - `ANGICO_UPLOAD_DIR=/opt/render/project/src/uploads`
   - `ANGICO_UPLOAD_MAX_BYTES=2097152`
   - `ANGICO_GEOCODER_PROVIDER=nominatim`
   - `ANGICO_GEOCODER_USER_AGENT=Angico/0.1 contato@seudominio.com`
3. Para demo efemera, use H2 omitindo as variaveis de banco. Os dados reiniciam a cada deploy/restart.
4. Para deploy persistente, use uma URL JDBC PostgreSQL em `ANGICO_DB_URL`.

Build local:

```bash
cd apps/api
mvn clean package
SERVER_PORT=8082 java -jar target/angico-api-0.0.1-SNAPSHOT.jar
```

## Frontend no Vercel

1. Configure o projeto com root directory `apps/web`.
2. Defina:
   - `VITE_API_BASE_URL=https://URL_DA_API`
   - `VITE_USE_DEMO_DATA=false`
   - `VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
   - `VITE_DEFAULT_COUNTRY=BR`
3. Atualize `apps/web/vercel.json` trocando `https://URL_DA_API` pela URL real da API.

Build local:

```bash
cd apps/web
npm install
npm run build
```

Desenvolvimento local com proxy:

```bash
cd apps/api
SERVER_PORT=8082 java -jar target/angico-api-0.0.1-SNAPSHOT.jar

cd apps/web
VITE_DEV_API_PROXY_TARGET=http://localhost:8082 npm run dev
```

Login local sem banco preexistente:

- `lider@angico.local`
- `campo@angico.local`
- senha: valor de `ANGICO_SEED_LEADER_PASSWORD` ou `Angico@2026!` se a variavel nao for definida.

Para producao, troque `ANGICO_SEED_LEADER_PASSWORD`, restrinja `ANGICO_ALLOWED_ORIGINS` ao dominio real do frontend e use PostgreSQL persistente.

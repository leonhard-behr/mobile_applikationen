<h1 style="text-align: center;">Mobile Applikation Vector Valley</h1>

Projektarbeit im Modul *KI in mobilen Applikationen* an der Hochschule für angewandte Wissenschaften Ansbach.

### Architektur

![](architecture_mobile_applikationen_2_2.drawio.png)

**Nginx** (aus [``nginx.conf``](frontend\nginx.conf)):
- API-Anfragen an Gunicorn auf Port 6000 weiterleiten
- Static files aus ``frontend/dist`` serve

**Middleware** (aus [``main.py``](backend\main.py)):
1. CORS: Origin-Validierung gegen Allowlist
2. Rate Limit: Redis Sliding Window (100 Anfragen pro 60 Sekunden je IP)
3. UUID Injection: ``X-Correlation-ID``-Header für das Request-Tracing

**FastAPI** (aus [``main.py``](backend\main.py))
- JWT-Authentifizierung
- 4 Router:
    - Auth
    - Game
    - Stats
    - Social

**Gunicorn** verwaltet 4 parallele Uvicorn-Worker-Prozesse. Da die Worker keinen gemeinsamen Speicher teilen, wird Redis als geteilter Cache verwendet (Rate Limiting und Leaderboard-Cache).


### API-Endpunkte

Alle Endpunkte tragen das Präfix `/api/`. Alle Spiel-, Statistik- und Social-Endpunkte erfordern eine JWT-Authentifizierung.

| Modul | Route | Methode | Auth |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/register` | `POST` | – |
| | `/api/auth/login` | `POST` | – |
| | `/api/auth/refresh` | `POST` | Cookie |
| | `/api/auth/me` | `GET` · `PATCH` | JWT |
| **Game** | `/api/game/start` | `GET` | JWT |
| | `/api/game/guess` | `POST` | JWT |
| | `/api/game/hint` | `POST` | JWT |
| | `/api/game/letters` | `GET` | JWT |
| | `/api/game/victory` | `POST` | JWT |
| | `/api/game/history` | `GET` | JWT |
| **Stats** | `/api/stats/profile` | `GET` | JWT |
| | `/api/stats/journey` | `GET` | JWT |
| | `/api/stats/achievements` | `GET` | JWT |
| **Social** | `/api/social/friends` | `GET` | JWT |
| | `/api/social/leaderboard/daily` | `GET` | JWT |
| | `/api/social/leaderboard/streak` | `GET` | JWT |
| **Health** | `/api/health` | `GET` | – |

### Deployment

#### Frontend
Die React-SPA wird per Vite zu statischen Dateien gebuildet und direkt von Nginx served.
Nginx leitet `/api/*` per `proxy_pass` an Port 6000 weiter.

```shell
npm run build
```

#### Backend
Docker Compose verwaltet drei Container: FastAPI-Backend, PostgreSQL und Redis. Im Dockerfile ist das Ausführen des Shell Skripts [``entrypoint.sh``](backend\entrypoint.sh) als ENTRYPOINT konfiguriert. Das Skript wartet auf die Datenbankverbindung, führt die Datenbank-Migrationen für PostgreSQL via Alembic aus (SQLite wird bei App-Start automatisch initialisiert) und startet anschließend den Gunicorn-Server.

```shell
ssh root@178.104.137.28
docker-compose up -d
```

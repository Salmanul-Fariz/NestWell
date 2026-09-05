# Production database: MongoDB Atlas

The production Compose stack no longer starts MongoDB. It reads all application
configuration from `apps/backend/.env`, which is ignored by Git.

## Create and configure Atlas

1. In MongoDB Atlas, create a production project and cluster. Create a dedicated
   database user with only `readWrite` access to the `nestwell` database.
2. Under **Network Access**, allow the public egress IP address of the server
   running Docker. Do not use `0.0.0.0/0` except as a short, temporary diagnostic.
3. Copy the **Drivers / Node.js** connection string from Atlas. Replace the user,
   password, and cluster placeholders in `apps/backend/.env`. If the password has
   special characters, URL-encode it.
4. Copy `apps/backend/.env.example` to `apps/backend/.env` on the production host.
   Generate independent values for `JWT_SECRET` and `JWT_REFRESH_SECRET`, set your
   public frontend URL in `CORS_ORIGIN`, and keep `COOKIE_SECURE=true` behind HTTPS.
5. Start or update the stack. `--remove-orphans` removes the old MongoDB
   container from this Compose project after the migration:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
   ```

## Connection example

```dotenv
MONGO_URI=mongodb+srv://nestwell_app:URL_ENCODED_PASSWORD@cluster0.example.mongodb.net/nestwell?retryWrites=true&w=majority
```

Use the `mongodb+srv://` connection string supplied by Atlas; do not retain the
old Docker-only `replicaSet=rs0` or `directConnection=true` query options.

## Optional notification configuration

### CallMeBot

Each user can save their own CallMeBot key in notification settings. That key is
used first. `CALLMEBOT_API_KEY` is only a server-wide fallback for a user who has
not saved a personal key; it is not needed if every user supplies their own key.
Leave it empty in `apps/backend/.env` to require per-user keys and disable the
fallback.

### Web Push VAPID keys

Generate one VAPID key pair on a trusted machine from the project root:

```bash
pnpm --filter backend exec web-push generate-vapid-keys
```

Copy the resulting values once into `apps/backend/.env`:

```dotenv
WEB_PUSH_VAPID_PUBLIC=<publicKey output>
WEB_PUSH_VAPID_PRIVATE=<privateKey output>
WEB_PUSH_CONTACT=mailto:admin@your-domain.com
```

The public key is safe for browsers to receive; the private key must remain only
on the server. Keep the same pair for the life of the deployment. Replacing it
invalidates existing browser subscriptions, so users must subscribe again.

## Token expiration

Set these independently in `apps/backend/.env`; the access and refresh cookies
automatically use the same expiration as their JWTs:

```dotenv
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
```

Supported units are `ms`, `s`, `m`, `h`, `d`, and `w` (for example, `30m`, `8h`,
or `14d`). Restart the `app` container after changing either value.

## Remove Docker resources

Atlas data is external and none of these commands delete it.

To remove only this application's production containers, Redis volume, and
images, run from the project root:

```bash
docker compose -f docker-compose.prod.yml down --volumes --rmi all --remove-orphans
```

To delete **every** Docker container, volume, and image on the server (including
unrelated applications), run these commands. This is irreversible:

```bash
docker ps -aq | xargs -r docker rm -f
docker volume ls -q | xargs -r docker volume rm
docker image ls -aq | sort -u | xargs -r docker image rm -f
docker network prune -f
```

## Before going live

- Confirm the Atlas cluster can be reached from the server IP and that the
  database user is scoped only to this application database.
- Store the real `.env` in your deployment secret manager or securely on the
  server; never commit it.
- The API is currently bound to `127.0.0.1:3000`, so place a TLS reverse proxy
  (such as Nginx or Caddy) in front of it before exposing the application.

  Checklist de test pre-lancement RblxDash

  1. AUTHENTIFICATION & ONBOARDING

  - Page sign-in charge correctementx
  - Page sign-up charge correctementx
  - Inscription redirige vers /onboardingx
  - Connexion redirige vers /dashboardx
  - Page onboarding affiche le formulaire de creation d'organisationx
  - Creation d'org met les cookies et redirige vers /dashboard/games/newx
  - Utilisateur deja connecte sur /login redirige vers /dashboardx
  - Start trial : utilisateur non connecte redirige vers sign-upx
  - Start trial : utilisateur avec abo actif redirige vers dashboardx

  ---
  2. BILLING & STRIPE

  - Page /account affiche le plan actuel, jours trial restants, date de renouvellementx
  - Barres d'utilisation (jeux, workspaces) correctesx
  - Bouton "Upgrade" lance un checkout Stripe (PRO ou STUDIO)x
  - Checkout cree un customer Stripe si inexistantx
  - Trial de 7 jours applique correctementx
  - Redirection vers Stripe fonctionnex
  - Retour ?success=1 affiche le message de succesx
  - Retour ?canceled=1 affiche le message d'annulationx
  - Bouton "Manage billing" ouvre le portail Stripex
  - Webhook Stripe : customer.subscription.created → sync abo
  - Webhook Stripe : customer.subscription.updated → sync abo
  - Webhook Stripe : customer.subscription.deleted → sync abo
  - Webhook Stripe : customer.subscription.trial_will_end → email envoye
  - Webhook Stripe : invoice.payment_failed → email envoye
  - Webhook Stripe : invoice.paid → status remis a ACTIVE
  - Signature webhook invalide → 400

  ---
  3. ROBLOX OAUTH

  - Bouton "Connect Roblox" demarre le flow OAuth (cookies state/verifier)
  - Redirection vers Roblox avec PKCE
  - Callback echange le code contre un token
  - RobloxConnection creee avec avatar, username, display name, scopes
  - Token d'acces et refresh token encryptes (AES-256-GCM)
  - Redirection avec ?roblox=connected
  - Bouton "Disconnect" revoque le token et supprime la connexion
  - Token expire → refresh automatique via ensureRobloxAccessToken
  - Erreur OAuth → redirection avec ?roblox=errorv

  ---
  4. GESTION DES JEUX

  - Page /dashboard/games/new charge avec la liste des modulesx
  - Message si limite de jeux atteintex
  - Message si pas d'abonnement actifx
  - Creation de jeu : nom (1-100 chars), place ID requisx
  - Modules valides selon le planx
  - Webhook secret genere (32 bytes hex)x
  - Audit log game.createdx
  - Page /dashboard/games liste tous les jeux de l'orgx
  - Jeu courant marque avec un badge
  - Health badge (vert/jaune/rouge) correctx
  - Nombre de serveurs live, joueurs, evenements affichesx
  - Page detail du jeu : metriques, webhook URL, secret, place IDx
  - Bouton copier webhook URL/secret fonctionnex
  - Rotation du secret : genere un nouveau secret, audit logx
  - Suppression du jeu : cascade delete (serveurs, joueurs, logs, sanctions)x
  - Seuls ADMIN/OWNER peuvent supprimer/rotatex

  ---
  5. WEBHOOK INGESTION (le plus critique)

  - POST /api/webhook/[gameId] avec header x-webhook-secret valide → 200
  - Secret manquant ou invalide → 401
  - Game inexistant → 404
  - Body invalide (event vide, etc.) → 400
  - player_join : cree/update TrackedPlayer, marque online avec jobId
  - player_leave : marque offline, met lastSessionEndedAt
  - server_started : cree LiveServer avec startedAt
  - server_stopped : supprime LiveServer, met les joueurs offline
  - Heartbeat : update lastHeartbeatAt, playerCount, playerIds
  - moderation_applied : met deliveryStatus=APPLIED, deliveredAt
  - moderation_failed : met deliveryStatus=FAILED, alerte Discord
  - Premier evenement du jeu → email sendGameConnectedEmail au owner
  - Username/displayName mis a jour a chaque event

  ---
  6. JOUEURS

  - Page /dashboard/players liste les joueurs (online d'abord)
  - Recherche par Roblox ID, username, display name (case-insensitive)
  - Compteurs : total, online, actifs 24h
  - Nombre de notes et sanctions affiche par joueur
  - Page profil joueur : infos, status online, serveur actuel
  - Notes : creation (1-2000 chars), audit log, affichage sur profil
  - Inventaire : section inventaire charge si disponible

  ---
  7. MODERATION (sanctions)

  - Creation de sanction : BAN, KICK, TIMEOUT, WARN, UNBAN, MUTE
  - Raison requise (5-500 chars)
  - TIMEOUT requiert une duree
  - UNBAN necessite une restriction active
  - Nouveau BAN/TIMEOUT desactive l'ancien
  - Delivery status = PENDING a la creation
  - DataStore ban : BAN ecrit dans le DataStore Roblox (persistant)
  - DataStore unban : UNBAN supprime du DataStore
  - GET /api/webhook/[gameId]/moderation?robloxId=X retourne les sanctions actives
  - KICK consomme (marque inactive) apres reponse
  - Sanctions expirees desactivees automatiquement
  - Page /dashboard/moderation : sanctions actives + recentes
  - Status de delivery (PENDING/APPLIED/FAILED) affiche avec couleur
  - Seuls MODERATOR+ peuvent creer des sanctions

  ---
  8. EQUIPE & ORGANISATIONS

  - Creation d'org avec nom, slug auto-genere
  - Invitations : email valide, role valide, token genere, email envoye
  - Impossible d'inviter un membre existant ou soi-meme
  - Invitation expire apres 7 jours
  - Acceptation : membre ajoute avec le bon role, audit log
  - Token invalide/expire → erreur
  - Changement de role : OWNER peut changer les roles
  - Transfert de propriete : ancien OWNER → ADMIN, nouveau → OWNER
  - Quitter l'org : OWNER ne peut pas quitter s'il est seul owner
  - Membre supprime, cookies mis a jour, redirection
  - Suppression d'org : seul OWNER, cascade delete tout

  ---
  9. PARAMETRES

  - Liste des workspaces avec role, plan, date
  - Switch de workspace fonctionne (cookies mis a jour)
  - API Keys (STUDIO seulement) : creation, prefix affiche, suppression
  - Cle brute retournee une seule fois, hash stocke
  - Auth Bearer [key] sur /api/v1/* fonctionne
  - Cle revoquee → 401
  - Discord webhook : saisie URL, sauvegarde, suppression
  - Alerte Discord envoyee quand moderation echoue
  - Matrice de permissions affichee correctement

  ---
  10. ANALYTICS

  - Page /dashboard/analytics charge avec des donnees
  - Sans jeu selectionne → empty state
  - API v1 analytics : overview, activity, economy, monetization, progression
  - Export analytics (/api/analytics/export) fonctionne

  ---
  11. SERVEURS & LOGS

  - Page /dashboard/servers liste les serveurs live
  - Job ID, region, nombre de joueurs, dernier heartbeat
  - Page detail serveur : joueurs, evenements, broadcast message
  - Page /dashboard/logs : feed d'evenements en temps reel
  - Filtrage par type d'evenement
  - Details de l'evenement expandable
  - Page /dashboard/audit : audit logs en ordre chronologique inverse

  ---
  12. EMAILS (verifier dans Resend dashboard)

  - Welcome : envoye a la creation du workspace
  - Game connected : envoye au premier webhook recu
  - Trial expiring : envoye 3 jours avant fin trial (via Stripe event)
  - Payment failed : envoye quand paiement echoue (via Stripe event)
  - No game connected : envoye J+3 si aucun jeu (via cron)
  - First week analytics : envoye J+7 du trial (via cron)
  - Inactive user : envoye apres 7 jours d'inactivite (via cron)
  - Weekly summary : envoye chaque lundi aux users actifs (via cron)
  - Invitation : envoye avec lien d'invitation
  - Templates email bien formattes (dark theme, boutons, footer)
  - Lien "Manage account" fonctionne dans les emails

  ---
  13. RATE LIMITING

  - API v1 : 60 req/min → 429 au-dela
  - Webhooks : 300 req/min
  - Auth routes : 10 req/min
  - API interne : 120 req/min
  - Headers X-RateLimit-Remaining et X-RateLimit-Reset sur les reponses reussies
  - Header Retry-After sur les 429
  - Fallback permissif si Upstash non configure

  ---
  14. MODE MAINTENANCE

  - MAINTENANCE_MODE=true → 503 sur toutes les routes
  - Page HTML de maintenance affichee (pas JSON)
  - /api/health toujours accessible
  - IPs dans MAINTENANCE_ALLOWED_IPS bypassent
  - Header Retry-After: 300

  ---
  15. MONITORING & ERREURS

  - Sentry capture les erreurs (verifier dans le dashboard Sentry)
  - Error boundary root (error.tsx) affiche UI d'erreur stylisee
  - Error boundary dashboard affiche UI specifique
  - global-error.tsx capture les erreurs fatales
  - /api/health retourne 200
  - Logger structure dans les routes API (pas de console.log en prod)

  ---
  16. SECURITE

  - Headers CSP configures dans next.config.ts
  - Cookies OAuth HTTP-only et secure en production
  - Open Cloud API keys et tokens OAuth encryptes (AES-256-GCM)
  - Isolation par org : un user ne voit que les donnees de son org
  - Webhook secret valide avant traitement
  - API keys hashees en base, cle brute jamais stockee
  - Pas de secrets dans le code ou .env.example

  ---
  17. UI & RESPONSIVE

  - Skeletons de chargement sur toutes les pages dashboard
  - Empty states avec message utile (pas de jeu, pas de joueurs, etc.)
  - Mobile : sidebar collapse, tables scrollent, formulaires adaptes
  - Desktop : layout multi-colonnes, hover states
  - Navigateurs : Chrome, Firefox, Safari, Edge

  ---
  18. CRON JOB

  - GET /api/cron/lifecycle avec Authorization: Bearer [CRON_SECRET]
  - Sans auth → 401
  - Execute les 4 taches : no-game, first-week, inactive, weekly
  - Configurer un cron externe (cron-job.org, UptimeRobot, ou systemd timer) pour appeler ce endpoint 1x/jour

  ---
  19. PAGES PUBLIQUES

  - Landing page (/) charge et affiche les plans
  - /privacy et /terms ont du vrai contenu (pas des placeholders)
  - /changelog accessible
  - /contact accessible avec lien GitHub issues
  - /status affiche le statut
  - /why page accessible
  - /sitemap.xml et /robots.txt generes
  - OpenGraph image generee (/opengraph-image)

  ---
  20. DERNIERE VERIFICATION

  - Cles Stripe en mode live (pas test)
  - Domaine Resend verifie en production
  - Credentials Roblox OAuth de production
  - Cle Clerk de production
  - CRON_SECRET est un secret fort
  - ROBLOX_OAUTH_ENCRYPTION_KEY configure (64 chars hex)
  - OPEN_CLOUD_API_KEY_ENCRYPTION_KEY configure
  - Upstash Redis configure pour le rate limiting
  - Sentry DSN configure
  - Backup base de donnees en place
  - SSL/HTTPS actif sur dashblox.desgagneweb.com

  ---
  Commence par les sections 5 (webhooks), 2 (billing) et 7 (moderation) — ce sont les plus critiques pour ton business. Le reste peut etre teste progressivement.
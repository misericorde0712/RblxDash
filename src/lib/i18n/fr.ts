import { registerLocale } from "../i18n"

registerLocale("fr", {
  // ─── Common ──────────────────────────────────────────────────────────────
  "common.loading": "Chargement...",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.confirm": "Confirmer",
  "common.back": "Retour",
  "common.next": "Suivant",
  "common.search": "Rechercher",
  "common.filter": "Filtrer",
  "common.export": "Exporter",
  "common.retry": "Réessayer",
  "common.close": "Fermer",
  "common.copy": "Copier",
  "common.copied": "Copié !",
  "common.noResults": "Aucun résultat trouvé.",
  "common.required": "Obligatoire",

  // ─── Auth ────────────────────────────────────────────────────────────────
  "auth.signIn": "Se connecter",
  "auth.signUp": "Créer un compte",
  "auth.signOut": "Se déconnecter",

  // ─── Navigation ──────────────────────────────────────────────────────────
  "nav.overview": "Vue d'ensemble",
  "nav.games": "Jeux",
  "nav.players": "Joueurs",
  "nav.moderation": "Modération",
  "nav.servers": "Serveurs",
  "nav.logs": "Journaux",
  "nav.analytics": "Analytique",
  "nav.health": "Santé",
  "nav.settings": "Paramètres",
  "nav.billing": "Facturation",
  "nav.audit": "Journal d'audit",
  "nav.guide": "Guide d'installation",
  "nav.docs": "Documentation API",

  // ─── Dashboard ───────────────────────────────────────────────────────────
  "dashboard.welcome": "Bon retour, {name}",
  "dashboard.noGames": "Aucun jeu connecté pour l'instant.",
  "dashboard.addFirstGame": "Ajoutez votre premier jeu pour commencer le suivi.",

  // ─── Games ───────────────────────────────────────────────────────────────
  "games.create": "Ajouter un jeu",
  "games.name": "Nom du jeu",
  "games.placeId": "Roblox Place ID",
  "games.universeId": "Universe ID",
  "games.webhookSecret": "Secret du webhook",
  "games.modules": "Modules activés",
  "games.created": "Jeu créé avec succès.",
  "games.deleted": "Jeu supprimé.",

  // ─── Players ─────────────────────────────────────────────────────────────
  "players.title": "Joueurs",
  "players.online": "En ligne",
  "players.offline": "Hors ligne",
  "players.lastSeen": "Vu pour la dernière fois {time}",
  "players.firstSeen": "Vu pour la première fois {time}",
  "players.noPlayers": "Aucun joueur suivi pour l'instant.",

  // ─── Moderation ──────────────────────────────────────────────────────────
  "moderation.title": "Modération",
  "moderation.ban": "Bannir",
  "moderation.kick": "Expulser",
  "moderation.timeout": "Suspension temporaire",
  "moderation.unban": "Débannir",
  "moderation.reason": "Raison",
  "moderation.active": "Actif",
  "moderation.expired": "Expiré",
  "moderation.pending": "En attente de livraison",
  "moderation.applied": "Appliqué",
  "moderation.failed": "Échec de livraison",

  // ─── Servers ─────────────────────────────────────────────────────────────
  "servers.title": "Serveurs en direct",
  "servers.noServers": "Aucun serveur actif pour le moment.",
  "servers.playerCount": "{count} joueurs",
  "servers.region": "Région",
  "servers.uptime": "Temps de fonctionnement",

  // ─── Analytics ───────────────────────────────────────────────────────────
  "analytics.title": "Analytique",
  "analytics.dau": "Utilisateurs actifs quotidiens",
  "analytics.mau": "Utilisateurs actifs mensuels",
  "analytics.revenue": "Revenus",
  "analytics.sessions": "Sessions",
  "analytics.newPlayers": "Nouveaux joueurs",

  // ─── Billing ─────────────────────────────────────────────────────────────
  "billing.title": "Facturation",
  "billing.currentPlan": "Plan actuel",
  "billing.upgrade": "Passer au supérieur",
  "billing.manage": "Gérer l'abonnement",
  "billing.free": "Gratuit",
  "billing.pro": "Pro",
  "billing.studio": "Studio",
  "billing.trial": "Essai — {days} jours restants",
  "billing.trialExpired": "Essai expiré",

  // ─── Settings ────────────────────────────────────────────────────────────
  "settings.title": "Paramètres",
  "settings.workspace": "Espace de travail",
  "settings.members": "Membres",
  "settings.invites": "Invitations",
  "settings.apiKeys": "Clés API",
  "settings.discord": "Alertes Discord",
  "settings.dangerZone": "Zone de danger",

  // ─── Errors ──────────────────────────────────────────────────────────────
  "error.generic": "Une erreur s'est produite.",
  "error.notFound": "Page introuvable.",
  "error.unauthorized": "Vous devez être connecté pour accéder à cette page.",
  "error.forbidden": "Vous n'avez pas la permission d'effectuer cette action.",
  "error.rateLimit": "Trop de requêtes. Veuillez réessayer plus tard.",
  "error.maintenance": "RblxDash est en maintenance. Nous serons de retour bientôt.",
})

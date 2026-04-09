# Demo Staging Checklist

Cette checklist sert pour la video presentation et pour le tutoriel.

## 1. Workspace de demo

- Cree un workspace dedie a la demo.
- Donne-lui un nom simple et memorisable.
- Invite au besoin un compte secondaire pour montrer le mode equipe.
- Selectionne ce workspace avant de commencer toute capture.

## 2. Jeu Roblox de demo

- Utilise un jeu public ou prive de demonstration, jamais ton jeu principal.
- Verifie que le jeu est bien ajoute dans RblxDash.
- Verifie que le validator de setup est au vert.
- Verifie que le jeu est publie, pas seulement lance en Studio.

## 3. Installation Roblox deja en place

- Le script serveur RblxDash est colle dans `ServerScriptService`.
- Le script est un `Script`, pas un `ModuleScript`.
- `Allow HTTP Requests` est active dans `Home -> Game Settings -> Security`.
- Le jeu a ete publie apres l'activation HTTP.
- Tu as rejoint le jeu au moins une fois pour generer des evenements.

## 4. Donnees a preparer avant enregistrement

Prepare des donnees reelles ou semi-reelles dans chaque surface cle.

### Dashboard / Health / Servers

- Au moins 1 serveur actif
- Au moins 2 a 3 joueurs recents
- Quelques evenements dans les 5 dernieres minutes
- Un etat de sante lisible

### Logs

- `player_join`
- `player_leave`
- un evenement gameplay custom
- un evenement economie
- un evenement monetisation si possible

### Players

- 1 joueur avec historique de session
- 1 joueur avec notes
- 1 joueur avec sanction historique

### Moderation

- 1 timeout historique
- 1 ban ou unban historique
- 1 cas ou l'etat de livraison est visible

### Analytics

- activite sur 7 jours
- activite sur 30 jours
- un exemple monetisation
- un exemple economie
- un exemple progression

### Live Config

- 3 a 5 cles deja creees
- exemples utiles:
  `game.maxPlayers`
  `economy.coinMultiplier`
  `events.doubleXpEnabled`
  `shop.featuredBundle`

### Live Events

- 1 event `ONCE`
- 1 event `WEEKLY`
- 1 event `ALWAYS`
- une `eventData` JSON propre et lisible

### Scripts techniques a preparer pour le tutoriel

- 1 script serveur avec `Dashblox.trackEvent(...)`
- 1 script serveur avec `Dashblox.createEconomyTracker(...)`
- 1 script serveur ou module pour `ProcessReceipt` et `Dashblox.trackRobuxPurchase(...)`
- 1 script serveur avec `Dashblox.withContext(...)`
- 1 exemple optionnel avec `createProgressionTracker(...)`
- le module `RblxDashLiveConfig` pret si tu veux montrer l'addon
- le module `RblxDashLiveEvents` pret si tu veux montrer l'addon

Conseil:

Utilise un mini jeu de demo avec trois systems faciles a raconter:

- un shop Coins
- une quete ou progression simple
- un developer product Roblox

## 5. Elements a montrer sans friction

- La page `Guide`
- La page `Docs`
- La creation d'un jeu
- La page detail d'un jeu
- `Dashboard`
- `Health`
- `Servers`
- `Logs`
- `Players`
- `Moderation`
- `Analytics`
- `Live Config`
- `Live Events`
- `Settings`

## 6. Securite avant capture

- N'affiche pas de vraie API key.
- N'affiche pas de vraie carte Stripe.
- N'affiche pas de vraie adresse email personnelle si possible.
- N'affiche pas un secret de webhook de production.
- Si un secret apparait dans le script copie, floute-le ou regenere-le apres enregistrement.

## 7. Environnement d'enregistrement

- Navigateur avec profil propre
- Notifications OS coupees
- Onglets inutiles fermes
- Zoom navigateur a 100%
- Police systeme nette
- Resolution 1440p ou 1080p stable
- Curseur visible et propre
- Micro teste
- Raccourcis OBS verifies

## 8. Passes de capture a faire

Fais plusieurs passes courtes plutot qu'une seule prise risquee.

- pass homepage / landing
- pass onboarding / add game
- pass setup guide
- pass dashboard / health / servers
- pass logs / players / moderation
- pass analytics
- pass live config / live events
- pass settings / docs / open source

## 9. Critere de sortie

Tu peux enregistrer quand ces 6 conditions sont vraies:

1. le setup validator est vert
2. au moins un serveur est live
3. les logs ont des evenements recents
4. les analytics ont des graphiques non vides
5. les pages players et moderation racontent une histoire utile
6. aucun secret sensible n'apparait sans controle

# RblxDash Creator Kit

Ce dossier contient tout ce qu'il faut pour produire:

1. une video de presentation du produit
2. un tutoriel complet sur le produit

## Fichiers

- `demo-staging-checklist.md`
  Checklist commune pour preparer le produit, les donnees, Roblox Studio et l'environnement d'enregistrement.

- `video-presentation-kit.md`
  Angle marketing, structure, shot list, script voix, cut court pour landing page, titres, CTA et conseils de montage.

- `real-user-tutorial-kit.md`
  Tutoriel principal en anglais, pense comme un vrai parcours utilisateur de premiere prise en main.

- `real-user-tutorial-teleprompter.md`
  Script anglais pret a lire pour le tutoriel centre sur l'experience d'un vrai utilisateur.

- `complete-tutorial-kit.md`
  Variante technique en anglais, plus orientee integration dans le code du jeu.

- `tutorial-faq-and-troubleshooting.md`
  FAQ technique en anglais, problemes frequents, reponses courtes a copier-coller pour commentaires, support et onboarding.

- `technical-tutorial-teleprompter.md`
  Script anglais pret a lire pendant la voix off du tutoriel technique.

- `assets/`
  Captures d'ecran et medias utilises pour la communication et les tutoriels.

- `../../examples/roblox-demo/`
  Fichiers Luau de demonstration a montrer dans Roblox Studio pendant le tutoriel.

## Message central a garder partout

RblxDash aide les developpeurs Roblox a gerer leur jeu au meme endroit, simplement et rapidement.

Les 4 preuves a montrer dans la video et dans le tutoriel:

1. l'installation de base est rapide
2. le produit donne de la visibilite live sur le jeu
3. les operations du jeu sont centralisees dans une seule interface
4. le projet est open-source et a vocation communautaire

## Workflow recommande

1. Completer `demo-staging-checklist.md`
2. Enregistrer un master demo propre avec `video-presentation-kit.md`
3. Couper une version courte de 60 a 90 secondes pour la landing page
4. Pour une premiere vraie video tuto, utiliser `real-user-tutorial-kit.md`
5. Utiliser `complete-tutorial-kit.md` seulement si tu veux une version plus dev et plus technique
6. Garder `tutorial-faq-and-troubleshooting.md` ouvert pendant la publication

## Regles de demo importantes

- Utilise un workspace de demo dedie.
- Utilise un jeu Roblox de demo publie et deja connecte.
- Ne montre pas un webhook secret, une API key ou un email personnel en clair.
- Si tu affiches un script embarquant un secret, utilise un environnement jetable puis rotate le secret apres la capture.
- Evite absolument les ecrans vides. Toutes les vues importantes doivent deja contenir des vraies donnees de demo.
- Pour la landing page, montre le produit avant de l'expliquer.

## Positionnement recommande

Utilise toujours une formulation proche de celle-ci:

> RblxDash is an open-source operations dashboard for Roblox games. It lets you run your game from one place, simply and quickly, with live visibility into health, players, logs, analytics, moderation, config, and events.

## Option de suite

Si tu veux ensuite produire une version anglaise complete pour YouTube, DevForum ou la landing page, tu peux reutiliser exactement la meme structure et simplement traduire les scripts.

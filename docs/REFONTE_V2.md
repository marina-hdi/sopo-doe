# DOE v2 – refonte proposée

## Objectif
Créer une version 2 plus claire, plus modulaire et plus simple à faire évoluer, sans casser la version actuelle.

## Problèmes de la version actuelle
- une seule page HTML très volumineuse
- CSS, logique UI, génération PDF, ZIP et sauvegarde mélangés
- lignes de matériel codées en dur
- maintenance difficile
- ajout de nouvelles fonctionnalités risqué

## Stratégie
1. conserver la version actuelle intacte
2. créer un shell `v2/` séparé
3. tester la nouvelle UX et la nouvelle structure
4. migrer ensuite la logique métier morceau par morceau

## Nouvelle architecture visée
- `v2/index.html`
- `v2/styles.css`
- `v2/app.js`
- `v2/` ensuite découpé en modules
  - `config/sections.js`
  - `modules/ui.js`
  - `modules/state.js`
  - `modules/storage.js`
  - `modules/pdf.js`
  - `modules/uploads.js`

## Fonctionnalités de la première itération v2
- sidebar
- workflow par étapes
- résumé de complétion
- ajout dynamique de lignes
- autosave local
- import/export JSON de brouillon
- templates de départ

## Étapes suivantes
### Phase 1
- brancher la vraie sauvegarde Supabase / Netlify
- brancher le chargement des DOE
- brancher la génération ZIP/PDF

### Phase 2
- transformer les matériels en configuration JS
- transformer les PV et schémas en configuration JS
- créer un vrai dashboard DOE enregistrés

### Phase 3
- statuts (brouillon / en cours / complet / généré)
- duplication d'un DOE
- notes internes
- filtres / recherche

## Règle de migration
On ne remplace pas brutalement `index.html`.
On valide d'abord le shell v2, puis on migre les blocs un par un.

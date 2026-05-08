# Frontend - Wall of Fame

Interface web du portail Wall of Fame.

## Stack

- Next.js 16.2.6
- React 19.2.6
- TypeScript
- Tailwind CSS 4
- Composants style shadcn
- Lucide React pour les icones

## Installation

Depuis le dossier `frontend`:

```bash
npm install
```

## Demarrage

```bash
npm run dev
```

Le frontend demarre sur:

```text
http://localhost:3000
```

L'API attendue par defaut est:

```text
http://localhost:4000
```

Pour changer l'URL de l'API:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Fonctionnalites UI

- Login email et mot de passe.
- Profil utilisateur avec role, departement, division et localisation.
- Navigation adaptee au role connecte.
- Recherche globale sur employees, nominations, commentaires et resultats.
- Refresh manuel des donnees.
- HOD:
  - creation de nomination;
  - selection agent;
  - mois et annee libres;
  - minimum deux commentaires requis;
  - ajout et retrait de commentaires;
  - suivi des categories couvertes;
  - vue nominations du departement;
  - election du meilleur employee;
  - historique des nominations et elections.
- HR Admin:
  - menu de boutons par fonctionnalite;
  - page dediee pour tous les nominees;
  - page dediee pour tous les commentaires;
  - page dediee pour l'export Excel;
  - page dediee pour l'historique Vodacom.
- HRBP:
  - menu de boutons par fonctionnalite;
  - page dediee pour les resultats du departement;
  - page dediee pour l'historique du departement;
  - page dediee pour l'arbitrage en cas d'ex aequo ou vacance ME.

## Comptes demo

Tous les comptes utilisent le mot de passe:

```text
password123
```

- `agent@vodacom.cd`
- `hod.sales@vodacom.cd`
- `hod.network@vodacom.cd`
- `hr.admin@vodacom.cd`
- `hrbp@vodacom.cd`

## Note design

Le theme visuel est rouge et blanc avec un fond corporate gris clair, sans grille decorative. Les surfaces principales utilisent des cartes sobres, des bordures legeres et des actions claires par role.

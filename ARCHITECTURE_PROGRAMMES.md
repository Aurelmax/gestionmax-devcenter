# Architecture de Navigation - Programmes

## Structure actuelle

### 1. Navigation dans le Sidebar

**Fichier** : `/src/components/layouts/Sidebar.tsx`
**Configuration** : `/src/config/navigation.ts`

```
Sidebar
└── Section "Avant la formation" (RNQ 1.2 - 1.4)
    └── Item "Programmes"
        └── href: /dashboard/programmes
            └── icon: BookOpen
            └── description: "Programmes de formation (Catalogue et Sur-mesure)"
```

### 2. Structure des routes

```
/dashboard/programmes (page hub)
├── /dashboard/programmes-catalogue (liste)
├── /dashboard/programmes-sur-mesure (liste)
├── /dashboard/programmes/[id] (détail)
├── /dashboard/programmes/[id]/edit (édition)
├── /dashboard/programmes/nouveau (création catalogue)
└── /dashboard/programmes/nouveau-personnalise (création sur-mesure)
```

### 3. Flux de navigation actuel

```
Utilisateur clique sur "Programmes" dans Sidebar
    ↓
Redirige vers /dashboard/programmes (page hub)
    ↓
Page hub affiche 2 cartes :
    ├── "Programmes Catalogue" → /dashboard/programmes-catalogue
    └── "Programmes Sur-mesure" → /dashboard/programmes-sur-mesure
```

## Problème potentiel identifié

### Issue : Navigation à deux niveaux

**Problème** :
- Le menu Sidebar a un seul item "Programmes" qui pointe vers une page hub
- L'utilisateur doit faire un clic supplémentaire pour accéder aux listes
- Pas d'accès direct depuis le menu vers "Programme Catalogue" ou "Programme Sur-Mesure"

**Impact** :
- UX moins fluide (2 clics au lieu de 1)
- Pas de navigation directe depuis le menu
- Structure moins intuitive pour les utilisateurs fréquents

## Solutions possibles

### Option 1 : Sous-menu déroulant dans le Sidebar

Transformer l'item "Programmes" en accordéon avec sous-items :

```
Sidebar
└── Section "Avant la formation"
    └── Accordion "Programmes" (expandable)
        ├── "Programmes Catalogue" → /dashboard/programmes-catalogue
        └── "Programmes Sur-mesure" → /dashboard/programmes-sur-mesure
```

**Avantages** :
- Accès direct depuis le menu
- Structure claire et hiérarchique
- Cohérent avec la structure actuelle (autres sections utilisent des accordéons)

**Inconvénients** :
- Nécessite modification du composant Sidebar
- Peut rendre le menu plus long

### Option 2 : Deux items séparés dans le menu

Ajouter deux items distincts dans la section "Avant la formation" :

```
Sidebar
└── Section "Avant la formation"
    ├── "Programmes Catalogue" → /dashboard/programmes-catalogue
    └── "Programmes Sur-mesure" → /dashboard/programmes-sur-mesure
```

**Avantages** :
- Accès direct et immédiat
- Simple à implémenter
- Pas de clic supplémentaire

**Inconvénients** :
- Perd la notion de "hub" central
- Peut encombrer le menu si beaucoup d'items

### Option 3 : Garder le hub mais améliorer la navigation

Conserver la page hub mais ajouter des raccourcis dans le Sidebar :

```
Sidebar
└── Section "Avant la formation"
    ├── "Programmes" → /dashboard/programmes (hub)
    ├── "→ Catalogue" → /dashboard/programmes-catalogue (raccourci)
    └── "→ Sur-mesure" → /dashboard/programmes-sur-mesure (raccourci)
```

**Avantages** :
- Conserve la page hub (utile pour nouveaux utilisateurs)
- Ajoute des raccourcis pour utilisateurs fréquents
- Meilleur des deux mondes

**Inconvénients** :
- Peut créer de la confusion (deux chemins vers la même destination)
- Menu plus long

## Recommandation

**Option 1 (Sous-menu déroulant)** semble la meilleure solution car :
1. ✅ Cohérent avec la structure actuelle (accordéons déjà utilisés)
2. ✅ Accès direct sans perdre la hiérarchie
3. ✅ UX améliorée (1 clic au lieu de 2)
4. ✅ Structure claire et organisée

## Fichiers à modifier

1. `/src/config/navigation.ts` : Modifier la structure de l'item "Programmes"
2. `/src/components/layouts/Sidebar.tsx` : Adapter le rendu pour supporter les sous-items
3. Optionnel : Créer un type `NavigationItemWithChildren` pour les items avec sous-menus

## Structure proposée (Option 1)

```typescript
{
  name: 'Programmes',
  href: '/dashboard/programmes', // Page hub (fallback)
  icon: BookOpen,
  description: 'Programmes de formation',
  children: [
    {
      name: 'Programmes Catalogue',
      href: '/dashboard/programmes-catalogue',
      icon: BookOpen,
      description: 'Formations standards et réutilisables',
    },
    {
      name: 'Programmes Sur-mesure',
      href: '/dashboard/programmes-sur-mesure',
      icon: UserCheck,
      description: 'Formations personnalisées par apprenant',
    },
  ],
}
```

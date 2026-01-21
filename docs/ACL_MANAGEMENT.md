# Access Control Lists (ACLs) - Gestion des permissions

## Vue d'ensemble

L'application utilise **Payload CMS** pour gérer les ACLs avec un système de **rôles hiérarchiques** basé sur trois niveaux :

- **`admin`** : Accès complet à toutes les fonctionnalités
- **`editor`** : Gestion de contenu (produits, catégories, médias)
- **`user`** : Utilisateur standard (lecture publique, gestion de son propre compte)

---

## Architecture des ACLs

### Structure des fichiers

```
src/access/
├── admin.ts          # Contrôles d'accès admin
├── anyone.ts         # Accès public et authentifié
├── editor.ts         # Contrôles d'accès editor
├── checkRole.ts      # Helpers de vérification de rôles
└── index.ts          # Exports centralisés
```

### Hiérarchie des rôles

```
admin > editor > user
```

**Règle importante** : Les admins ont automatiquement accès à toutes les permissions des rôles inférieurs.

---

## Types d'accès disponibles

### 1. Accès public (`anyone`)

**Fichier** : `src/access/anyone.ts`

```typescript
export const anyone: Access = () => true;
```

**Utilisation** :
- Lecture de produits, catégories, médias (boutique e-commerce)
- Lecture des profils utilisateurs publics
- Création de comptes utilisateurs (inscription)

**Collections utilisant `anyone`** :
- `Products` : `read: anyone`
- `Categories` : `read: anyone`
- `Media` : `read: anyone`
- `Users` : `read: anyone`, `create: anyone`

### 2. Accès authentifié (`authenticated`)

**Fichier** : `src/access/anyone.ts`

```typescript
export const authenticated: Access = ({ req: { user } }) => {
  return !!user;
};
```

**Utilisation** :
- Opérations nécessitant une authentification (token JWT valide)
- Création de contenu par utilisateurs authentifiés

### 3. Accès admin (`adminOnly`)

**Fichier** : `src/access/admin.ts`

```typescript
export const adminOnly: Access = ({ req: { user } }) => {
  return checkRole(['admin'], user);
};
```

**Utilisation** :
- Suppression de ressources
- Gestion des utilisateurs
- Configuration système
- Accès aux données sensibles (RGPD)

**Collections utilisant `adminOnly`** :
- `Users` : `delete: adminOnly`, `admin: adminAccess`
- `Products` : `delete: adminOnly`
- `Categories` : `delete: adminOnly`
- `Variants` : `delete: adminOnly`
- `Orders` : `update: adminOnly`, `delete: adminOnly`
- `Customers` : `read: adminOnly`, `create: adminOnly`, `update: adminOnly`, `delete: adminOnly`

### 4. Accès editor (`editorAccess`)

**Fichier** : `src/access/editor.ts`

```typescript
export const editorAccess: Access = ({ req: { user } }) => {
  return checkRole(['admin', 'editor'], user);
};
```

**Utilisation** :
- Création et modification de contenu (produits, catégories, médias)
- Gestion du catalogue e-commerce

**Collections utilisant `editorAccess`** :
- `Products` : `create: editorAccess`, `update: editorAccess`
- `Categories` : `create: editorAccess`, `update: editorAccess`
- `Variants` : `create: editorAccess`, `update: editorAccess`
- `Media` : `create: editorAccess`, `update: editorAccess`

### 5. Accès admin ou propriétaire (`adminOrSelf`)

**Fichier** : `src/access/admin.ts`

```typescript
export const adminOrSelf: Access = ({ req: { user }, id }) => {
  if (!user) return false;
  
  if (checkRole(['admin'], user)) {
    return true;
  }
  
  return user.id === id;
};
```

**Utilisation** :
- Modification de profils utilisateurs
- Gestion de paniers utilisateurs
- Accès aux ressources personnelles

**Collections utilisant `adminOrSelf`** :
- `Users` : `update: adminOrSelf`
- `Carts` : `update: adminOrSelf`, `delete: adminOrSelf`

### 6. Accès editor ou propriétaire (`editorOrSelf`)

**Fichier** : `src/access/editor.ts`

```typescript
export const editorOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false;
  
  if (checkRole(['admin', 'editor'], user)) {
    return true;
  }
  
  return {
    createdBy: { equals: user.id },
  };
};
```

**Utilisation** :
- Modification de contenu créé par l'utilisateur
- Gestion de ses propres ressources

---

## Contrôles d'accès par collection

### Users

```typescript
access: {
  read: anyone,              // Lecture publique (profils)
  create: anyone,            // Inscription publique
  update: adminOrSelf,       // Admin ou propriétaire
  delete: adminOnly,         // Admin uniquement
  admin: adminAccess,        // Panel admin Payload
}
```

**Champ `role`** :
- `read: hasRoleFieldAccess(['admin'])` - Seuls admins peuvent voir les rôles
- `create: hasRoleFieldAccess(['admin'])` - Seuls admins peuvent créer avec un rôle
- `update: hasRoleFieldAccess(['admin'])` - Seuls admins peuvent modifier les rôles
- Protection via hook `protectRole` pour empêcher l'escalade de privilèges

### Products

```typescript
access: {
  read: anyone,              // Public (boutique)
  create: editorAccess,     // Editors + admins
  update: editorAccess,     // Editors + admins
  delete: adminOnly,        // Admin uniquement
}
```

### Categories

```typescript
access: {
  read: anyone,              // Public
  create: editorAccess,     // Editors + admins
  update: editorAccess,     // Editors + admins
  delete: adminOnly,        // Admin uniquement
}
```

### Variants

```typescript
access: {
  read: anyone,              // Public
  create: editorAccess,     // Editors + admins
  update: editorAccess,     // Editors + admins
  delete: adminOnly,        // Admin uniquement
}
```

### Media

```typescript
access: {
  read: anyone,              // Images publiques
  create: editorAccess,     // Editors + admins
  update: editorAccess,     // Editors + admins
  delete: adminOnly,        // Admin uniquement
}
```

### Orders

```typescript
access: {
  read: orderReadAccess,    // RGPD : Filtré par ownership
  create: () => true,       // Stripe webhooks (pas de user context)
  update: adminOnly,        // Seuls admins peuvent modifier
  delete: adminOnly,        // Seuls admins peuvent supprimer
}
```

**`orderReadAccess`** :
- Admins : voient toutes les commandes
- Users : voient uniquement leurs propres commandes (filtré par `customer`)

### Customers

```typescript
access: {
  read: adminOnly,          // RGPD : PII sensibles
  create: adminOnly,        // Création admin uniquement
  update: adminOnly,        // Modification admin uniquement
  delete: adminOnly,        // Suppression admin uniquement
}
```

**Note RGPD** : Les données clients (emails, téléphones, adresses) sont strictement réservées aux admins.

### Carts

```typescript
access: {
  read: ({ req: { user } }) => {
    if (!user) return true;  // Lecture anonyme (sessionId)
    if (user.role === 'admin') return true;
    return { user: { equals: user.id } };  // Filtre par propriétaire
  },
  create: () => true,       // Tout le monde (anonymes + users)
  update: adminOrSelf,      // Admin ou propriétaire
  delete: adminOrSelf,      // Admin ou propriétaire
}
```

---

## Contrôles d'accès au niveau champ (Field-level)

### Exemple : Champ `role` dans Users

```typescript
{
  name: 'role',
  type: 'select',
  access: {
    read: hasRoleFieldAccess(['admin']),    // Seuls admins peuvent voir
    create: hasRoleFieldAccess(['admin']),  // Seuls admins peuvent créer
    update: hasRoleFieldAccess(['admin']),  // Seuls admins peuvent modifier
  },
  hooks: {
    beforeChange: [protectRole],  // Protection contre l'escalade
  },
}
```

**Protection** : Le hook `protectRole` empêche les utilisateurs non-admin de modifier leur propre rôle.

---

## Helpers de vérification

### `checkRole()`

**Fichier** : `src/access/checkRole.ts`

```typescript
export const checkRole = (
  allRoles: Array<'admin' | 'editor' | 'user'> = [],
  user?: User | null
): boolean => {
  if (!user) return false;
  
  const userRole = user.role;
  
  // Admin a tous les droits (hiérarchie)
  if (userRole === 'admin') return true;
  
  // Vérifier si le rôle de l'utilisateur est dans la liste autorisée
  return allRoles.includes(userRole);
};
```

**Comportement** :
- Si l'utilisateur est `admin`, retourne toujours `true`
- Sinon, vérifie si le rôle de l'utilisateur est dans la liste autorisée

### `hasRole()`

**Fichier** : `src/access/checkRole.ts`

```typescript
export const hasRole = (
  roles: Array<'admin' | 'editor' | 'user'> = []
): Access => {
  return ({ req: { user } }) => {
    return checkRole(roles, user);
  };
};
```

**Utilisation** : Helper pour créer des access controls basés sur les rôles.

### `hasRoleFieldAccess()`

**Fichier** : `src/access/checkRole.ts`

```typescript
export const hasRoleFieldAccess = (
  roles: Array<'admin' | 'editor' | 'user'> = []
): FieldAccess => {
  return ({ req: { user } }) => {
    return checkRole(roles, user);
  };
};
```

**Utilisation** : Helper pour les contrôles d'accès au niveau champ.

---

## Sécurité et protection

### Protection contre l'escalade de privilèges

**Hook** : `src/hooks/protectRoleField.ts`

Le hook `protectRole` empêche :
- Les utilisateurs non-admin de modifier leur propre rôle
- Les utilisateurs de s'auto-promouvoir en admin

### Lockout de connexion

**Fichier** : `src/collections/Users.ts`

```typescript
auth: {
  maxLoginAttempts: process.env.NODE_ENV === 'production' ? 10 : 0,
  lockTime: process.env.NODE_ENV === 'production' ? 120000 : 0,
}
```

- **Production** : 10 tentatives max, 2 minutes de lockout
- **Développement** : Lockout désactivé

### RGPD et données sensibles

**Collections protégées** :
- `Customers` : Accès admin uniquement (PII sensibles)
- `Orders` : Filtrage par ownership (users voient uniquement leurs commandes)

---

## Exemples d'utilisation

### Créer un nouvel access control

```typescript
// src/access/custom.ts
import { Access } from 'payload/types';
import { checkRole } from './checkRole';

export const customAccess: Access = ({ req: { user }, id }) => {
  if (!user) return false;
  
  // Admins ont accès complet
  if (checkRole(['admin'], user)) {
    return true;
  }
  
  // Editors peuvent accéder à certaines ressources
  if (checkRole(['editor'], user)) {
    return { /* query de filtrage */ };
  }
  
  return false;
};
```

### Utiliser dans une collection

```typescript
import { customAccess } from '../access/custom';

const MyCollection: CollectionConfig = {
  slug: 'my-collection',
  access: {
    read: customAccess,
    create: editorAccess,
    update: editorAccess,
    delete: adminOnly,
  },
  // ...
};
```

---

## Bonnes pratiques

1. **Principe du moindre privilège** : Accorder uniquement les permissions nécessaires
2. **Hiérarchie des rôles** : Utiliser la hiérarchie admin > editor > user
3. **Protection des données sensibles** : RGPD pour Customers, Orders
4. **Field-level access** : Protéger les champs sensibles (comme `role`)
5. **Hooks de protection** : Empêcher l'escalade de privilèges
6. **Tests** : Tester les ACLs pour chaque collection et rôle

---

## Résumé des permissions par rôle

| Collection | Action | Admin | Editor | User | Public |
|------------|--------|-------|--------|------|--------|
| **Users** | Read | ✅ | ✅ | ✅ | ✅ |
| | Create | ✅ | ✅ | ✅ | ✅ |
| | Update | ✅ (all) | ❌ | ✅ (self) | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| **Products** | Read | ✅ | ✅ | ✅ | ✅ |
| | Create | ✅ | ✅ | ❌ | ❌ |
| | Update | ✅ | ✅ | ❌ | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| **Categories** | Read | ✅ | ✅ | ✅ | ✅ |
| | Create | ✅ | ✅ | ❌ | ❌ |
| | Update | ✅ | ✅ | ❌ | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| **Orders** | Read | ✅ (all) | ❌ | ✅ (own) | ❌ |
| | Create | ✅ | ❌ | ❌ | ✅ (webhook) |
| | Update | ✅ | ❌ | ❌ | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| **Customers** | All | ✅ | ❌ | ❌ | ❌ |
| **Carts** | Read | ✅ (all) | ❌ | ✅ (own) | ✅ (sessionId) |
| | Create | ✅ | ✅ | ✅ | ✅ |
| | Update | ✅ (all) | ❌ | ✅ (own) | ❌ |
| | Delete | ✅ (all) | ❌ | ✅ (own) | ❌ |

---

## Références

- **Payload CMS Access Control** : https://payloadcms.com/docs/access-control/overview
- **Fichiers sources** : `src/access/` et `src/collections/`
- **Hooks de protection** : `src/hooks/protectRoleField.ts`

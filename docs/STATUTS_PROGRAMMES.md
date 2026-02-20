# Gestion des Statuts - Programmes Catalogue vs Personnalisés

## Vue d'ensemble

Les programmes de formation ont deux types distincts avec des systèmes de statuts différents, car ils répondent à des besoins métier différents :

- **Programmes Catalogue** : Formations standards destinées à être **publiées en ligne**
- **Programmes Personnalisés** : Formations sur-mesure destinées à être **partagées** avec des parties prenantes spécifiques

---

## 📚 Programmes Catalogue

### Concept : Publication en ligne

Les programmes catalogue sont conçus pour être **publiés sur le site web public** et visibles par tous les visiteurs. Le système de statuts reflète un workflow de **publication**.

### Statuts disponibles

```typescript
type StatutPublication = 
  | 'BROUILLON'        // 📝 En cours de rédaction
  | 'EN_REVISION'      // 👀 En cours de révision
  | 'PUBLIE'           // ✅ Publié en ligne (visible publiquement)
  | 'ARCHIVE'          // 📦 Archivé (non visible)
```

### Champ associé : `statutPublication`

```typescript
interface ProgrammeCatalogue {
  statutPublication: StatutPublication
  shareable: boolean  // Permet le partage via lien (optionnel)
  datePublication?: string
}
```

### Logique métier

- **BROUILLON** : Le programme est en cours de création, non visible publiquement
- **EN_REVISION** : Le programme est en cours de révision avant publication
- **PUBLIE** : Le programme est **publié en ligne** et visible sur le site public
- **ARCHIVE** : Le programme n'est plus publié mais conservé pour historique

### Partage

Le champ `shareable` permet de générer un lien de partage pour le programme, mais cela est **indépendant** du statut de publication. Un programme peut être publié ET partageable.

---

## 🎯 Programmes Personnalisés

### Concept : Partage avec parties prenantes

Les programmes personnalisés sont conçus pour être **partagés** avec des parties prenantes spécifiques (apprenant, formateur, financeur, etc.). Ils **ne sont PAS publiés en ligne** car ils sont spécifiques à un apprenant.

### Statuts disponibles

```typescript
type StatutPersonnalise = 
  | 'BROUILLON'              // 📝 En cours de préparation
  | 'EN_ATTENTE_VALIDATION'  // ⏳ En attente de validation
  | 'VALIDE'                 // ✅ Validé, prêt à être partagé
  | 'EN_COURS'               // 🎓 Formation en cours
  | 'FINALISE'               // ✔️ Formation terminée
  | 'LIVRE'                  // 📦 Livré à l'apprenant
  | 'ARCHIVE'                // 📦 Archivé
```

### Champ associé : `statut`

```typescript
interface ProgrammePersonnalise {
  statut: StatutPersonnalise
  shareable?: boolean      // Permet le partage avec l'apprenant/parties prenantes
  tokenPartage?: string    // Token sécurisé pour le partage
}
```

### Logique métier

- **BROUILLON** : Le programme est en cours de création
- **EN_ATTENTE_VALIDATION** : Le programme attend validation avant d'être partagé
- **VALIDE** : Le programme est validé et peut être **partagé** avec l'apprenant
- **EN_COURS** : La formation est en cours
- **FINALISE** : La formation est terminée
- **LIVRE** : Le programme a été livré à l'apprenant (certificats, documents, etc.)
- **ARCHIVE** : Le programme est archivé

### Partage

Le champ `shareable` indique si le programme peut être **partagé** avec l'apprenant ou d'autres parties prenantes via un lien sécurisé (`tokenPartage`). 

**Important** : Pour les programmes personnalisés, le concept de "partage" remplace celui de "publication". Un programme personnalisé n'est jamais "publié en ligne", mais peut être "partagé" avec des personnes spécifiques.

---

## 🔄 Différences clés

| Aspect | Programmes Catalogue | Programmes Personnalisés |
|--------|---------------------|-------------------------|
| **Objectif** | Publication publique en ligne | Partage avec parties prenantes |
| **Visibilité** | Site web public | Privé, partagé via lien |
| **Statut principal** | `statutPublication` | `statut` |
| **Workflow** | Publication → Archive | Validation → Partage → Livraison |
| **Concept clé** | **PUBLICATION** | **PARTAGE** |

---

## 💡 Implications pour le développement

### 1. Filtres et recherche

- **Catalogue** : Filtrer par `statutPublication` (PUBLIE pour afficher les programmes publics)
- **Personnalisés** : Filtrer par `statut` (VALIDE pour afficher les programmes partageables)

### 2. Affichage dans l'UI

- **Catalogue** : Afficher le badge "Publié" quand `statutPublication === 'PUBLIE'`
- **Personnalisés** : Afficher le badge "Partagé" quand `shareable === true` et `statut === 'VALIDE'` ou supérieur

### 3. Actions disponibles

- **Catalogue** : 
  - "Publier" → Change `statutPublication` à `PUBLIE`
  - "Partager" → Génère un lien si `shareable === true`
  
- **Personnalisés** :
  - "Valider" → Change `statut` à `VALIDE`
  - "Partager" → Génère un lien sécurisé si `shareable === true`

### 4. API Routes

Les routes API doivent respecter cette distinction :
- `/api/programmes-catalogue` : Gère `statutPublication`
- `/api/programmes-personnalises` : Gère `statut` (pas de concept de publication)

---

## 📝 Recommandations

1. **Ne pas mélanger les concepts** : Un programme personnalisé ne devrait jamais avoir de `statutPublication`
2. **Clarifier dans l'UI** : Utiliser des libellés différents ("Publié" vs "Partagé")
3. **Documenter les workflows** : Expliquer clairement la différence aux utilisateurs
4. **Valider côté backend** : S'assurer que les champs sont cohérents avec le type de programme

---

## 🔍 Exemples d'utilisation

### Programme Catalogue publié et partageable

```typescript
const programmeCatalogue: ProgrammeCatalogue = {
  _type: 'catalogue',
  statutPublication: 'PUBLIE',  // ✅ Publié en ligne
  shareable: true,              // ✅ Peut être partagé via lien
  // ...
}
```

### Programme Personnalisé validé et partageable

```typescript
const programmePersonnalise: ProgrammePersonnalise = {
  _type: 'personnalise',
  statut: 'VALIDE',             // ✅ Validé, prêt à être partagé
  shareable: true,              // ✅ Peut être partagé avec l'apprenant
  tokenPartage: 'abc123...',    // ✅ Token de partage généré
  // ...
}
```

---

## ✅ Conclusion

La différence fondamentale est :
- **Catalogue** = Publication publique en ligne (statuts orientés publication)
- **Personnalisés** = Partage privé avec parties prenantes (statuts orientés workflow de formation)

Cette distinction doit être respectée dans toute la logique métier et l'interface utilisateur.

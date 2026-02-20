# Guide de Démarrage Rapide - Refactorisation Multi-Projets

## 🎯 Objectif

Refactoriser la gestion des projets pour une architecture propre et scalable, **sans casser l'existant**.

## 📋 Résumé Exécutif

### Problème Actuel
- État global mélangé dans `Dashboard.tsx`
- Logique métier dispersée
- Pas de contexte isolé pour le projet actif
- Code dupliqué pour l'activation/désactivation

### Solution Proposée
- **ProjectContext** : Contexte React pour isoler l'état du projet actif
- **ServiceManager** : Classe pour gérer les services par projet
- **Hooks réutilisables** : `useActiveProject`, `useProjectServices`
- **Migration progressive** : Pas de breaking changes

---

## 🚀 Démarrage Immédiat

### Étape 1 : Créer la Structure de Base (5 min)

```bash
mkdir -p src/core/projects
mkdir -p src/core/services
```

### Étape 2 : Créer les Fichiers de Base

Les fichiers suivants sont déjà créés :
- ✅ `src/core/projects/project.types.ts`
- 📝 `src/core/projects/project.context.tsx` (à créer)
- 📝 `src/core/services/service.manager.ts` (à créer)

### Étape 3 : Intégration Minimale

**Modifier `src/App.tsx`** :

```typescript
import { ProjectProvider } from "./core/projects/project.context";

export default function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        {/* ... reste inchangé */}
      </BrowserRouter>
    </ProjectProvider>
  );
}
```

**✅ À ce stade** : L'app fonctionne toujours, aucun changement visible.

---

## 📝 Liste des Fichiers à Modifier (Par Priorité)

### Priorité 1 : Infrastructure (Sans Impact UI)
1. ✅ `src/core/projects/project.types.ts` - **CRÉÉ**
2. 📝 `src/core/projects/project.context.tsx` - **À CRÉER**
3. 📝 `src/App.tsx` - **À MODIFIER** (ajouter Provider)

### Priorité 2 : Migration Dashboard
4. 📝 `src/pages/Dashboard.tsx` - **À MODIFIER** (remplacer useState par contexte)
5. 📝 `src/core/projects/useActiveProject.ts` - **À CRÉER** (hook helper)

### Priorité 3 : Services
6. 📝 `src/core/services/service.manager.ts` - **À CRÉER**
7. 📝 `src/core/services/useProjectServices.ts` - **À CRÉER**

### Priorité 4 : Nettoyage
8. 📝 `src/core/projects/project.selectors.ts` - **À CRÉER**
9. 📝 Supprimer code dupliqué dans `Dashboard.tsx`

---

## 🔍 Code Smell Identifiés

### 1. Duplication de Logique d'Activation
**Fichier** : `src/pages/Dashboard.tsx` (lignes 215-289)
**Problème** : `handleToggleEnabled` fait trop de choses
**Solution** : Extraire dans `ProjectContext.activateProject()`

### 2. État Global Mélangé
**Fichier** : `src/pages/Dashboard.tsx` (lignes 79-80)
**Problème** : `projects` et `active` gérés localement
**Solution** : Utiliser `ProjectContext`

### 3. Vérifications Répétées
**Fichier** : `src/pages/Dashboard.tsx` (ligne 409)
**Problème** : `project.enabled !== false` répété partout
**Solution** : Sélecteur `projectSelectors.isActive()`

### 4. Logique Métier dans UI
**Fichier** : `src/pages/Dashboard.tsx` (lignes 458-514)
**Problème** : `handleStartAll` contient la logique métier
**Solution** : Extraire dans `ServiceManager.startAll()`

---

## 📊 Métriques de Succès

### Avant Refactorisation
- **Lignes dans Dashboard.tsx** : ~830 lignes
- **Fonctions dans Dashboard.tsx** : 8 fonctions
- **État local** : 5 useState
- **Logique métier** : Dispersée dans les composants

### Après Refactorisation (Cible)
- **Lignes dans Dashboard.tsx** : ~400 lignes (-50%)
- **Fonctions dans Dashboard.tsx** : 3 fonctions (-60%)
- **État local** : 0 useState (tout dans le contexte)
- **Logique métier** : Centralisée dans `ServiceManager` et `ProjectContext`

---

## ⚠️ Points d'Attention

1. **Ne pas tout changer d'un coup** : Migration progressive
2. **Tester à chaque étape** : Vérifier que l'UI fonctionne
3. **Garder l'ancien code** : Jusqu'à validation du nouveau
4. **Pas de breaking changes** : L'API publique reste la même

---

## 🎓 Exemple Concret : Migration d'une Fonction

### AVANT (Dashboard.tsx)
```typescript
const handleToggleEnabled = async (project: ProjectV3) => {
  try {
    const config = await loadProjectsV3();
    const projectList = config.projects || [];
    
    if (project.enabled) {
      // Désactiver ce projet
      const updatedProject = { ...project, enabled: false };
      await updateProjectV3(updatedProject);
      
      // Arrêter tous les services...
      // ... 30+ lignes de code
    } else {
      // Activer ce projet (désactiver les autres)
      // ... 40+ lignes de code
    }
    
    await loadProjects();
  } catch (error) {
    // Gestion d'erreur
  }
};
```

### APRÈS (Dashboard.tsx)
```typescript
const { activateProject, deactivateProject } = useProjectContext();

const handleToggleEnabled = async (project: ProjectV3) => {
  if (project.enabled) {
    await deactivateProject(project.id);
  } else {
    await activateProject(project.id);
  }
};
```

**Réduction** : De ~70 lignes à 5 lignes (-93%)

---

## 📚 Ressources

- **Plan Complet** : `docs/REFACTORING_PLAN.md`
- **Types** : `src/core/projects/project.types.ts`
- **Contexte** : `src/core/projects/project.context.tsx` (à créer)

---

## ✅ Checklist de Validation

Après chaque phase, vérifier :

- [ ] L'app démarre sans erreur
- [ ] Le Dashboard affiche les projets
- [ ] L'activation/désactivation fonctionne
- [ ] Les services démarrent/arrêtent correctement
- [ ] Aucune régression visuelle

---

## 🚦 Statut Actuel

- ✅ **Phase 1** : Types créés
- 📝 **Phase 2** : Contexte à créer
- 📝 **Phase 3** : Migration Dashboard
- 📝 **Phase 4** : Nettoyage

**Prochaine Étape** : Créer `project.context.tsx` et l'intégrer dans `App.tsx`

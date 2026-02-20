# Statut : Project Switcher Simple

## ✅ Étape 1 : RuntimeState + switchProject Atomique - TERMINÉE

### Fichiers Créés

1. ✅ **`src/core/runtime/runtime.types.ts`**
   - Types pour `RuntimeState`
   - Types pour `ProjectStatus` et `ProjectRuntime`
   - Types pour `RuntimeContextValue`

2. ✅ **`src/core/runtime/switchProject.ts`**
   - Fonction atomique `switchProject()` avec logique complète
   - Fonctions `startProject()` et `stopProject()`
   - Gestion des erreurs et transitions d'état

3. ✅ **`src/core/runtime/runtime.store.tsx`**
   - `RuntimeProvider` : Provider React pour gérer l'état runtime
   - `useRuntime()` : Hook pour accéder au contexte
   - Fonction `refreshStatus()` pour poller les statuts réels
   - Verrou mutex (`switching`) pour empêcher les races

4. ✅ **`src/components/ProjectSwitcher.tsx`**
   - Composant UI simple : liste de projets + bouton Start/Stop
   - Affichage clair du projet actif
   - Indication des statuts (STARTING, RUNNING, STOPPING, ERROR)
   - Désactivation pendant les transitions

5. ✅ **`src/App.tsx`**
   - Intégration du `RuntimeProvider`
   - Chargement des projets au démarrage

### Tests de Validation

- ✅ Compilation TypeScript : **PAS D'ERREURS**
- ✅ Linter : **PAS D'ERREURS**
- ✅ Intégration : **RuntimeProvider ajouté dans App.tsx**
- ⚠️ Tests fonctionnels : **À FAIRE** (l'app doit fonctionner normalement)

### Fonctionnalités Implémentées

- ✅ **Verrou mutex** : Empêche les switches simultanés
- ✅ **Switch atomique** : Stop A → Start B automatique
- ✅ **Gestion des états** : STARTING, RUNNING, STOPPING, ERROR
- ✅ **UI simple** : Bouton Start/Stop par projet
- ✅ **Indication claire** : Badge "ACTIF" pour le projet actif

---

## 📝 Étape 2 : Intégrer dans Dashboard - EN ATTENTE

### Prochaines Étapes

1. **Modifier `src/pages/Dashboard.tsx`**
   - Remplacer la logique complexe par `ProjectSwitcher`
   - Utiliser `useRuntime()` pour les actions
   - Simplifier l'affichage

2. **Optionnel : Ajouter polling automatique**
   - Rafraîchir les statuts toutes les 2-3 secondes
   - Utiliser `refreshStatus()` dans un `useEffect`

### Estimation

- **Temps** : 20-30 minutes
- **Risque** : Faible (migration progressive)
- **Impact** : Réduction de ~50% du code dans Dashboard.tsx

---

## 📋 Checklist Globale

### Étape 1 : Infrastructure ✅
- [x] Créer `src/core/runtime/runtime.types.ts`
- [x] Créer `src/core/runtime/switchProject.ts`
- [x] Créer `src/core/runtime/runtime.store.tsx`
- [x] Créer `src/components/ProjectSwitcher.tsx`
- [x] Intégrer `RuntimeProvider` dans `App.tsx`
- [x] Vérifier compilation TypeScript
- [x] Vérifier linter

### Étape 2 : Migration Dashboard 📝
- [ ] Modifier `Dashboard.tsx` pour utiliser `ProjectSwitcher`
- [ ] Remplacer `handleToggleEnabled` par `switchProject`
- [ ] Ajouter polling automatique des statuts
- [ ] Tester le switch entre projets
- [ ] Vérifier qu'aucune régression visuelle

### Étape 3 : Nettoyage 📝
- [ ] Supprimer code obsolète dans Dashboard
- [ ] Neutraliser `ProjectContext` si non utilisé
- [ ] Optionnel : Rendre `enabled` optionnel dans ProjectV3
- [ ] Documentation finale

---

## 🎯 Résultat Attendu

### Avant
- Dashboard.tsx : ~830 lignes
- Logique complexe dispersée
- Pas de verrou
- État dupliqué (`enabled` + `active`)

### Après (Cible)
- Dashboard.tsx : ~400 lignes (-50%)
- Fonction atomique `switchProject`
- Verrou mutex
- État centralisé dans RuntimeState
- UI simple : liste + bouton Start/Stop

---

## 🚀 Prochaine Action

**Modifier `Dashboard.tsx`** pour utiliser `ProjectSwitcher` :

```typescript
// Remplacer la section projets par :
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { useRuntime } from "@/core/runtime/runtime.store";

// Dans le composant :
const { refreshStatus } = useRuntime();

// Dans le JSX :
<ProjectSwitcher projects={projects} />
```

---

**Dernière mise à jour** : Étape 1 terminée ✅

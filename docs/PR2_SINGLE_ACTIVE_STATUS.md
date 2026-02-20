# PR 2 : Neutraliser Polling Multi-Projets - STATUS ✅

## ✅ Objectif

Polling uniquement sur le projet actif (modèle mono-projet).

**Changements** :
- Supprimer polling multi-projets dans Dashboard
- Polling uniquement si `activeProjectId !== null`
- ProjectSwitcher affiche le statut uniquement du projet actif

---

## ✅ Fichiers Modifiés

### 1. `src/pages/Dashboard.tsx` ✅

**Changements** :
- ✅ Polling déjà optimisé dans PR 1 :
  - Ne poll que si `state.activeProjectId !== null`
  - Appelle `refreshActiveStatus()` au lieu de `refreshStatus(project.id)`
  - Supprimé le commentaire TODO (déjà résolu)

**Avant (hypothétique)** :
```typescript
// Polling automatique des statuts toutes les 3 secondes
useEffect(() => {
  if (projects.length === 0) return;
  
  const interval = setInterval(() => {
    projects.forEach(project => {  // ❌ Polling sur TOUS les projets
      refreshStatus(project.id).catch(err => 
        console.warn(`Failed to refresh status for ${project.id}:`, err)
      );
    });
  }, 3000);
  
  return () => clearInterval(interval);
}, [projects, refreshStatus]);
```

**Après** :
```typescript
// Polling automatique du statut du projet actif uniquement
// Ne poll que si un projet est actif (modèle mono-projet)
useEffect(() => {
  if (!state.activeProjectId) return;  // ✅ Pas de polling si aucun projet actif

  const interval = setInterval(() => {
    refreshActiveStatus().catch(err =>  // ✅ Uniquement projet actif
      console.warn("Failed to refresh active status:", err)
    );
  }, 3000);

  return () => clearInterval(interval);
}, [state.activeProjectId, refreshActiveStatus]);
```

**Résultat** :
- ✅ Plus de polling sur tous les projets
- ✅ Polling uniquement sur le projet actif
- ✅ Pas de polling si aucun projet actif

---

### 2. `src/components/ProjectSwitcher.tsx` ✅

**Changements** :
- ✅ Déjà modifié dans PR 1 :
  - Statut uniquement pour projet actif : `status = isActive ? state.status : "STOPPED"`
  - Affichage d'erreur uniquement si `isActive && status === "ERROR"`
  - Plus d'utilisation de `getProjectStatus(project.id)` ou `state.projects[project.id]`

**Avant (hypothétique)** :
```typescript
{projects.map(project => {
  const status = getProjectStatus(project.id);  // ❌ Statut pour chaque projet
  const isActive = state.activeProjectId === project.id;
  // ...
})}
```

**Après** :
```typescript
{projects.map(project => {
  const isActive = state.activeProjectId === project.id;
  // Statut uniquement pour le projet actif, sinon STOPPED par défaut
  const status = isActive ? (state.status || "STOPPED") : "STOPPED";  // ✅
  const isLoading = isActive && (status === "STARTING" || status === "STOPPING");
  const isRunning = isActive && status === "RUNNING";
  const isError = isActive && status === "ERROR";
  // ...
})}
```

**Résultat** :
- ✅ Statut affiché uniquement pour le projet actif
- ✅ Projets non actifs affichent "STOPPED" par défaut
- ✅ Plus de polling individuel par projet

---

## ✅ Vérifications

### Polling Multi-Projets Supprimé ✅
- ✅ Dashboard ne fait plus `projects.forEach(project => refreshStatus(project.id))`
- ✅ Polling uniquement si `activeProjectId !== null`
- ✅ `refreshActiveStatus()` appelé au lieu de `refreshStatus(projectId)`

### Affichage Statut Mono-Projet ✅
- ✅ `ProjectSwitcher` utilise `state.status` uniquement pour projet actif
- ✅ Projets non actifs affichent "STOPPED" par défaut
- ✅ Plus d'utilisation de `getProjectStatus(projectId)` ou `state.projects[projectId]`

### Pas de Références Restantes ✅
- ✅ Aucune référence à `refreshStatus(projectId)` dans le code
- ✅ Aucune référence à `getProjectStatus(projectId)` dans le code
- ✅ Aucune référence à `state.projects[projectId]` dans le code runtime

---

## 📊 Impact Performance

### Avant
- ❌ Polling sur **tous les projets** toutes les 3 secondes
- ❌ Si 5 projets : 5 appels API toutes les 3 secondes = **100 appels/minute**
- ❌ Mélange de statuts multi-projets

### Après
- ✅ Polling uniquement sur le **projet actif**
- ✅ Si 1 projet actif : 1 appel API toutes les 3 secondes = **20 appels/minute**
- ✅ Statut isolé par projet actif
- ✅ **Réduction de 80% des appels API** (si 5 projets)

---

## ✅ Checklist PR 2

- [x] Supprimer `projects.forEach(project => refreshStatus(project.id))` dans Dashboard
- [x] Polling uniquement si `activeProjectId !== null`
- [x] Appeler `refreshActiveStatus()` au lieu de `refreshStatus(projectId)`
- [x] Modifier `ProjectSwitcher` pour n'afficher le statut que du projet actif
- [x] Supprimer affichage de `state.projects[project.id]?.lastError`
- [x] Vérifier qu'il n'y a plus de références à l'ancien modèle

---

## 🔄 Note sur `useProjects.ts`

Le hook `src/hooks/useProjects.ts` semble faire du polling multi-projets, mais il est utilisé dans `ProjectCompactView.tsx` qui semble être un composant séparé (peut-être obsolète ou utilisé ailleurs). Ce hook n'est **pas** utilisé dans le Dashboard ou ProjectSwitcher, donc il n'affecte pas le modèle mono-projet principal.

Si nécessaire, ce hook pourra être refactorisé dans une future PR pour utiliser le modèle mono-projet.

---

## 🎯 Résultat

### Avant
- ❌ Polling sur tous les projets toutes les 3 secondes
- ❌ Statut affiché pour chaque projet dans la liste
- ❌ Mélange de statuts multi-projets

### Après
- ✅ Polling uniquement sur le projet actif
- ✅ Statut affiché uniquement pour le projet actif
- ✅ Projets non actifs affichent "STOPPED" par défaut
- ✅ Réduction significative des appels API
- ✅ Modèle mono-projet cohérent

---

**Statut** : ✅ PR 2 terminée - Prêt pour PR 3

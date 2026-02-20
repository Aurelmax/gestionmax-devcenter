# PR 2 : Wiring des Boutons Existants - STATUS

## ✅ Fichiers Créés

1. **`src/core/gmd/gmd.store.tsx`** ✅
   - Store React avec Context API
   - Verrou mutex (`commandInFlight`) pour séquentialiser les commandes
   - Fonction `runGmd()` qui appelle `run_gmd_command` Tauri
   - Gestion des logs (100 dernières lignes)
   - Gestion du projet actif (`activeProjectId`, `activeProjectPath`)

## ✅ Fichiers Modifiés

1. **`src/lib/commands.ts`** ✅
   - Ajout de `runGmdCommand()` qui expose le module `gmd` au frontend
   - Interface `GmdResult` exportée

2. **`src/core/runtime/switchProject.ts`** ✅
   - **AVANT** : Appelait `startServiceV3()` plusieurs fois (tunnel → backend → frontend)
   - **APRÈS** : Appelle `runGmdCommand(["up"], projectId, rootPath)` une seule fois
   - **AVANT** : Appelait `stopServiceV3()` plusieurs fois en parallèle
   - **APRÈS** : Appelle `runGmdCommand(["down"], projectId, rootPath)` une seule fois
   - Simplification majeure : `gmdev` gère l'ordre et les vérifications

3. **`src/App.tsx`** ✅
   - Ajout de `<GmdProvider>` autour de `<RuntimeProvider>`
   - Ordre : `ProjectProvider` → `GmdProvider` → `RuntimeProvider`

## 📋 Architecture

```
App.tsx
├── ProjectProvider (gestion projets)
├── GmdProvider (wrapper gmdev + verrou mutex + logs)
│   └── RuntimeProvider (état runtime + switchProject)
│       └── Routes (Dashboard, etc.)
```

**Flux de commande** :
1. `ProjectSwitcher` → `switchProject()` (via `useRuntime()`)
2. `switchProject()` → `runGmdCommand()` (depuis `@/lib/commands`)
3. `runGmdCommand()` → `invoke("run_gmd_command")` (Tauri IPC)
4. Tauri → `run_gmd()` (module `gmd.rs`)
5. `run_gmd()` → `gmdev` CLI

## 🎯 Résultat

- ✅ Les boutons Start/Stop utilisent maintenant `gmdev up` et `gmdev down`
- ✅ Plus besoin d'appeler `startServiceV3` plusieurs fois
- ✅ `gmdev` gère automatiquement l'ordre et les vérifications
- ✅ Code simplifié dans `switchProject.ts` (de ~150 lignes à ~80 lignes)
- ✅ Store GMD disponible pour utilisation future (logs, verrou mutex)

## 🔄 Prochaines Étapes (PR 3)

- [ ] Ajouter `run_gmd_stream()` dans `gmd.rs` pour logs live
- [ ] Créer `GmdLogs.tsx` pour afficher les logs
- [ ] Intégrer dans Dashboard
- [ ] Améliorer parsing status (vérifier `gmdev status --json`)

## ✅ Tests à Effectuer

1. ✅ Compilation TypeScript : OK (pas d'erreurs de lint)
2. ⏳ Tester Start/Stop via `gmdev up` et `gmdev down`
3. ⏳ Vérifier que le verrou mutex empêche les doubles clics
4. ⏳ Vérifier que le switch A → B fonctionne (stop A puis start B)

---

**Statut** : ✅ PR 2 terminée - Prêt pour tests

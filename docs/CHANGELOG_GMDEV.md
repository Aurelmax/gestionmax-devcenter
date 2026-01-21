# Changelog — Migration vers gmdev

## [2.0.0] - 2025-01-17

### 🎯 Évolution majeure : Migration vers gmdev comme runtime unique

Cette version représente une refonte majeure de l'architecture du DevCenter. Toutes les opérations runtime passent désormais exclusivement par `gmdev`, qui devient la seule source de vérité.

---

### ✨ Nouvelles fonctionnalités

#### Commandes Tauri

- **`restart_service_v3`** : Redémarre un service via `gmdev restart`
- **`get_gmdev_status`** : Obtient le statut complet via `gmdev status`
- **`get_gmdev_logs`** : Obtient les logs d'un service via `gmdev logs`

#### Intégration gmdev

- Détection automatique de `gmdev` au démarrage
- Mapping automatique des commandes vers `gmdev`
- Support complet de toutes les commandes `gmdev` :
  - `gmdev start tunnel|back|front`
  - `gmdev stop tunnel|back|front`
  - `gmdev restart tunnel|back|front`
  - `gmdev status`
  - `gmdev kill-zombies`
  - `gmdev logs <service> --tail N`

---

### 🔄 Changements majeurs

#### Architecture

- **AVANT** : DevCenter → Scripts shell (`tunnel-on.sh`, `backend-on.sh`, etc.)
- **APRÈS** : DevCenter → `gmdev` (CLI) → Services

#### Suppression des fallbacks

- ❌ Plus de fallback vers les scripts shell
- ❌ Les scripts shell ne sont plus utilisés par le DevCenter
- ✅ Si `gmdev` n'est pas disponible → erreur claire (pas de contournement)

#### Commandes modifiées

- **`start_service_v3`** : Appelle maintenant directement `gmdev start <service>`
- **`stop_service_v3`** : Appelle maintenant directement `gmdev stop <service>`
- **`status_service_v3`** : Utilise `gmdev status` (seule source de vérité)
- **`kill_zombies_v3`** : Utilise `gmdev kill-zombies` (seule source de vérité)

---

### 🗑️ Dépréciations

#### Scripts shell (obsolètes)

Les scripts suivants ne sont plus utilisés par le DevCenter :
- `tunnel-on.sh` → Remplacé par `gmdev start tunnel`
- `tunnel-off.sh` → Remplacé par `gmdev stop tunnel`
- `backend-on.sh` → Remplacé par `gmdev start back`
- `backend-off.sh` → Remplacé par `gmdev stop back`
- `frontend-on.sh` → Remplacé par `gmdev start front`
- `frontend-off.sh` → Remplacé par `gmdev stop front`
- `kill-zombies.sh` → Remplacé par `gmdev kill-zombies`

**Note :** Ces scripts peuvent être conservés pour référence historique, mais ne sont plus exécutés par le DevCenter.

---

### 🔧 Améliorations techniques

#### Code Rust

- Fonction `run_gmdev_command()` : Exécute les commandes `gmdev`
- Fonction `is_gmdev_available()` : Vérifie la disponibilité de `gmdev`
- Fonction `map_script_to_gmdev()` : Mappe les anciens scripts vers `gmdev`
- Suppression de la logique de fallback dans `run_embedded_script()`

#### Gestion des erreurs

- Messages d'erreur clairs si `gmdev` n'est pas disponible
- Validation stricte : pas de contournement si `gmdev` est absent
- Messages explicites pour guider l'utilisateur

---

### 📋 Règles strictes appliquées

#### ✅ Ce qui est autorisé

- Appeler `gmdev` pour toutes les opérations runtime
- Afficher les résultats de `gmdev`
- Gérer la configuration des projets
- Améliorer l'interface utilisateur

#### ❌ Ce qui est interdit

- Exécuter directement les services (npm, pnpm, etc.)
- Créer des environnements parallèles (docker, devcontainer, etc.)
- Fallback vers les scripts shell
- Dupliquer la logique de `gmdev`

---

### 🐛 Corrections de bugs

- Correction de la détection des ports (backend 3000, frontend 3010)
- Correction de la commande par défaut (npm run dev au lieu de pnpm dev)
- Installation automatique des dépendances si `node_modules` manquant

---

### 📚 Documentation

- **Nouveau** : `docs/ARCHITECTURE_GMDEV.md` — Architecture complète
- **Nouveau** : `docs/CHANGELOG_GMDEV.md` — Ce fichier
- Mise à jour de la documentation existante

---

### ⚠️ Breaking changes

#### Obligation d'avoir `gmdev`

**AVANT :** Le DevCenter fonctionnait avec ou sans `gmdev` (fallback vers scripts)

**APRÈS :** Le DevCenter **nécessite** `gmdev` pour fonctionner

**Action requise :**
1. Installer `gmdev` si ce n'est pas déjà fait
2. Vérifier qu'il est dans le PATH : `which gmdev`
3. Redémarrer le DevCenter

#### Commandes Tauri modifiées

Les commandes suivantes ont changé de comportement :
- `start_service_v3` : N'utilise plus les scripts shell
- `stop_service_v3` : N'utilise plus les scripts shell
- `status_service_v3` : Utilise uniquement `gmdev status`
- `kill_zombies_v3` : Utilise uniquement `gmdev kill-zombies`

---

### 🔄 Migration depuis v1.x

#### Pour les développeurs

1. **Installer `gmdev`** (si pas déjà fait)
2. **Vérifier l'installation** : `gmdev --version`
3. **Mettre à jour le DevCenter** vers v2.0
4. **Tester** : Les boutons Start/Stop doivent fonctionner via `gmdev`

#### Pour les projets

- Aucun changement requis dans les projets
- Les fichiers `.env` restent inchangés
- La configuration `projects-v3.json` reste compatible

---

### 📊 Statistiques

- **Lignes de code modifiées** : ~200
- **Nouvelles fonctions** : 4
- **Fonctions modifiées** : 6
- **Scripts obsolètes** : 7
- **Nouvelles commandes Tauri** : 3

---

### 🎯 Objectifs atteints

- ✅ Point unique de vérité : `gmdev`
- ✅ Suppression de la duplication de logique
- ✅ Interface graphique et CLI utilisent la même logique
- ✅ Maintenance simplifiée
- ✅ Messages d'erreur clairs
- ✅ Architecture cohérente

---

### 🔮 Prochaines étapes

- [ ] Ajouter un bouton "Restart" dans l'UI
- [ ] Améliorer l'affichage des logs via `gmdev logs`
- [ ] Ajouter un indicateur de santé via `gmdev status`
- [ ] Documenter les commandes `gmdev` avancées

---

### 📝 Notes

- Les scripts shell peuvent être supprimés ou conservés pour référence
- `gmdev` doit être installé et dans le PATH
- Aucun fallback n'est prévu si `gmdev` n'est pas disponible
- Cette architecture garantit la cohérence entre l'interface graphique et la CLI

---

**Version :** 2.0.0  
**Date :** 2025-01-17  
**Auteur :** Équipe GestionMax DevCenter



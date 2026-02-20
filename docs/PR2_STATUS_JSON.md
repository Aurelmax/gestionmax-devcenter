# PR2: Rendre le status fiable via JSON

## Objectif

Rendre le status fiable en ajoutant un format JSON stable côté CLI (`gmdev`) et en l'utilisant en priorité côté GMDF, avec un fallback sur le format texte existant.

## Modifications

### 1. Côté CLI (`gmdev`)

#### Ajout du flag `--json` à `gmdev status`

**Fichier**: `gmdev`

**Modifications**:
- La fonction `show_status()` accepte maintenant un paramètre `format` pour détecter si le format JSON est demandé
- Si `--json` ou `--format json` est passé, la fonction retourne un JSON stable au lieu du format texte
- Le format texte reste inchangé si aucun flag n'est fourni

**Format JSON retourné**:
```json
{
  "services": {
    "tunnel": {
      "state": "running" | "stopped",
      "port": 27017,
      "pid": 12345 | null
    },
    "backend": {
      "state": "running" | "stopped",
      "port": 3010,
      "pid": 12346 | null
    },
    "frontend": {
      "state": "running" | "stopped",
      "port": 3000,
      "pid": 12347 | null
    }
  }
}
```

**Commandes supportées**:
- `gmdev status` → Format texte (comportement existant)
- `gmdev status --json` → Format JSON
- `gmdev status --json <project_id>` → Format JSON pour un projet spécifique
- `gmdev status --format json` → Format JSON (alias)
- `gmdev status --format json <project_id>` → Format JSON pour un projet spécifique

**Détails techniques**:
- Utilise `jq` pour générer le JSON de manière stable
- Les ports sont retournés comme nombres (`tonumber`)
- Les PIDs sont retournés comme nombres ou `null` si le service n'est pas en cours d'exécution
- Les états sont toujours `"running"` ou `"stopped"` (pas de `"unknown"` dans le JSON)

### 2. Côté GMDF (`session.store.tsx`)

#### Ajout du parsing JSON dans `status()`

**Fichier**: `src/core/session/session.store.tsx`

**Modifications**:
- Ajout de l'interface `StatusJson` pour typer le JSON retourné par `gmdev status --json`
- Ajout de la fonction `parseStatusJson()` pour parser le JSON et convertir en `RunningState`
- Modification de `status()` pour :
  1. Appeler `gmdev status --json` en priorité
  2. Vérifier si `stdout` est JSON parseable (commence par `{` et se termine par `}`)
  3. Si JSON valide → parser avec `parseStatusJson()`
  4. Si JSON invalide ou non disponible → fallback sur `parseStatusOutput()` (parsing texte) avec log `"status-text-fallback"`
  5. Mettre à jour `runningState` et `lastStatusRaw`

**Logging du fallback**:
- Si le JSON n'est pas disponible ou invalide, un log avec le niveau `"warning"` est ajouté avec le message `"[status-text-fallback] ..."`
- Les cas de fallback sont :
  - `--json` non disponible (commande échoue)
  - JSON invalide (ne commence pas par `{` ou ne se termine pas par `}`)
  - Erreur de parsing JSON (JSON malformé)

**Comportement**:
- Le parsing texte existant (`parseStatusOutput()`) reste inchangé et est utilisé comme fallback
- L'affichage du Running State dans `SessionUI.tsx` utilise automatiquement les données JSON car il lit `state.runningState`

### 3. Affichage Running State

**Fichier**: `src/components/SessionUI.tsx`

**Modifications**: Aucune modification nécessaire
- L'affichage utilise déjà `state.runningState` qui est mis à jour par `status()`
- Les badges affichent automatiquement les valeurs `"running"`, `"stopped"`, ou `"unknown"` selon les données parsées

## Tests Recommandés

### Test 1: Status JSON fonctionnel
1. Démarrer une session (tunnel, backend, frontend)
2. Cliquer sur le bouton "Status"
3. Vérifier dans les logs que `gmdev status --json` est appelé
4. Vérifier que le Running State affiche correctement les états des services
5. Vérifier dans la console du navigateur que `runningState` contient les bonnes valeurs

### Test 2: Fallback texte si --json non disponible
1. Simuler un échec de `gmdev status --json` (par exemple, modifier temporairement le script pour retourner une erreur)
2. Cliquer sur le bouton "Status"
3. Vérifier dans les logs qu'un message `"[status-text-fallback]"` apparaît
4. Vérifier que le Running State est quand même mis à jour via le parsing texte

### Test 3: Fallback texte si JSON invalide
1. Simuler un JSON invalide (par exemple, modifier temporairement le script pour retourner du texte au lieu de JSON)
2. Cliquer sur le bouton "Status"
3. Vérifier dans les logs qu'un message `"[status-text-fallback] JSON invalide"` apparaît
4. Vérifier que le Running State est quand même mis à jour via le parsing texte

### Test 4: Vérification du format JSON côté CLI
1. Exécuter `gmdev status --json` dans un terminal
2. Vérifier que le JSON retourné est valide et contient les champs attendus
3. Vérifier que les ports sont des nombres
4. Vérifier que les PIDs sont des nombres ou `null`

### Test 5: Vérification du format texte (rétrocompatibilité)
1. Exécuter `gmdev status` dans un terminal (sans `--json`)
2. Vérifier que le format texte existant est toujours affiché correctement

## Compatibilité

- ✅ **Rétrocompatibilité**: Le format texte reste disponible et fonctionne comme avant
- ✅ **Fallback robuste**: Si `--json` n'est pas disponible, le système utilise automatiquement le parsing texte
- ✅ **Pas de breaking change**: Les commandes existantes continuent de fonctionner

## Notes

- Le streaming des logs n'est pas modifié pour cette PR (comme demandé)
- Le JSON retourné par `gmdev status --json` est stable et peut être utilisé pour l'intégration avec d'autres outils
- Les logs de fallback permettent de diagnostiquer les problèmes de parsing JSON

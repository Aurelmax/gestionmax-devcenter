# Activation/Désactivation de Projets avec gmdev

## Vue d'ensemble

Le système d'activation/désactivation permet de gérer plusieurs projets dans `projects-v3.json` tout en s'assurant qu'un seul projet est actif à la fois. Cela évite les conflits de ports et les ressources système partagées.

## Principe

- **Un seul projet actif** : Seul le projet avec `enabled: true` peut être démarré
- **Activation automatique** : Activer un projet désactive automatiquement les autres
- **Arrêt automatique** : Les services des projets désactivés sont automatiquement arrêtés

## Commandes gmdev

### Activer un projet

```bash
# Activer le projet détecté automatiquement (depuis le répertoire courant)
gmdev activate

# Activer un projet spécifique par son ID
gmdev activate gestionmax
gmdev activate my-project-id
```

**Comportement :**
1. Active le projet spécifié (`enabled: true`)
2. Désactive tous les autres projets (`enabled: false`)
3. Arrête automatiquement les services des autres projets qui étaient actifs
4. Affiche un message de confirmation

**Exemple :**
```bash
$ gmdev activate gestionmax
ℹ️ 🔄 Activation du projet: gestionmax
ℹ️ Arrêt des services du projet 'autre-projet'...
✅ Projet 'Gestionmax' (gestionmax) activé. Les autres projets ont été désactivés.
```

### Désactiver un projet

```bash
# Désactiver le projet détecté automatiquement
gmdev deactivate

# Désactiver un projet spécifique
gmdev deactivate gestionmax
```

**Comportement :**
1. Désactive le projet spécifié (`enabled: false`)
2. Arrête automatiquement tous les services de ce projet (tunnel, backend, frontend)
3. Affiche un message de confirmation

**Exemple :**
```bash
$ gmdev deactivate gestionmax
ℹ️ 🔄 Désactivation du projet: gestionmax
ℹ️ 🎨 Arrêt du frontend...
ℹ️ 🔧 Arrêt du backend...
ℹ️ 📡 Arrêt du tunnel...
✅ Projet 'Gestionmax' (gestionmax) désactivé et ses services arrêtés.
```

## Workflow recommandé

### Scénario 1 : Basculer entre deux projets

```bash
# Projet A est actif, vous voulez passer au Projet B
gmdev activate projet-b
# → Projet A est automatiquement désactivé et ses services arrêtés
# → Projet B est maintenant actif

# Plus tard, revenir au Projet A
gmdev activate projet-a
# → Projet B est automatiquement désactivé et ses services arrêtés
# → Projet A est maintenant actif
```

### Scénario 2 : Désactiver temporairement un projet

```bash
# Désactiver le projet courant pour libérer les ressources
gmdev deactivate

# Plus tard, le réactiver
gmdev activate
```

### Scénario 3 : Vérifier l'état d'activation

```bash
# Voir le statut des services (inclut l'état enabled dans projects-v3.json)
gmdev status

# Ou consulter directement le fichier de configuration
cat ~/.gestionmax-devcenter/projects-v3.json | jq '.projects[] | {id, name, enabled}'
```

## Intégration avec DevCenter

Le DevCenter (interface graphique) respecte également le champ `enabled` :

- **Projets désactivés** : Affichent un badge "⚠️ INACTIF" et les boutons de démarrage sont désactivés
- **Activation via UI** : Un toggle permet d'activer/désactiver depuis l'interface
- **Synchronisation** : Les changements via `gmdev` sont immédiatement visibles dans DevCenter (après rafraîchissement)

## Format JSON

Le champ `enabled` est optionnel et par défaut à `true` pour la rétrocompatibilité :

```json
{
  "projects": [
    {
      "id": "gestionmax",
      "name": "Gestionmax",
      "enabled": true,  // ← Actif
      "backendPath": "...",
      "frontendPath": "..."
    },
    {
      "id": "autre-projet",
      "name": "Autre Projet",
      "enabled": false,  // ← Inactif
      "frontendPath": "..."
    }
  ]
}
```

## Notes importantes

1. **Détection automatique** : Si vous n'indiquez pas de `project_id`, `gmdev` détecte automatiquement le projet depuis le répertoire courant
2. **Arrêt propre** : Les services sont arrêtés proprement (SIGTERM puis SIGKILL si nécessaire)
3. **Pas de perte de données** : La désactivation ne supprime pas la configuration, seulement l'état d'activation
4. **Rétrocompatibilité** : Les projets sans champ `enabled` sont considérés comme activés par défaut

## Dépannage

### Erreur : "Projet 'xxx' introuvable"
- Vérifiez que le projet existe dans `~/.gestionmax-devcenter/projects-v3.json`
- Vérifiez l'ID du projet avec `jq '.projects[].id' ~/.gestionmax-devcenter/projects-v3.json`

### Les services ne s'arrêtent pas
- Utilisez `gmdev kill-zombies` pour nettoyer les processus orphelins
- Vérifiez les PID avec `gmdev status`

### Plusieurs projets actifs
- Normalement impossible, mais si cela arrive, utilisez `gmdev activate <project-id>` pour forcer l'activation d'un seul projet

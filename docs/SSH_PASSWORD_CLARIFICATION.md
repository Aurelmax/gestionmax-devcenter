# Clarification : Mot de passe SSH demandé

## Question

Quand vous essayez de vous connecter au serveur, on vous demande un mot de passe. De quel mot de passe s'agit-il ?

## Réponse

Le mot de passe demandé est celui du **compte utilisateur sur le serveur Linux distant**.

### Détails

- **Serveur** : `78.47.79.58`
- **Utilisateur** : `root`
- **Type** : Mot de passe du compte système Linux (root)

### Ce n'est PAS :

- ❌ Le mot de passe de Coolify
- ❌ Le mot de passe du tunnel SSH (il n'y en a pas)
- ❌ Un mot de passe MongoDB
- ❌ Un mot de passe de base de données

## Pourquoi ce mot de passe est demandé ?

Quand vous vous connectez pour la première fois (ou si la clé SSH n'est pas configurée), SSH demande le mot de passe du compte utilisateur pour :

1. **Authentifier la connexion** : Vérifier que vous êtes autorisé à vous connecter
2. **Configurer la clé SSH** : Une fois connecté, vous pouvez ajouter votre clé publique pour les connexions futures

## Après configuration de la clé SSH

Une fois votre clé SSH publique copiée sur le serveur dans `~/.ssh/authorized_keys`, vous n'aurez **plus besoin de ce mot de passe** pour :

- Les connexions SSH futures
- Le tunnel MongoDB (qui utilise SSH en arrière-plan)

## Workflow complet

### Étape 1 : Première connexion (avec mot de passe)

```bash
# Se connecter au serveur (demande le mot de passe root)
ssh root@78.47.79.58
# Entrer le mot de passe du compte root sur le serveur
```

### Étape 2 : Configurer la clé SSH

```bash
# Depuis votre machine locale
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@78.47.79.58
# Entrer le mot de passe root une dernière fois
```

### Étape 3 : Vérifier (plus de mot de passe)

```bash
# Cette commande ne devrait plus demander de mot de passe
ssh -i ~/.ssh/id_ed25519 root@78.47.79.58 "echo 'Connexion réussie!'"
```

### Étape 4 : Utiliser le tunnel MongoDB

```bash
# Le tunnel démarre automatiquement sans mot de passe
gmdev start tunnel mytechgear-workspace
```

## Si vous ne connaissez pas le mot de passe root

Si vous ne connaissez pas le mot de passe du compte `root` sur le serveur `78.47.79.58`, vous avez plusieurs options :

1. **Demander au propriétaire du serveur** : Le mot de passe root du serveur
2. **Utiliser une autre clé SSH** : Si vous avez déjà une clé SSH configurée sur ce serveur
3. **Vérifier dans Coolify** : Parfois Coolify gère les accès SSH, mais le mot de passe reste celui du compte système

## Résumé

- **Mot de passe demandé** = Mot de passe du compte `root` sur le serveur `78.47.79.58`
- **But** = Authentifier la connexion SSH pour configurer la clé SSH
- **Après configuration** = Plus besoin de mot de passe, la clé SSH suffit

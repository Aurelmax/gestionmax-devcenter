# Configuration de la clé SSH pour le tunnel MongoDB

## Problème

Le serveur distant demande un mot de passe au lieu d'utiliser la clé SSH. Cela signifie que la clé publique n'est pas configurée sur le serveur.

## Solution : Copier la clé publique sur le serveur

### Méthode 1 : Utiliser ssh-copy-id (recommandé)

```bash
# Copier la clé publique sur le serveur
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@78.47.79.58

# Vous devrez entrer le mot de passe une dernière fois
# Après cela, la connexion se fera automatiquement avec la clé SSH
```

### Méthode 2 : Copier manuellement

Si `ssh-copy-id` n'est pas disponible :

```bash
# 1. Afficher votre clé publique
cat ~/.ssh/id_ed25519.pub

# 2. Se connecter au serveur (entrer le mot de passe)
ssh root@78.47.79.58

# 3. Sur le serveur, ajouter la clé publique
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "VOTRE_CLE_PUBLIQUE_ICI" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

### Méthode 3 : Utiliser sshpass (si disponible)

```bash
# Installer sshpass si nécessaire
sudo apt install sshpass

# Copier la clé avec sshpass
sshpass -p 'VOTRE_MOT_DE_PASSE' ssh-copy-id -i ~/.ssh/id_ed25519.pub root@78.47.79.58
```

## Vérification

Après avoir copié la clé, testez la connexion :

```bash
# Tester la connexion SSH (ne devrait plus demander de mot de passe)
ssh -i ~/.ssh/id_ed25519 root@78.47.79.58 "echo 'Connexion SSH réussie!'"
```

Si ça fonctionne, le tunnel MongoDB devrait maintenant fonctionner :

```bash
# Démarrer le tunnel
gmdev start tunnel mytechgear-workspace

# Vérifier le statut
gmdev status mytechgear-workspace
```

## Permissions importantes

Assurez-vous que les permissions sont correctes :

**Sur votre machine locale :**
```bash
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

**Sur le serveur distant :**
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Dépannage

### Si la connexion demande toujours un mot de passe

1. **Vérifier que la clé publique est bien sur le serveur :**
   ```bash
   ssh root@78.47.79.58 "cat ~/.ssh/authorized_keys"
   ```

2. **Vérifier les permissions sur le serveur :**
   ```bash
   ssh root@78.47.79.58 "ls -la ~/.ssh/"
   ```

3. **Vérifier la configuration SSH du serveur :**
   ```bash
   ssh root@78.47.79.58 "grep -E 'PubkeyAuthentication|AuthorizedKeysFile' /etc/ssh/sshd_config"
   ```

4. **Vérifier les logs SSH sur le serveur :**
   ```bash
   ssh root@78.47.79.58 "tail -20 /var/log/auth.log | grep ssh"
   ```

### Si vous avez plusieurs clés SSH

Si vous avez plusieurs clés SSH et que vous voulez utiliser une clé spécifique :

```bash
# Spécifier explicitement la clé dans la commande
ssh -i ~/.ssh/id_ed25519 root@78.47.79.58

# Ou configurer dans ~/.ssh/config
cat >> ~/.ssh/config << EOF
Host 78.47.79.58
    IdentityFile ~/.ssh/id_ed25519
    User root
EOF
```

## Après configuration

Une fois la clé SSH configurée, le tunnel MongoDB devrait fonctionner automatiquement :

```bash
# Le tunnel devrait démarrer sans demander de mot de passe
gmdev start tunnel mytechgear-workspace

# Vérifier que tout fonctionne
gmdev status mytechgear-workspace
```

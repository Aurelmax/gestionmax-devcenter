# Suppression du champ `programme` de la collection PIF

## 📋 RÉSUMÉ
Suppression complète du champ `programme` (relation) de la collection PIF dans Payload CMS et du frontend Next.js.

**Raison métier** : Le Programme ne doit plus être géré dans le PIF. Le PIF est autonome.

---

## 🔍 FICHIERS À MODIFIER

### 1. API PAYLOAD (Backend)

#### ✅ `/gestionmax/gestionmaxbackpayload/src/collections/Pifs.ts`
- **Ligne 180-189** : Supprimer le champ `programme` (relation)
- **Ligne 45** : Retirer `'programme'` des `defaultColumns`

#### ✅ `/gestionmax/gestionmaxbackpayload/src/utils/immutability.ts`
- **Ligne 51** : Retirer `'programme'` de la liste `immutableFields` pour la collection `pifs`

#### ✅ `/gestionmax/gestionmaxbackpayload/src/services/pdf/PifPdfGenerator.ts`
- **Lignes 63-73** : Supprimer l'interface `programme` de `PifTemplateData`
- **Ligne 171** : Supprimer la récupération de `programme`
- **Lignes 179-181** : Supprimer la validation `if (!programme)`
- **Lignes 225-235** : Supprimer la construction de l'objet `programme` dans `templateData`

#### ✅ `/gestionmax/gestionmaxbackpayload/src/templates/documents/pif.hbs`
- **Lignes 435-439** : Supprimer la section "Programme détaillé" qui utilise `programmeDetail`

---

### 2. FRONTEND NEXT.JS

#### ✅ `/gestionmax/gestionmaxfront/src/app/(app)/dashboard/pifs/nouveau/page.tsx`
- **Ligne 26** : Supprimer `programme: string` de l'interface `PIFFormData`
- **Ligne 43** : Supprimer `const [programmes, setProgrammes]`
- **Ligne 47** : Supprimer `programme: ''` de l'état initial
- **Lignes 65-78** : Supprimer le chargement des programmes (`apiFetch('/programmesCatalogue')`)
- **Lignes 217-235** : Supprimer le sélecteur de programme (remplacer par bouton "Créer programme" si nécessaire)
- **Ligne 105** : Supprimer `programme: formData.programme` de `pifData`

#### ✅ `/gestionmax/gestionmaxfront/src/components/apprenants/PifsListForm.tsx`
- **Lignes 25-28** : Supprimer `programme` de l'interface `Pif`
- **Lignes 264-269** : Supprimer l'affichage du programme dans la liste

#### ✅ `/gestionmax/gestionmaxfront/src/app/(app)/dashboard/pifs/page.tsx`
- **Lignes 34-38** : Supprimer `programme` de l'interface `PIF`
- **Lignes 301-302** : Supprimer l'affichage du programme dans la liste

---

---

## ✅ FICHIERS MODIFIÉS - RÉSUMÉ

### API PAYLOAD (Backend)
1. ✅ `/gestionmax/gestionmaxbackpayload/src/collections/Pifs.ts`
   - Supprimé champ `programme` (lignes 180-189)
   - Retiré `'programme'` des `defaultColumns` (ligne 45)

2. ✅ `/gestionmax/gestionmaxbackpayload/src/utils/immutability.ts`
   - Retiré `'programme'` des champs immuables PIF (ligne 51)
   - Retiré `'modifications.programmeModifie'` des champs immuables Avenants (ligne 74)

3. ✅ `/gestionmax/gestionmaxbackpayload/src/services/pdf/PifPdfGenerator.ts`
   - Supprimé interface `programme` de `PifTemplateData` (lignes 63-73)
   - Supprimé récupération et validation de `programme` (lignes 171, 179-181)
   - Supprimé construction objet `programme` dans templateData (lignes 225-235)

4. ✅ `/gestionmax/gestionmaxbackpayload/src/templates/documents/pif.hbs`
   - Supprimé section "Programme détaillé" (lignes 434-474)

5. ✅ `/gestionmax/gestionmaxbackpayload/src/routes/pif-routes.ts`
   - Supprimé référence à `pif.programmeDetaille?.modules` (ligne 422)

6. ✅ `/gestionmax/gestionmaxbackpayload/src/utils/transitions.ts`
   - Retiré `modifications.programmeModifie` de la vérification hasModification (ligne 159)

### FRONTEND NEXT.JS
1. ✅ `/gestionmax/gestionmaxfront/src/app/(app)/dashboard/pifs/nouveau/page.tsx`
   - Supprimé `programme: string` de l'interface `PIFFormData`
   - Supprimé état `programmes` et `programmeCree`
   - Supprimé chargement des programmes catalogue
   - Supprimé sélecteur de programme (remplacé par champ apprenant seul)
   - Supprimé `programme` de `pifData` lors de la soumission
   - Nettoyé imports inutilisés (`useSearchParams`, `Plus`, `BookOpen`)

2. ✅ `/gestionmax/gestionmaxfront/src/components/apprenants/PifsListForm.tsx`
   - Supprimé `programme` de l'interface `Pif`
   - Supprimé affichage du programme dans la liste (lignes 264-269)

3. ✅ `/gestionmax/gestionmaxfront/src/app/(app)/dashboard/pifs/page.tsx`
   - Supprimé `programme` de l'interface `PIF`
   - Supprimé affichage du programme dans la liste (lignes 301-302)

---

## ✅ CHECKLIST DE TESTS

- [ ] **Création PIF** : Créer un nouveau PIF sans programme → OK
- [ ] **Édition PIF** : Modifier un PIF existant → OK
- [ ] **Liste PIF** : Afficher la liste des PIFs → OK (pas d'affichage programme)
- [ ] **Détail PIF** : Voir les détails d'un PIF → OK (pas d'affichage programme)
- [ ] **Génération PDF** : Générer un PDF PIF → OK (pas d'erreur programme manquant)
- [ ] **Compilation TS** : `npm run build` → OK (pas d'erreurs TypeScript)
- [ ] **Immutabilité** : Valider un PIF → OK (pas d'erreur programme immuable)
- [ ] **Avenants** : Créer un avenant sans programmeModifie → OK

#### ⚠️ `/gestionmax/gestionmaxbackpayload/src/routes/pif-routes.ts`
- **Ligne 422** : Supprimer la référence à `pif.programmeDetaille?.modules` (champ inexistant)

#### ✅ `/gestionmax/gestionmaxbackpayload/src/utils/transitions.ts`
- **Ligne 159** : Retirer `modifications.programmeModifie` de la vérification `hasModification`

#### ✅ `/gestionmax/gestionmaxbackpayload/src/utils/immutability.ts`
- **Ligne 74** : Retirer `'modifications.programmeModifie'` de la liste `immutableFields` pour les avenants

#### ⚠️ `/gestionmax/gestionmaxbackpayload/src/collections/Avenants.ts`
- **Ligne 197-204** : Le champ `programmeModifie` dans les modifications d'avenant devrait être supprimé également
- **Note** : Décision métier requise - le champ existe toujours dans le schéma mais n'est plus utilisé dans la logique de validation

---

## ⚠️ MIGRATION DONNÉES EXISTANTES

**Impact** : Les PIFs existants avec un champ `programme` doivent être migrés :
- Le champ sera ignoré par Payload (champ supprimé du schéma)
- Les données doivent être archivées avant suppression
- **Migration MongoDB créée** : `scripts/migrate-archive-pif-programme.ts`

### Script de migration créé

**Fichier** : `/gestionmax/gestionmaxbackpayload/scripts/migrate-archive-pif-programme.ts`

**Fonctionnalités** :
- ✅ Trouve tous les PIFs avec un champ `programme`
- ✅ Archive les relations dans la collection `pifs_archive_programme`
- ✅ Supprime le champ `programme` des documents PIF
- ✅ Idempotent (peut être exécuté plusieurs fois)
- ✅ Mode `--dry-run` pour tester sans modifier

**Usage** :
```bash
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxbackpayload

# Mode test (dry-run)
pnpm migrate:archive-pif-programme:dry-run

# Exécution réelle
pnpm migrate:archive-pif-programme
```

**Structure de l'archive** :
```typescript
{
  pifId: string
  pifTitre: string
  pifNumeroPif?: string
  programmeId: string
  programmeTitre?: string
  archivedAt: Date
  archivedBy: string
  reason: string
}
```

**Collection d'archive** : `pifs_archive_programme`
- Index unique sur `pifId` pour éviter les doublons
- Consultation : `db.pifs_archive_programme.find().pretty()`

**Documentation complète** : Voir `scripts/README_MIGRATION_PIF_PROGRAMME.md` pour les détails d'utilisation

---

## 📝 NOTES

- Le workflow "Créer programme depuis PIF" reste fonctionnel (relation inverse PIF → Programme Personnalisé via champ `pif`)
- Les données du PIF (titre, durée, coût, objectifs, modalités) sont suffisantes pour générer le PDF
- Le template PDF utilise maintenant uniquement les données du PIF (pas de section programme détaillé)
- Le champ `programmeModifie` dans les Avenants reste dans le schéma mais n'est plus utilisé dans la logique de validation

---

## 📊 RÉSUMÉ DES MODIFICATIONS

### Total fichiers modifiés : **9 fichiers**

**API Payload (6 fichiers)** :
1. `collections/Pifs.ts` - Suppression champ + defaultColumns
2. `utils/immutability.ts` - Retrait des règles d'immuabilité programme
3. `services/pdf/PifPdfGenerator.ts` - Suppression interface et logique programme
4. `templates/documents/pif.hbs` - Suppression section programme détaillé
5. `routes/pif-routes.ts` - Correction référence champ inexistant
6. `utils/transitions.ts` - Retrait programmeModifie de validation

**Frontend Next.js (3 fichiers)** :
1. `app/(app)/dashboard/pifs/nouveau/page.tsx` - Suppression sélecteur + état programme
2. `components/apprenants/PifsListForm.tsx` - Suppression affichage programme
3. `app/(app)/dashboard/pifs/page.tsx` - Suppression affichage programme

**Corrections supplémentaires (erreur 500)** :
4. `utils/transitions.ts` - Retrait `'programme'` de `requiredFields` et suppression validation `if (!data.programme)`
5. `services/pdf/AvenantPdfGenerator.ts` - Modification pour utiliser données PIF directement au lieu de `pifData.programme`
6. `app/(app)/(public)/vibe-coding/page.tsx` - Correction erreur TypeScript null check
7. `app/(app)/dashboard/dossiers-formation/nouveau/page.tsx` - Correction types explicites

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

1. **Tests manuels** : Exécuter la checklist de tests ci-dessus
2. **Migration MongoDB** (optionnel) : Archiver les relations `programme` existantes si besoin historique
3. **Avenants** : Décider si `programmeModifie` doit être supprimé du schéma Avenants (nécessite décision métier)
4. **Documentation** : Mettre à jour la documentation métier si nécessaire

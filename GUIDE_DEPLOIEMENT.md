# 🚀 GUIDE DE DÉPLOIEMENT — FlashMat.ca
## Mettre ton application en ligne en moins de 30 minutes

---

## CE QUE TU VAS FAIRE
1. Créer ta base de données (Supabase) — 5 min
2. Mettre le code sur GitHub — 5 min
3. Déployer sur Vercel (internet) — 5 min
4. Configurer les variables — 5 min

---

## ÉTAPE 1 — Installer Node.js sur ton ordinateur
> Node.js permet d'exécuter le code sur ton ordinateur.

1. Va sur : https://nodejs.org
2. Clique sur le gros bouton vert **"LTS"** (version recommandée)
3. Télécharge et installe (comme n'importe quel programme)
4. Redémarre ton ordinateur

✅ C'est fait quand tu ouvres un terminal et tapes `node --version` — tu vois un numéro de version.

---

## ÉTAPE 2 — Créer ta base de données Supabase (GRATUIT)

1. Va sur **https://supabase.com**
2. Clique **"Start your project"** → Crée un compte avec Google
3. Clique **"New Project"**
4. Remplis :
   - **Name** : `flashmat`
   - **Database Password** : choisis un mot de passe fort (note-le!)
   - **Region** : `Canada (Central)` — le plus proche de Montréal
5. Clique **"Create new project"** (attends 2 minutes)

### 2b. Créer les tables
1. Dans le menu gauche, clique **"SQL Editor"**
2. Clique **"New Query"**
3. Ouvre le fichier `supabase_schema.sql` (dans ton dossier flashmat)
4. Copie tout le contenu et colle-le dans l'éditeur
5. Clique le bouton **"Run"** (ou Ctrl+Enter)
6. Tu devrais voir **"Success. No rows returned"**

### 2c. Récupérer tes clés
1. Dans le menu gauche, clique **"Project Settings"** (icône engrenage)
2. Clique **"API"**
3. Note ces deux valeurs (tu en auras besoin plus tard) :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon public key** → longue clé qui commence par `eyJ...`

✅ Ta base de données est prête !

---

## ÉTAPE 3 — Mettre le code sur GitHub (GRATUIT)

1. Va sur **https://github.com** → Crée un compte
2. Clique le **"+"** en haut à droite → **"New repository"**
3. Nom : `flashmat` → Clique **"Create repository"**

### Sur ton ordinateur :
1. Ouvre un **Terminal** (Mac: cherche "Terminal" / Windows: cherche "PowerShell")
2. Tape ces commandes une par une (appuie sur Entrée après chaque) :

```bash
cd chemin-vers-ton-dossier-flashmat
```
> Remplace `chemin-vers-ton-dossier-flashmat` par le vrai chemin.
> Exemple Mac : `cd ~/Downloads/flashmat`
> Exemple Windows : `cd C:\Users\TonNom\Downloads\flashmat`

```bash
npm install
```
> Installe toutes les dépendances (attends 1-2 minutes)

```bash
git init
git add .
git commit -m "FlashMat v1 - Initial commit"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/flashmat.git
git push -u origin main
```
> Remplace `TON-USERNAME` par ton nom d'utilisateur GitHub

✅ Ton code est sur GitHub !

---

## ÉTAPE 4 — Déployer sur Vercel (internet, GRATUIT)

1. Va sur **https://vercel.com**
2. Clique **"Sign Up"** → **"Continue with GitHub"**
3. Clique **"Add New Project"**
4. Tu vois ton repo `flashmat` → Clique **"Import"**
5. Dans **"Framework Preset"** → sélectionne **"Vite"**
6. Clique **"Deploy"** → Attends 2-3 minutes

### 4b. Ajouter tes clés secrètes
1. Dans Vercel, va dans ton projet → **"Settings"** → **"Environment Variables"**
2. Ajoute ces 3 variables (une par une) :

| NAME | VALUE |
|------|-------|
| `VITE_SUPABASE_URL` | ton URL Supabase (ex: https://abc.supabase.co) |
| `VITE_SUPABASE_ANON_KEY` | ta clé anon Supabase (commence par eyJ...) |
| `VITE_ANTHROPIC_API_KEY` | ta clé Anthropic (commence par sk-ant-...) |

3. Clique **"Save"**
4. Va dans **"Deployments"** → Clique les **"..."** du dernier déploiement → **"Redeploy"**

✅ Ton application est en ligne !

---

## ÉTAPE 5 — Clé API Anthropic (pour FlashAI)

1. Va sur **https://console.anthropic.com**
2. Crée un compte
3. Va dans **"API Keys"** → **"Create Key"**
4. Copie la clé et ajoute-la dans Vercel (voir étape 4b)

> ⚠️ La clé Anthropic coûte ~$5/mois selon l'utilisation.
> Pour commencer, mets $10 de crédit — ça dure longtemps!

---

## ÉTAPE 6 — Ton domaine .ca (optionnel, ~$15/an)

1. Va sur **https://namecheap.com** ou **domains.google.com**
2. Cherche `flashmat.ca`
3. Achète-le (~$15/an)
4. Dans Vercel → Settings → Domains → ajoute ton domaine
5. Suis les instructions pour connecter le DNS

---

## 🎉 RÉSULTAT FINAL

Ton application est accessible à :
- **https://flashmat.vercel.app** (gratuit, immédiat)
- **https://flashmat.ca** (avec ton domaine, après config DNS)

---

## 📱 INSTALLER L'APP SUR TÉLÉPHONE

L'application fonctionne comme une vraie app mobile :

**iPhone :**
1. Ouvre Safari et va sur ton URL
2. Tape l'icône "Partager" (carré avec flèche)
3. Sélectionne "Sur l'écran d'accueil"
4. L'app apparaît sur ton téléphone !

**Android :**
1. Ouvre Chrome et va sur ton URL
2. Menu (3 points) → "Ajouter à l'écran d'accueil"

---

## 🆘 PROBLÈMES FRÉQUENTS

**"npm: command not found"**
→ Node.js n'est pas installé. Refais l'étape 1.

**"git: command not found"**
→ Installe Git : https://git-scm.com/downloads

**Page blanche après déploiement**
→ Vérifie que les variables d'environnement sont bien ajoutées dans Vercel et redéploie.

**"Invalid API key" dans Supabase**
→ Vérifie que tu as copié la bonne clé (anon public, pas service_role).

---

## 📞 SUPPORT

Si tu es bloqué, reviens me parler dans Claude avec :
- Le message d'erreur exact
- À quelle étape tu es bloqué

Je vais t'aider à résoudre !

---

*FlashMat.ca — Hub Automobile Montréal*
*Guide créé avec Claude (Anthropic)*

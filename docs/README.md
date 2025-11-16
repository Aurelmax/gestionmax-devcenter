# GestionMax DevCenter  

**Outil de pilotage local pour l'environnement de développement GestionMax**

GestionMax DevCenter est une application **Tauri + React + Rust** permettant de :

- lancer ou arrêter le tunnel SSH vers le serveur distant,
- démarrer/arrêter le backend Payload local,
- démarrer/arrêter le frontend Next.js local,
- piloter Netdata,
- monitorer l'utilisation CPU / RAM / disque,
- tuer les process zombies,
- **gérer les projets locaux via Project Manager** (ajout, modification, suppression),
- **détecter automatiquement la structure des projets** via Auto-Scan,
- afficher une "Vue compacte" des projets dans le Dashboard.

L'objectif de cet outil est de **remplacer l'usage manuel des commandes terminal**  
(`pnpm dev`, `ssh -L`, `ps aux | grep`, etc.) par **une interface GUI moderne, stable et rapide**.

---

## 🚀 Stack technique

- **Tauri v2** (Rust)
- **React + Vite**
- **TailwindCSS v4**
- **Shadcn UI** (composants React)
- **TypeScript**
- **IPC Tauri Invoke** pour appeler les commandes Rust depuis React

---

## 📁 Structure du projet

```
gestionmax-devcenter/
├── src/                          # Frontend React
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Logs.tsx
│   │   └── Configuration/
│   │       ├── ProjectManager.tsx
│   │       └── AutoScanProject.tsx
│   ├── components/
│   │   ├── ProjectCompactView.tsx
│   │   ├── ProjectForm.tsx
│   │   └── AutoScanSummary.tsx
│   ├── hooks/
│   │   └── useProjects.ts
│   ├── lib/
│   │   ├── projectManager.ts
│   │   ├── autoscan.ts
│   │   └── projectConverter.ts
│   └── types/
│       └── Project.ts
├── src-tauri/                    # Backend Rust (Tauri)
│   └── src/
│       ├── lib.rs
│       ├── commands.rs
│       ├── state.rs
│       ├── projects.rs            # Gestion des projets
│       └── autoscan.rs            # Auto-détection
├── docs/                         # Documentation locale
├── package.json
├── tauri.conf.json
└── Cargo.toml
```

---

## 🏁 Démarrer l'application

```bash
npm install
npm run tauri dev
```

---

## 🧭 Navigation de la documentation

- [Architecture générale](ARCHITECTURE.md)
- [Liste des commandes (Rust ↔ React)](COMMANDS.md)
- [Workflow de développement local](DEV_WORKFLOW.md)
- [Guide Project Manager](PROJECT_MANAGER.md)
- [Glossaire technique](GLOSSARY.md)

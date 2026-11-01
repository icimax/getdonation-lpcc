# getdonation LPCC

Programme en **TypeScript** conçu pour récupérer, filtrer et persister en temps réel les dons de l'action caritative **Lille-Paris Contre le Cancer (LPCC)** sur la plateforme Kentaa, dans le cadre d'un live caritatif de 48h organisé par **EPTV** ([eptv.fr](https://eptv.fr)).

---

## 🚀 Fonctionnalités

* **Requête bas niveau (`node:https`)** : Contourne les restrictions des clients HTTP classiques (comme `fetch` / `undici`) qui suppriment certains en-têtes essentiels ou modifient l'empreinte de la requête exigée par les sécurités CloudFront/Kentaa de la Fondation de France.
* **Système de "Polling" intelligent** : Interroge l'API à intervalles réguliers (ex: toutes les 10 secondes).
* **Détection des nouveautés (`update`)** : La méthode `update()` ne retourne **que les nouveaux dons** par rapport aux précédents appels. Une fois renvoyés, ils sont marqués comme connus et ne réapparaissent plus.
* **Persistance JSON** : Sauvegarde automatique de l'historique complet dans un fichier `donations.json` pour éviter toute perte de données en cas de redémarrage du script pendant le live.

---

## 🛠️ Installation

1. **Cloner le projet / Placer les fichiers** dans votre dossier de travail.
2. **Installer les dépendances** (notamment les types Node.js) :
   ```bash
   npm install
   npm i --save-dev @types/node tsx
# Tasks MVP

Ce fichier est la file de travail sequentielle pour atteindre le MVP de Local Agent Workspace Manager.

Mode d'emploi pour Codex :
- lire `AGENTS.md`, puis `docs/prd.md`, `docs/spec.md`, `docs/architecture.md`, `docs/backlog.md` et les ADRs pertinentes avant de modifier le code ;
- reperer la premiere tache non cochee ;
- executer uniquement cette tache ;
- ajouter ou mettre a jour les tests necessaires ;
- lancer les checks utiles ;
- quand la tache est terminee, cocher la case, ajouter une note courte de realisation, puis s'arreter.

## [x] T001 - Verifier le socle actuel du MVP

### Outcome
Le depot a une base connue et verifiee avant d'empiler les taches MVP restantes : les tests existants passent ou les ecarts bloquants sont documentes dans la note de realisation.

### Scope
- In scope : relire les docs de cadrage, inspecter rapidement l'API et le web, lancer les checks existants, confirmer les commandes de validation utilisables localement.
- Out of scope : corriger les bugs fonctionnels hors echec bloquant de setup, changer les contrats API, ajouter de nouvelles fonctionnalites.

### Files likely affected
- `docs/tasks.md`
- eventuellement `README.md` si une commande de validation documentee est manifestement fausse.

### Constraints
- Respecter `AGENTS.md`.
- Ne pas supprimer les changements non lies deja presents dans le worktree.
- Ne pas introduire de dependance.

### Implementation notes
- Lancer au minimum les tests backend existants depuis `apps/api`.
- Si le frontend a deja ses dependances installees, lancer le check de build ou de lint disponible dans `apps/web/package.json`.
- Si un check ne peut pas etre lance, noter precisement pourquoi.

### Validation
- `cd apps/api && pytest`
- `cd apps/web && npm run build` si les dependances sont disponibles et que le script existe.

### Done when
- Les checks utiles sont lances ou leur impossibilite est expliquee.
- La note de realisation indique l'etat de depart fiable pour les taches suivantes.

Note de realisation : 2026-04-18 - Docs de cadrage et ADRs 0001/0002 relus, API et web inspectes rapidement. Backend valide avec `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 6 tests passent ; la commande `pytest` seule n'est pas disponible dans le PATH et pytest a besoin d'un basetemp hors blocage de permissions local. Frontend : `npm run build` depuis `apps/web` est lancable avec les dependances installees, compile le bundle, puis echoue au type-check sur `app/layout.tsx` avec `Cannot find namespace 'JSX'`. Aucun correctif fonctionnel applique dans cette tache de verification.

## [x] T002 - Structurer les erreurs API

### Outcome
Les erreurs produites par les services et routes MVP utilisent une forme structuree minimale et coherente, au lieu de messages opaques, sans casser inutilement les clients existants.

### Scope
- In scope : definir un schema d'erreur Pydantic, centraliser des helpers d'erreurs pour les cas metier courants, couvrir les erreurs des ressources principales.
- Out of scope : refonte globale de l'observabilite, internationalisation des messages, systeme d'erreurs avance.

### Files likely affected
- `apps/api/app/schemas/common.py`
- `apps/api/app/services/*_service.py`
- `apps/api/app/routers/*.py`
- `apps/api/tests/*.py`
- `docs/spec.md`

### Constraints
- Les routers restent fins.
- Les erreurs doivent rester exploitables par l'UI.
- Ne pas masquer les codes HTTP existants quand ils sont corrects.

### Implementation notes
- Utiliser une forme du type `{"code": "...", "message": "...", "details": {...}}`.
- Commencer par les erreurs 400, 404, 409 et 500 deja emises par les services.
- Mettre a jour les tests qui assertent les details d'erreur.

### Validation
- `cd apps/api && pytest`

### Done when
- Les erreurs principales sont structurees.
- Les tests couvrent au moins une erreur de validation metier, une ressource introuvable et le blocage d'execution reelle.
- `docs/spec.md` documente la forme d'erreur.

Note de realisation : 2026-04-18 - Ajout d'un schema `APIError` (`code`, `message`, `details`) et d'une exception applicative centralisee pour les erreurs metier/services. Les erreurs principales 400, 404, 409 et 500 des services policies, workspaces, agents, schedules, runs et settings sont structurees sans changer les codes HTTP. Tests ajoutes pour policy inconnue, workspace introuvable et execution reelle bloquee. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 8 tests passent. `docs/spec.md` documente le contrat d'erreur.

## [x] T003 - Renforcer les limites de workspace

### Outcome
La creation et la mise a jour des workspaces refusent les chemins non autorises, normalisent les chemins avec `Path`, et preservent explicitement les limites locales.

### Scope
- In scope : configuration des racines autorisees, validation du `root_path`, tests de regression pour chemins hors limites et traversal.
- Out of scope : sandbox OS, isolation container, detection des modifications de fichiers par run.

### Files likely affected
- `apps/api/app/core/config.py`
- `apps/api/app/schemas/workspace.py`
- `apps/api/app/services/workspace_service.py`
- `apps/api/tests/test_policies_and_workspaces.py`
- `.env.example`
- `README.md`
- `docs/spec.md`

### Constraints
- Utiliser `pathlib.Path`.
- Ne pas affaiblir le mode dry-run par defaut.
- Les tests ne doivent pas dependre de vrais repertoires utilisateur.

### Implementation notes
- Ajouter un setting local pour les racines de workspace autorisees, avec une valeur de developpement sure et documentee.
- Resoudre les chemins avant comparaison.
- Retourner une erreur structuree lorsque le chemin est hors des racines autorisees.

### Validation
- `cd apps/api && pytest`

### Done when
- Un workspace dans une racine autorisee est accepte.
- Un workspace hors racine autorisee est refuse.
- Les docs de configuration de racines sont a jour.

Note de realisation : 2026-04-18 - Ajout du setting `workspace_allowed_roots` avec valeur de developpement sure sur `examples/workspaces`, documentation `.env.example`, README, Docker Compose et spec mises a jour. La creation de workspace normalise `root_path` via `Path.resolve()` et refuse les chemins hors racines autorisees, y compris traversal. Tests ajoutes pour chemin autorise, chemin hors limite et traversal ; les tests existants utilisent des repertoires temporaires controles. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 10 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe aussi, avec seulement un avertissement local d'ecriture de cache Ruff.

## [x] T004 - Ajouter l'edition et l'archivage des workspaces

### Outcome
L'utilisateur peut modifier les metadonnees d'un workspace et l'archiver sans supprimer l'historique ni les runs associes.

### Scope
- In scope : endpoint `PUT /workspaces/{workspace_id}`, validation du statut, conservation des timestamps UTC, tests API.
- Out of scope : suppression definitive, restauration en masse, UI detaillee.

### Files likely affected
- `apps/api/app/schemas/workspace.py`
- `apps/api/app/services/workspace_service.py`
- `apps/api/app/routers/workspaces.py`
- `apps/api/tests/test_policies_and_workspaces.py`
- `docs/spec.md`

### Constraints
- Ne pas changer silencieusement le contrat de creation existant.
- Preserver les runs et schedules existants.
- Garder la logique metier dans le service.

### Implementation notes
- Autoriser la mise a jour de `name`, `description`, `tags`, `status`, `policy_id` et eventuellement `root_path` en reutilisant la validation de limite de workspace.
- Verifier que `updated_at` est mis a jour en UTC ISO-8601.
- Refuser une `policy_id` inconnue.

### Validation
- `cd apps/api && pytest`

### Done when
- Les tests couvrent edition reussie, policy inconnue, statut invalide et archivage.
- `docs/spec.md` liste le endpoint d'edition.

Note de realisation : 2026-04-18 - Ajout du schema `WorkspaceUpdate`, du endpoint `PUT /workspaces/{workspace_id}` et de la logique service pour modifier `name`, `description`, `tags`, `status`, `policy_id` et `root_path` avec validation des policies et reutilisation des limites de workspace. L'archivage passe par `status=archived` sans suppression de l'historique ; test de regression avec run existant conserve. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 14 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `docs/spec.md` documente le endpoint d'edition.

## [x] T005 - Ajouter l'edition des policies

### Outcome
Les policies peuvent etre modifiees apres creation, avec validation des limites d'execution et prefixes de commande.

### Scope
- In scope : endpoint `PUT /policies/{policy_id}`, schema de mise a jour, tests de validation.
- Out of scope : suppression de policies, migration avancee, UI complete.

### Files likely affected
- `apps/api/app/schemas/policy.py`
- `apps/api/app/services/policy_service.py`
- `apps/api/app/routers/policies.py`
- `apps/api/tests/test_policies_and_workspaces.py`
- `docs/spec.md`

### Constraints
- Les prefixes de commande restent explicites et allowlist-style.
- Ne pas autoriser de `max_runtime_seconds` nul ou negatif.
- Garder des erreurs structurees.

### Implementation notes
- Mettre a jour `updated_at`.
- Conserver l'unicite du nom.
- Couvrir les conflits de nom si le schema actuel les permet.

### Validation
- `cd apps/api && pytest`

### Done when
- Une policy est editable via API.
- Les validations critiques sont testees.
- Le contrat est documente.

Note de realisation : 2026-04-18 - Ajout du schema `WorkspacePolicyUpdate`, du endpoint `PUT /policies/{policy_id}` et de la logique service d'edition partielle avec mise a jour de `updated_at`. Le nom reste unique, `max_runtime_seconds` conserve les bornes 30..7200 et les prefixes de commande doivent etre des entrees non vides. Tests ajoutes pour edition reussie, conflit de nom, limite d'execution invalide et prefixe vide. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 18 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `docs/spec.md` documente le contrat.

## [x] T006 - Ajouter l'edition et l'activation des agents

### Outcome
Les profils agents peuvent etre modifies, actives ou desactives, et les runs refusent un agent inactif.

### Scope
- In scope : endpoint `PUT /agents/{agent_profile_id}`, validation de `workspace_id`, refus de run avec agent inactif.
- Out of scope : adapters runtime reels, gestion de secrets, UI complete.

### Files likely affected
- `apps/api/app/schemas/agent.py`
- `apps/api/app/services/agent_service.py`
- `apps/api/app/services/run_service.py`
- `apps/api/app/routers/agents.py`
- `apps/api/tests/test_agents_and_schedules.py`
- `apps/api/tests/test_runs.py`
- `docs/spec.md`

### Constraints
- Ne pas utiliser `any` cote frontend si des types sont mis a jour plus tard.
- Les variables d'environnement restent des donnees structurees.
- Les identifiants de runtime restent explicites.

### Implementation notes
- Verifier qu'un agent lie a un workspace ne peut pas etre lance sur un workspace incompatible, sauf si le contrat existant prevoit un agent global.
- Ajouter un test de regression pour agent inactif.
- Mettre a jour `updated_at`.

### Validation
- `cd apps/api && pytest`

### Done when
- Un agent est editable via API.
- Un agent inactif ne peut pas lancer de run.
- Les tests documentent le comportement agent global vs agent lie.

Note de realisation : 2026-04-18 - Ajout du schema `AgentProfileUpdate`, du endpoint `PUT /agents/{agent_profile_id}` et de la logique service d'edition partielle avec validation de `workspace_id` et mise a jour de `updated_at`. Les runs refusent maintenant un agent inactif et un agent lie a un autre workspace ; un agent avec `workspace_id=null` reste global et peut lancer un run sur tout workspace existant. Tests ajoutes pour edition, workspace inconnu, agent inactif, mismatch workspace et agent global. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 23 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `docs/spec.md` documente le contrat.

## [x] T007 - Ajouter l'edition et la desactivation des schedules

### Outcome
Les schedules peuvent etre modifies, actives ou desactives, avec recalcul coherent de `next_run_at`.

### Scope
- In scope : endpoint `PUT /schedules/{schedule_id}`, validation interval/cron, recalcul `next_run_at`, tests API.
- Out of scope : worker de scheduling, execution automatique, UI complete.

### Files likely affected
- `apps/api/app/schemas/schedule.py`
- `apps/api/app/services/schedule_service.py`
- `apps/api/app/routers/schedules.py`
- `apps/api/tests/test_agents_and_schedules.py`
- `docs/spec.md`

### Constraints
- Stocker les timestamps en UTC ISO-8601.
- Refuser les schedules incoherents.
- Ne pas introduire APScheduler ou autre dependance dans cette tache.

### Implementation notes
- Pour `mode=interval`, exiger `interval_minutes`.
- Pour `mode=cron`, accepter seulement le niveau de support deja documente ou documenter clairement la limite.
- Si `enabled=false`, `next_run_at` doit etre `null`.

### Validation
- `cd apps/api && pytest`

### Done when
- Les schedules sont editables.
- Les tests couvrent activation, desactivation, interval invalide et references inconnues.
- Le contrat est documente.

Note de realisation : 2026-04-18 - Ajout du schema `ScheduleUpdate`, du endpoint `PUT /schedules/{schedule_id}` et de la logique service d'edition partielle avec validation des references workspace/agent, recalcul de `next_run_at` pour les schedules interval actives, et remise a `null` quand `enabled=false`. `mode=interval` exige `interval_minutes`; `mode=cron` exige `cron_expression`, mais le MVP ne parse pas encore cron et documente `next_run_at=null` pour ce mode. Tests ajoutes pour activation, desactivation, interval invalide et references inconnues. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 27 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `docs/spec.md` documente le contrat.

## [x] T008 - Completer le contrat d'historique des runs

### Outcome
L'API expose un historique de runs utilisable par l'UI MVP, avec detail, logs et artifacts coherents.

### Scope
- In scope : verifier et completer `GET /runs`, `GET /runs/{run_id}`, `GET /runs/{run_id}/logs`, `GET /runs/{run_id}/artifacts`, ajouter les champs manquants necessaires a l'UI.
- Out of scope : streaming temps reel, pagination avancee, telechargement de fichiers.

### Files likely affected
- `apps/api/app/schemas/run.py`
- `apps/api/app/services/run_service.py`
- `apps/api/app/routers/runs.py`
- `apps/api/tests/test_runs.py`
- `apps/web/lib/types.ts`
- `docs/spec.md`

### Constraints
- Ne pas casser les endpoints existants sans migration documentee.
- Les artifacts restent sous `storage/artifacts/`.
- Les logs restent conserves pour audit.

### Implementation notes
- Ajouter des tests 404 pour detail, logs et artifacts d'un run inexistant si absent.
- Verifier que l'ordre des logs est chronologique.
- Ajouter les donnees lisibles utiles pour l'UI seulement si elles sont justifiees.

### Validation
- `cd apps/api && pytest`

### Done when
- L'historique de run est stable et teste.
- Les types frontend refletent le contrat.
- `docs/spec.md` est a jour.

Note de realisation : 2026-04-18 - Les endpoints detail, logs et artifacts de runs retournent maintenant une erreur structuree 404 quand le run n'existe pas. Les logs sont listes par ordre chronologique avec ordre d'insertion stable pour timestamps identiques, et les tests verifient logs/artifacts utiles pour l'UI. Types et helpers frontend ajoutes pour `RunLog`, `RunArtifact`, `getRuns`, `getRun`, `getRunLogs` et `getRunArtifacts`. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 28 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `npm run build` cote web reste bloque par l'erreur preexistante `app/layout.tsx: Cannot find namespace 'JSX'`. `docs/spec.md` documente le contrat d'historique.

## [x] T009 - Introduire un runner reel garde par settings et policy

### Outcome
Un run non dry-run peut executer une commande uniquement si l'execution globale est active et si la policy du workspace l'autorise explicitement.

### Scope
- In scope : execution subprocess controlee, allowlist de prefixes, timeout, capture stdout/stderr, statut completed/failed/blocked, tests service.
- Out of scope : runtime adapters Copilot/Codex, execution reseau reelle, sandbox container.

### Files likely affected
- `apps/api/app/services/run_service.py`
- `apps/api/app/services/runner_service.py`
- `apps/api/app/schemas/run.py`
- `apps/api/tests/test_runs.py`
- `docs/spec.md`
- `docs/architecture.md`
- eventuellement `docs/adr/0003-real-execution-gate.md`

### Constraints
- Utiliser des listes d'arguments explicites.
- Ne jamais utiliser `shell=True`.
- Toujours definir `cwd`, `timeout`, `capture_output`.
- Respecter `max_runtime_seconds`.
- Preserver `execution_enabled=false` par defaut.

### Implementation notes
- Separer la logique runner dans un service dedie.
- Construire la commande a partir du template de maniere prudente ; si le template actuel est une chaine, documenter et tester la strategie de parsing retenue.
- Persister stdout/stderr en logs bornes et auditables.
- Retourner `blocked` quand la policy ou le setting refuse l'execution.

### Validation
- `cd apps/api && pytest`

### Done when
- Les dry-runs continuent de fonctionner.
- Une execution reelle est bloquee par defaut.
- Une commande autorisee peut s'executer dans un test controle.
- Une commande non autorisee, hors timeout ou en sortie non-zero est testee.

Note de realisation : 2026-04-18 - Ajout du service `runner_service` pour executer une commande controlee avec liste d'arguments explicite, `cwd`, timeout, capture stdout/stderr bornee et sans `shell=True`. `POST /runs` conserve le dry-run par defaut ; en execution reelle il persiste un run `blocked` si le setting global ou la policy refuse, `completed` si le processus sort a 0, et `failed` en non-zero, timeout ou echec de lancement. Tests ajoutes pour blocage par defaut, commande autorisee, commande non autorisee, sortie non-zero et timeout du runner. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 32 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `docs/spec.md`, `docs/architecture.md` et l'ADR 0003 documentent les gardes.

## [x] T010 - Ajouter un worker de schedules minimal

### Outcome
Les schedules actives et echues peuvent declencher des runs de facon controlee, avec mise a jour de `next_run_at` et garde anti-doublon.

### Scope
- In scope : service de polling minimal, fonction testable pour traiter les schedules dus, runs declenches en dry-run par defaut, recalcul interval.
- Out of scope : orchestration distribuee, dependance externe de scheduler, cron complet si non deja supporte.

### Files likely affected
- `apps/api/app/services/schedule_worker_service.py`
- `apps/api/app/services/schedule_service.py`
- `apps/api/app/services/run_service.py`
- `apps/api/app/main.py`
- `apps/api/tests/test_agents_and_schedules.py`
- `apps/api/tests/test_runs.py`
- `docs/spec.md`
- `docs/architecture.md`

### Constraints
- Le demarrage FastAPI ne doit pas faire de migration destructive.
- Le worker doit etre desactivable en configuration.
- Eviter les doubles executions si un schedule est deja traite.

### Implementation notes
- Commencer par une fonction purement appelable par tests : `process_due_schedules(now)`.
- Ensuite seulement brancher un background loop local si cela reste simple et documente.
- Les runs issus du worker doivent avoir `trigger=schedule`.

### Validation
- `cd apps/api && pytest`

### Done when
- Un schedule interval echu cree un run.
- `next_run_at` est avance.
- Un schedule desactive ou non echu ne cree pas de run.
- La configuration du worker est documentee.

Note de realisation : 2026-04-18 - Ajout du service `schedule_worker_service` avec `process_due_schedules(now)` testable, claim SQL conditionnel des schedules interval dus, creation de runs `trigger=schedule` en dry-run par defaut et avance de `next_run_at`. Le lifespan FastAPI demarre une boucle de polling locale uniquement si `LAWM_SCHEDULE_WORKER_ENABLED=true`; le polling est configure par `LAWM_SCHEDULE_WORKER_POLL_SECONDS`. Tests ajoutes pour schedule interval echu, anti-doublon par avance de `next_run_at`, schedule desactive et schedule non echu. Validation : `.venv\Scripts\python.exe -m pytest --basetemp .\pytest-tmp` depuis `apps/api` : 34 tests passent ; `.venv\Scripts\python.exe -m ruff check app tests` passe avec seulement l'avertissement local d'ecriture de cache Ruff. `README.md`, `.env.example`, `docs/spec.md` et `docs/architecture.md` documentent la configuration et les limites MVP du worker.

## [x] T011 - Ajouter une page Runs et une page detail de run

### Outcome
L'UI permet de consulter l'historique des runs, puis le detail d'un run avec metadata, logs et artifacts.

### Scope
- In scope : routes Next.js pour liste et detail, appels centralises dans `lib/api.ts`, types stricts, etat vide/erreur simple.
- Out of scope : streaming temps reel, telechargement d'artifacts, filtres avances.

### Files likely affected
- `apps/web/app/runs/page.tsx`
- `apps/web/app/runs/[runId]/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/types.ts`
- `apps/web/components/*`
- `apps/web/app/globals.css`
- `docs/wireframes.md`

### Constraints
- Centraliser les appels API dans `lib/api.ts`.
- Eviter `any`.
- Garder les composants petits.
- L'UI doit rester lisible sur mobile et desktop.

### Implementation notes
- Relier les runs recents du dashboard a la page detail si possible.
- Afficher les logs dans l'ordre chronologique.
- Afficher les artifacts avec nom, type media et chemin relatif.

### Validation
- `cd apps/web && npm run build`
- Si une suite de tests frontend existe, la lancer aussi.

### Done when
- La page liste les runs.
- La page detail affiche logs et artifacts.
- Les types frontend compilent en strict.

Note de realisation : 2026-04-18 - Ajout de la route `/runs` avec etat vide/erreur simple et tableau des runs recents, et de la route `/runs/{runId}` affichant metadata, commande, logs chronologiques et artifacts. Ajout du composant `RunTable`, lien depuis les runs recents du dashboard vers le detail, et entree `Runs` dans la navigation principale. Styles responsive ajoutes pour le detail, les logs et les artifacts ; `docs/wireframes.md` inclut la liste des runs. Suite Vitest ajoutee ensuite pour couvrir navigation MVP, dashboard vers detail, liste runs et detail avec logs/artifacts. Validation : `npm test` et `npm run build` depuis `apps/web` passent sans warning.

## [ ] T012 - Ajouter le detail workspace avec onglets MVP

### Outcome
L'UI workspace permet de voir et piloter les facettes MVP : execution manuelle, agent, policy, scheduling et historique.

### Scope
- In scope : route detail workspace, layout d'onglets ou sections, affichage des donnees liees, liens vers runs et schedules.
- Out of scope : edition complete en formulaire avance, drag-and-drop, recherche globale.

### Files likely affected
- `apps/web/app/workspaces/[workspaceId]/page.tsx`
- `apps/web/app/workspaces/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/types.ts`
- `apps/web/components/*`
- `apps/web/app/globals.css`
- `docs/wireframes.md`

### Constraints
- Preferer server components sauf besoin d'etat client.
- Pas de logique de fetching volumineuse dans des composants presentationnels.
- Garder l'experience principale directement utilisable.

### Implementation notes
- Ajouter les helpers API necessaires pour recuperer workspace, agents, schedules et runs.
- L'historique peut etre filtre cote client si le volume reste faible pour le MVP.
- Prevoir un lien d'action vers le lancement manuel implemente dans la tache suivante.

### Validation
- `cd apps/web && npm run build`

### Done when
- Un workspace a une page detail utilisable.
- Les sections attendues par le PRD sont presentes.
- La navigation depuis la liste fonctionne.

Note de realisation :

## [ ] T013 - Ajouter le lancement manuel depuis l'UI

### Outcome
L'utilisateur peut lancer un run manuel dry-run depuis l'UI, choisir workspace et agent, puis ouvrir le detail du run cree.

### Scope
- In scope : formulaire client minimal, appel `POST /runs`, gestion erreur/succes, dry-run coche par defaut.
- Out of scope : execution reelle depuis l'UI si les guardrails ne sont pas termines, editeur de prompt avance.

### Files likely affected
- `apps/web/app/workspaces/[workspaceId]/page.tsx`
- `apps/web/components/*run*.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/types.ts`
- `apps/web/app/globals.css`
- eventuellement tests frontend si la structure existe.

### Constraints
- Le mode dry-run doit etre le defaut visible.
- Ne pas exposer un bouton d'execution reelle sans indiquer l'etat du setting global.
- Les erreurs API structurees doivent etre affichees proprement.

### Implementation notes
- Ajouter un helper `createRun` dans `lib/api.ts`.
- Rediriger vers `/runs/{runId}` apres creation.
- Desactiver les agents inactifs dans la selection.

### Validation
- `cd apps/web && npm run build`
- `cd apps/api && pytest` si le contrat `POST /runs` est touche.

### Done when
- Un run manuel dry-run peut etre lance depuis l'UI.
- Les erreurs courantes sont visibles.
- Le run cree est consultable dans l'UI.

Note de realisation :

## [ ] T014 - Ajouter les formulaires MVP de creation et edition

### Outcome
L'UI permet de creer et modifier les workspaces, policies, agents et schedules necessaires au scenario de succes V1.

### Scope
- In scope : formulaires simples, appels API centralises, validation minimale cote client, affichage des erreurs structurees.
- Out of scope : experience admin avancee, suppression definitive, import/export.

### Files likely affected
- `apps/web/app/workspaces/*`
- `apps/web/app/schedules/page.tsx`
- `apps/web/app/settings/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/types.ts`
- `apps/web/components/*`
- `apps/web/app/globals.css`
- eventuellement `docs/wireframes.md`

### Constraints
- TypeScript strict.
- Eviter `any`.
- Ne pas dupliquer la logique API dans les composants.
- Les composants formulaires restent petits.

### Implementation notes
- Commencer par les workspaces et policies, puis agents, puis schedules.
- Garder les defaults de securite visibles : dry-run, execution disabled, policies deny-by-default.
- Utiliser des composants clients uniquement pour les formulaires interactifs.

### Validation
- `cd apps/web && npm run build`
- Lancer les tests frontend si disponibles.

### Done when
- Le scenario "creer deux workspaces, attacher policies et agents, configurer schedules" est possible via l'UI.
- Les erreurs de validation principales sont affichees.
- La compilation frontend passe.

Note de realisation :

## [ ] T015 - Completer la page Settings

### Outcome
L'utilisateur peut consulter et modifier les settings MVP, notamment le flag global d'execution, avec avertissement explicite.

### Scope
- In scope : endpoint/settings si incomplet, formulaire UI pour `runner.execution_enabled`, affichage des settings de stockage et worker.
- Out of scope : secrets, settings multi-utilisateur, profils d'environnement.

### Files likely affected
- `apps/api/app/schemas/settings.py`
- `apps/api/app/services/settings_service.py`
- `apps/api/app/routers/settings.py`
- `apps/api/tests/test_dashboard_and_settings.py`
- `apps/web/app/settings/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/types.ts`
- `docs/spec.md`

### Constraints
- `runner.execution_enabled` reste `false` par defaut.
- Le changement doit etre explicite et auditable via `updated_at`.
- Ne pas lancer d'execution en changeant un setting.

### Implementation notes
- Si `PUT /settings/{key}` existe deja, brancher l'UI dessus et completer les tests manquants.
- Afficher un texte de risque court avant activation.
- Garder les valeurs comme chaines cote persistence si le contrat actuel le fait, mais typer les helpers UI.

### Validation
- `cd apps/api && pytest`
- `cd apps/web && npm run build`

### Done when
- Le setting global peut etre change via API et UI.
- Les tests backend couvrent lecture et mise a jour.
- Le dashboard reflete l'etat d'execution.

Note de realisation :

## [ ] T016 - Ajouter une seed demo reproductible

### Outcome
Un utilisateur peut initialiser des donnees demo locales pour valider rapidement le scenario MVP sans tout saisir a la main.

### Scope
- In scope : script de seed idempotent, policy safe, deux workspaces demo, agents, schedules optionnels, documentation.
- Out of scope : import generique, seed de donnees personnelles, integration cloud.

### Files likely affected
- `scripts/*seed*.py`
- `examples/workspaces/*`
- `README.md`
- `docs/spec.md`
- `apps/api/tests/*` si le script est teste.

### Constraints
- Le script doit etre idempotent.
- Ne pas ecraser de donnees utilisateur sans demande explicite.
- Les chemins demo doivent rester dans des repertoires controles du depot ou configurables.

### Implementation notes
- Reutiliser les exemples existants sous `examples/workspaces/`.
- Documenter clairement la commande.
- Preferer les APIs/services existants ou une persistence explicite et testable.

### Validation
- `python scripts/<seed>.py` depuis la racine, avec le nom reel du script.
- `cd apps/api && pytest`

### Done when
- La seed cree un jeu MVP coherent.
- Relancer la seed ne duplique pas les donnees.
- Le README explique comment tester le scenario demo.

Note de realisation :

## [ ] T017 - Verifier le parcours MVP de bout en bout

### Outcome
Le parcours de succes V1 est executable localement : creer deux workspaces, attacher policies et agents, lancer des dry-runs, consulter logs/artifacts, configurer schedules et verifier l'audit trail.

### Scope
- In scope : test manuel guide ou test e2e leger si l'outillage existe, correction des petits ecarts bloquants, documentation du parcours.
- Out of scope : couverture e2e exhaustive, CI multi-OS avancee, tests de charge.

### Files likely affected
- `README.md`
- `docs/testing-strategy.md`
- `docs/wireframes.md`
- `apps/api/tests/*`
- `apps/web/*` uniquement si des corrections bloquantes sont identifiees.

### Constraints
- Corriger seulement les ecarts directement lies au parcours MVP.
- Ne pas ajouter de dependance e2e sans mettre a jour docs et instructions.
- Preserver les defaults de securite.

### Implementation notes
- Utiliser la seed demo si elle existe.
- Verifier que logs et artifacts sont produits et consultables.
- Verifier que les schedules ne declenchent pas d'execution reelle par surprise.

### Validation
- `cd apps/api && pytest`
- `cd apps/web && npm run build`
- Parcours manuel documente dans `README.md` ou `docs/testing-strategy.md`.

### Done when
- Le scenario de succes du PRD est confirme.
- Les checks passent.
- Les instructions de verification MVP sont documentees.

Note de realisation :

## [ ] T018 - Stabiliser la documentation MVP

### Outcome
La documentation de fin MVP est coherente avec le produit livre, les limites connues et les commandes de lancement.

### Scope
- In scope : aligner PRD/spec/architecture/backlog/README/testing-strategy, marquer le perimetre MVP livre, documenter les limites restantes.
- Out of scope : nouvelle fonctionnalite, refonte editoriale lourde, promesses P2.

### Files likely affected
- `README.md`
- `docs/prd.md`
- `docs/spec.md`
- `docs/architecture.md`
- `docs/backlog.md`
- `docs/testing-strategy.md`
- `docs/tasks.md`

### Constraints
- Ne pas masquer les risques de securite.
- Distinguer clairement MVP livre, hors scope et evolution planifiee.
- Ne pas laisser de TODO sans contexte.

### Implementation notes
- Mettre a jour le backlog pour separer fait, MVP restant et post-MVP.
- Verifier que les endpoints documentes correspondent au code.
- S'assurer que les instructions Docker/local sont toujours exactes.

### Validation
- Relire les docs modifiees.
- Lancer les checks utiles si un exemple ou une commande a ete change.

### Done when
- Les docs sont synchronisees avec le comportement implemente.
- Les limites de securite et d'architecture sont explicites.
- `docs/tasks.md` ne contient plus de tache MVP non terminee.

Note de realisation :

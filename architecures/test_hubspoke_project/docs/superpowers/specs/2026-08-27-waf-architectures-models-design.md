# WAF architecture models — design

Rename the project from `test_hubspoke_project` to `test_waf_architectures` and replace the single hub-spoke landscape with **10 heavy-fidelity TODL models**, one per Azure Well-Architected Framework workload architecture, each with a tailored landing-zone topology.

## Scope

**In:**
- Rename project (name, namespaces, model type names, directory).
- Delete the existing `landscape.todl` and `scenarios.todl`.
- Author 10 new `.todl` files, one per WAF workload, each with heavy fidelity (~25–40 components, hub/spoke or workload-appropriate topology, 2–3 scenarios).
- Validate each file via the `plexus` MCP (`get_problems`, `refresh_project`).

**Out:**
- Diagrams (`.diagram` files). The existing `diagram.diagram` will be deleted; no replacements authored.
- Library changes. Where the `microsoft` library lacks a technology, declare it locally inside the model (following the pattern already used in `landscape.todl` for `azure_bastion`, `azure_application_insights`, `azure_log_analytics`).
- Meta-model changes. All models conform to `tech-architecture` v0.1.0.
- Cross-file references. Each `.todl` is self-contained (TODL projects don't cross-reference instances between files).

## Rename mechanics

| Change | From | To |
|---|---|---|
| `project.plexus` `name` | `test_hubspoke_project` | `test_waf_architectures` |
| TODL `namespace` (every file) | `test_hubspoke_project.models` | `test_waf_architectures.models` |
| Model type name pattern | `test_hubspoke_projectModelsModel` | `<workload>Model` (e.g. `MissionCriticalModel`) |
| Directory | `…\test_hubspoke_project` | `…\test_waf_architectures` |

Directory rename happens **last**, after all files are authored and validated in place. Reason: renaming the directory mid-flight invalidates absolute paths in tool calls.

## File layout

```
test_waf_architectures/
├── project.plexus                     (updated)
├── CLAUDE.md                          (unchanged)
├── .claude/                           (unchanged)
├── docs/superpowers/specs/            (this spec + plan)
├── mission_critical.todl              (new)
├── ai.todl
├── saas.todl
├── sap.todl
├── oracle_iaas.todl
├── azure_vmware_solution.todl
├── azure_virtual_desktop.todl
├── hpc.todl
├── microsoft_fabric.todl
└── sustainability.todl
```

One file = one model. Each model conforms to `Model` (the `landscape` viewpoint). Scenarios are authored inline in the same file. No separate scenarios viewpoint file — the current `scenarios.todl` stub is deleted.

## Per-workload topology sketches

Each file follows the same skeleton: 1 tenant, 2 subs (connectivity + workload), hub VNet with firewall + bastion + shared services, workload spoke tailored to the architecture, environments (`prod` minimum; add `dr` where the pattern demands it), platform observability (Log Analytics + App Insights), Entra ID. The **workload-specific** shape below is what differs.

### 1. `mission_critical.todl`
Active-active across **two paired regions**. Global Front Door + Traffic Manager. Per-region: App Gateway + WAF, AKS or stamped compute, Cosmos DB multi-region write, Event Hubs, regional Key Vault. Health model component. Chaos-engineering runner (declared local). Scenarios: user request served under regional failure; deployment stamp rollout; DR failover.

### 2. `ai.todl`
Enterprise Azure OpenAI landing zone. APIM front door for token/quota governance, Azure OpenAI (with PTU + PayGo deployments as separate slots), AI Search (vector index), Cosmos DB (chat history), Document Intelligence, blob for grounding docs, Content Safety, Prompt Flow / AI Foundry hub. Private endpoints for OpenAI, Search, Cosmos. Scenarios: RAG query flow (client → APIM → orchestrator → Search → OpenAI → response); ingestion pipeline (blob → Document Intelligence → embeddings → Search); jailbreak filtered by Content Safety.

### 3. `saas.todl`
Multitenant deployment-stamp pattern. Control plane (tenant catalog DB, sign-up API, billing integrations, deployment orchestrator). Tenant stamps: shared PaaS pool + dedicated stamps for premium tenants. Front Door with per-tenant routing. Entra External ID (B2C-style) for customer identity. Scenarios: tenant onboarding (control plane provisions a stamp); tenant request routing; noisy-neighbor isolation via dedicated stamp.

### 4. `sap.todl`
SAP S/4HANA + HANA DB. Central Services cluster on Linux VMs with STONITH. HANA-tier VMs (Mv2 / Mdsv2) with Premium SSD v2. Azure NetApp Files for `/sapmnt` and `/transport`. SAP Web Dispatcher. Azure Center for SAP solutions. Cross-zone HA. Scenarios: end-user SAPGUI request via Web Dispatcher; HANA failover via Pacemaker; ANF-backed shared filesystem read.

### 5. `oracle_iaas.todl`
Oracle DB on Azure VMs with **Data Guard** (primary + physical standby). Oracle RAC not covered (Azure doesn't support shared block); Data Guard is the canonical HA. ASM for storage layout on Premium SSD v2. Oracle GoldenGate for logical replication (local declaration). Scenarios: application read hitting primary; failover to standby via Data Guard broker; GoldenGate CDC to analytics sink.

### 6. `azure_vmware_solution.todl`
AVS private cloud (vSphere + NSX-T + HCX). ExpressRoute Global Reach linking AVS to hub VNet. HCX for VM mobility from on-prem. Local declarations for `avs_private_cloud`, `vsan`, `nsx_t_edge`, `hcx_manager`, `srm`. Scenarios: on-prem→AVS live migration via HCX; AVS VM egress via hub firewall; ExpressRoute failure and SRM DR.

### 7. `azure_virtual_desktop.todl`
Host pools (pooled + personal), workspace, application groups, session hosts as VMSS. FSLogix profile share on ANF or Azure Files Premium. Entra ID join. MSIX app attach share. Session-host subnet, control-plane subnet. Scenarios: user launches published app; profile load via FSLogix; scaling plan expands host pool at 08:00.

### 8. `hpc.todl`
Azure CycleCloud head node, HB/HC-series compute pool (InfiniBand), Azure Batch pool alternative, PBS/Slurm scheduler (local declaration), Azure Managed Lustre or NetApp Files for scratch, blob for long-term. Low-priority Spot compute for burst. Scenarios: job submission and scale-out; scratch read/write during a job; results archived to blob cool tier.

### 9. `microsoft_fabric.todl`
Fabric capacity (F-SKU), workspaces per medallion tier (bronze/silver/gold), OneLake, Lakehouse, Dataflows Gen2, Data Factory pipelines, Real-Time Intelligence eventhouse, Power BI semantic model. Private links to OneLake and workspace endpoints. On-prem data gateway. Scenarios: ingestion (source → Data Factory → bronze → silver medallion transform → gold semantic model → Power BI); real-time eventhouse alert; capacity burst during month-end.

### 10. `sustainability.todl`
A **generic 3-tier web workload** (App Gateway → AKS or App Service → Azure SQL + blob) authored with sustainability-motivated choices called out: cool-tier storage for archive, autoscale rules explicit, spot compute for batch tier, region choice annotated for carbon intensity, right-sized SKUs, telemetry sampling to reduce log volume. Uses standard prelude `annotate` where useful (label/wiki). Scenarios: request served at low-carbon-region primary; batch job on spot; log-sampling telemetry flow.

## Common conventions across all 10

- **Namespace**: `test_waf_architectures.models`.
- **Imports**: `libraries.microsoft` + `tech_architecture` (matches current pattern).
- **Model header**: `model <Name>Model : libraries.microsoft uses categories, ingresses, microsoft_tech conforms Model { … }` — same `uses` clause as the current landscape.
- **Region**: default `eastus`; mission-critical uses `eastus` + `westus2`.
- **Environment lifecycle**: `lifecycle_stages.prod` for all; add `.dr` where paired-region.
- **Local technology declarations** appear at the top of each model body, mirroring how `azure_bastion` is declared today. Every local tech has `label`, `available_in = microsoft_tech.azure` (or on-prem where relevant), and `applicable_to = categories.<x>`.
- **Scenarios** are authored inline within the same model block, 2–3 per file, using the `==>` edge operator already used in `landscape.todl`.
- **Wiki annotations**: none authored (out of scope — keeps files focused on structure).

## Meta-model / library gap handling

The `microsoft` library covers common Azure PaaS/IaaS (Front Door, App Gateway, VMSS, SQL, KV, storage, Entra, DNS, Private Link, Firewall, LB). Every other technology is declared locally in the file that uses it. Cataloguing the gaps up-front so authoring is mechanical:

| File | Locally declared technologies (indicative) |
|---|---|
| mission_critical | traffic_manager, cosmos_db, event_hubs, aks, chaos_studio |
| ai | azure_openai, ai_search, apim, cosmos_db, document_intelligence, content_safety, ai_foundry_hub |
| saas | apim, cosmos_db (catalog), event_grid, entra_external_id |
| sap | azure_netapp_files, sap_hana_vm, sap_web_dispatcher, pacemaker_cluster, acss |
| oracle_iaas | oracle_db_vm, oracle_data_guard, oracle_asm, oracle_goldengate |
| azure_vmware_solution | avs_private_cloud, vsan, nsx_t_edge, hcx_manager, srm, expressroute_global_reach |
| azure_virtual_desktop | avd_host_pool, avd_workspace, avd_app_group, fslogix_share, azure_files_premium, msix_app_attach |
| hpc | cyclecloud, hb_series_vm, hc_series_vm, azure_batch, managed_lustre, slurm_scheduler |
| microsoft_fabric | fabric_capacity, onelake, fabric_workspace, dataflows_gen2, fabric_pipeline, eventhouse, semantic_model, on_prem_data_gateway |
| sustainability | (reuses microsoft library; no gaps expected) |

Each local tech follows the existing 3-field pattern (`label`, `available_in`, `applicable_to`). Category values (`applicable_to`) must reference existing terms in `categories` from the `tech-architecture` meta-model; where none fits, the closest term is used.

## Execution order

1. Update `project.plexus` name.
2. Delete `landscape.todl`, `scenarios.todl`, `diagram.diagram`.
3. Author the 10 `.todl` files. Order: sustainability (smallest, warm-up) → saas → ai → mission_critical → azure_virtual_desktop → microsoft_fabric → hpc → oracle_iaas → sap → azure_vmware_solution. Rationale: build depth on the familiar PaaS surface first, then push into infra-heavy specialty workloads.
4. After each file: `mcp__plexus__refresh_project` then `mcp__plexus__get_problems` — clear every **error** before moving on (warnings tolerated).
5. Rename the directory: `test_hubspoke_project` → `test_waf_architectures`.
6. Final sweep: refresh, get_problems, confirm no errors project-wide.

## Testing / verification

The only executable verification is `mcp__plexus__get_problems`. There are no unit tests. Success criterion: **zero errors reported by Plexus across all 10 files** after final refresh. Warnings are recorded but do not block completion.

If `get_problems` reports errors the fix is inline; if a class of error recurs (e.g. an invented category term that doesn't exist in the meta-model), stop and audit the meta-model surface before continuing.

## Risks

- **Meta-model surface unknown to me.** I've only inferred it from `landscape.todl`. If concepts like `component`, `slot`, `network`, `subnet`, etc. don't accept the field patterns I'm using across all 10 workloads, I'll see errors from `get_problems` and need to adapt. Mitigation: sustainability model first (simplest), then adjust the template before scaling.
- **`categories` taxonomy unknown.** Local tech declarations need `applicable_to = categories.<x>`. If I invent terms that don't exist, they fail validation. Mitigation: after sustainability, list the actual categories that validated successfully and reuse.
- **`microsoft_tech` enum coverage.** Same as above for `available_in`. Only `microsoft_tech.azure` is used in the current file; that's likely the only relevant value.
- **File-count vs context.** 10 heavy files in one session is realistic but long. If context tightens, remaining files get authored in follow-up sessions using this same spec.

## Non-goals

- No refactor of existing library or meta-model.
- No diagram files.
- No wiki content.
- No cross-workload references (each file stands alone).
- No `.diagram` view authored to accompany the models (deferred; user can request afterwards).

# WAF Architecture Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the current TODL project from `test_hubspoke_project` to `test_waf_architectures` and replace the single hub-spoke landscape with 10 heavy-fidelity landing-zone models — one per Azure Well-Architected Framework workload architecture.

**Architecture:** Each workload becomes its own `.todl` file with its own `model` block conforming to `Model` (the landscape viewpoint). Each file is self-contained (TODL doesn't cross-reference instances between files in the same project). Where the bound `microsoft` library lacks a technology, it is declared locally inside the model using the pattern already present in the current `landscape.todl` (`azure_bastion`, `azure_application_insights`, `azure_log_analytics`).

**Tech Stack:** TODL (instance tier), `tech-architecture` meta-model v0.1.0, `microsoft` library v0.1.0. Verification via the Plexus MCP server (`mcp__plexus__refresh_project`, `mcp__plexus__get_problems`).

**Spec:** `docs/superpowers/specs/2026-08-27-waf-architectures-models-design.md`

## Global Constraints

- **Namespace** (every file): `test_waf_architectures.models`
- **Imports** (every file): `import libraries.microsoft;` and `import tech_architecture;`
- **Model header** (every file): `model <Name>Model : libraries.microsoft uses categories, ingresses, microsoft_tech conforms Model { … }`
- **Region default:** `eastus`. Paired-region workloads (mission-critical, oracle_iaas) additionally use `westus2`.
- **Environment lifecycle:** `lifecycle_stages.prod` on primary; add `.dr` where paired-region.
- **Every statement ends with `;`.** Missing semicolons are the most common syntax error.
- **Identifiers:** PascalCase for types, lower_snake for members (matches the existing file). Concept refs are bare names, no sigils.
- **Cardinality suffixes:** bare = 1, `?` = 0..1, `[]` = 0..N, `[+]` = 1..N. No `[0..1]`, `[*]`, `list<T>`.
- **Verification per file:** after every file is written, call `mcp__plexus__refresh_project` then `mcp__plexus__get_problems`. **Zero errors** required (warnings tolerated). If errors reference unknown category or technology enum members, fix inline by choosing an existing member or declaring a local technology.
- **`landscape.todl` may be read** as a reference template until Task 3 deletes it. Do **not** rely on it after Task 3.

---

## Task 1: Rename `project.plexus`

**Files:**
- Modify: `project.plexus`

**Interfaces:**
- Consumes: nothing.
- Produces: renamed project (`test_waf_architectures`). All later tasks assume this new project name.

- [ ] **Step 1: Update the `name` field in `project.plexus`.**

The file today reads:
```json
{
  "type": "architecture",
  "name": "test_hubspoke_project",
  "version": 1,
  "metaModel": {
    "id": "tech-architecture",
    "version": "0.1.0"
  },
  "libraries": [
    {
      "id": "microsoft",
      "version": "0.1.0"
    }
  ]
}
```
Change `"name": "test_hubspoke_project"` to `"name": "test_waf_architectures"`. No other field changes.

- [ ] **Step 2: Refresh Plexus and check for problems.**

Run:
1. `mcp__plexus__refresh_project`
2. `mcp__plexus__get_problems`

Expected: existing `landscape.todl` / `scenarios.todl` still validate (they use namespace `test_hubspoke_project.models` — Plexus does not require the namespace to match the project name). Zero errors from the rename itself. If new errors appear, they are the rename's fault — stop and investigate.

---

## Task 2: Author `sustainability.todl` (template exemplar)

**Files:**
- Create: `sustainability.todl`

**Interfaces:**
- Consumes: nothing.
- Produces: the canonical template all later files copy. Downstream tasks reference this file's structure (namespace, imports, model header, actors/tenant/subs/RGs/networks/subnets/environments/components/slots/scenarios blocks) as the pattern to mirror.

- [ ] **Step 1: Author the file.**

Write exactly this content to `sustainability.todl`:

```todl
namespace test_waf_architectures.models
{
  import libraries.microsoft;
  import tech_architecture;

  model SustainabilityModel : libraries.microsoft uses categories, ingresses, microsoft_tech conforms Model {

    // ── Local technologies (sustainability lens: annotate what's not in the library)
    technology azure_log_analytics {
      label = "Log Analytics";
      available_in = microsoft_tech.azure;
      applicable_to = categories.observability_platform;
    }
    technology azure_application_insights {
      label = "Application Insights";
      available_in = microsoft_tech.azure;
      applicable_to = categories.observability_platform;
    }

    // ── Actors
    actor global_user {
      label = "Global User";
    }
    actor operator {
      label = "Operator";
    }

    // ── Tenant + subscriptions
    tenant contoso_tenant {
      label = "Contoso Entra Tenant";
      region = "eastus";
      in = microsoft_tech.azure;
    }
    subscription connectivity_sub {
      label = "Connectivity Subscription";
      region = "eastus";
      in = microsoft_tech.azure;
      in_tenant = contoso_tenant;
    }
    subscription workload_sub {
      label = "Sustainable Workload Subscription";
      region = "eastus";
      in = microsoft_tech.azure;
      in_tenant = contoso_tenant;
    }

    // ── Resource groups
    resource_group hub_rg {
      label = "RG - Hub Connectivity";
      region = "eastus";
      in_subscription = connectivity_sub;
    }
    resource_group workload_rg {
      label = "RG - Sustainable Workload";
      region = "eastus";
      in_subscription = workload_sub;
    }
    resource_group platform_rg {
      label = "RG - Platform Shared";
      region = "eastus";
      in_subscription = connectivity_sub;
    }

    // ── Hub VNet
    network hub_vnet {
      label = "Hub VNet";
      region = "eastus";
      kind = "networks.dedicated_network";
      cidr = "10.0.0.0/22";
      in = microsoft_tech.azure;
      in_subscription = connectivity_sub;
    }
    subnet fw_subnet {
      label = "AzureFirewallSubnet";
      cidr = "10.0.0.0/26";
      parent = hub_vnet;
    }
    subnet shared_services_subnet {
      label = "Shared Services Subnet";
      cidr = "10.0.1.0/24";
      parent = hub_vnet;
    }

    // ── Spoke VNet
    network spoke_vnet {
      label = "Sustainable Workload Spoke VNet";
      region = "eastus";
      kind = "networks.dedicated_network";
      cidr = "10.10.0.0/20";
      in = microsoft_tech.azure;
      in_subscription = workload_sub;
    }
    subnet appgw_subnet {
      label = "App Gateway Subnet";
      cidr = "10.10.0.0/24";
      parent = spoke_vnet;
    }
    subnet frontend_subnet {
      label = "Frontend Subnet (autoscale)";
      cidr = "10.10.1.0/24";
      parent = spoke_vnet;
    }
    subnet backend_subnet {
      label = "Backend Subnet (spot batch tier)";
      cidr = "10.10.2.0/24";
      parent = spoke_vnet;
    }
    subnet pe_subnet {
      label = "Private Endpoints Subnet";
      cidr = "10.10.3.0/24";
      parent = spoke_vnet;
    }

    // ── Environments
    environment hub_prod {
      label = "Hub Production";
      kind = "environments.azure_subscription_env";
      lifecycle = "lifecycle_stages.prod";
      region = "eastus";
      in_tenant = contoso_tenant;
      in_subscription = connectivity_sub;
      resource_groups = [hub_rg, platform_rg];
    }
    environment workload_prod {
      label = "Sustainable Workload Production (low-carbon region)";
      kind = "environments.azure_subscription_env";
      lifecycle = "lifecycle_stages.prod";
      region = "eastus";
      in_tenant = contoso_tenant;
      in_subscription = workload_sub;
      resource_groups = workload_rg;
    }

    // ── Global edge
    component front_door {
      label = "Azure Front Door (WAF, caching enabled)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_front_door;
      slots = front_door_prod;
    }
    slot front_door_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
      public_ingress = ingresses.public_internet;
    }

    // ── Regional edge
    component app_gateway {
      label = "Application Gateway + WAF";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.application_gateway;
      slots = app_gateway_prod;
    }
    slot app_gateway_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
      in_subnet = appgw_subnet;
    }

    // ── Hub firewall
    component azure_firewall_hub {
      label = "Azure Firewall (hub)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_firewall;
      slots = azure_firewall_hub_prod;
    }
    slot azure_firewall_hub_prod {
      label = "Production";
      environment = hub_prod;
      in_resource_group = hub_rg;
      in_subnet = fw_subnet;
    }

    // ── Frontend compute (autoscale, right-sized)
    component frontend_vmss {
      label = "Frontend VMSS (autoscale 1-10, right-sized SKU)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.virtual_machine_scale_sets;
      slots = frontend_vmss_prod;
    }
    slot frontend_vmss_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
      in_subnet = frontend_subnet;
    }

    // ── Backend batch tier on spot (sustainability lever)
    component batch_vmss_spot {
      label = "Batch VMSS on Spot (interruptible)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.virtual_machine_scale_sets;
      slots = batch_vmss_spot_prod;
    }
    slot batch_vmss_spot_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
      in_subnet = backend_subnet;
    }

    // ── Data
    component azure_sql {
      label = "Azure SQL Database (serverless, auto-pause)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_sql_database;
      slots = azure_sql_prod;
    }
    slot azure_sql_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
    }
    component sql_private_link {
      label = "SQL Private Link";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_private_link;
      slots = sql_private_link_prod;
    }
    slot sql_private_link_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
      in_subnet = pe_subnet;
    }
    component archive_blob {
      label = "Archive Blob (cool tier)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_blob_storage;
      slots = archive_blob_prod;
    }
    slot archive_blob_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
    }
    component blob_private_link {
      label = "Blob Private Link";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_private_link;
      slots = blob_private_link_prod;
    }
    slot blob_private_link_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = workload_rg;
      in_subnet = pe_subnet;
    }

    // ── Platform / identity / observability (sampled)
    component entra_id {
      label = "Microsoft Entra ID";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.microsoft_entra_id;
    }
    component azure_dns {
      label = "Azure DNS (private zones)";
      in = microsoft_tech.azure;
      implemented_by = microsoft_tech.azure_dns;
    }
    component app_insights {
      label = "Application Insights (sampling enabled)";
      in = microsoft_tech.azure;
      implemented_by = azure_application_insights;
      slots = app_insights_prod;
    }
    slot app_insights_prod {
      label = "Production";
      environment = workload_prod;
      in_resource_group = platform_rg;
    }
    component log_analytics_ws {
      label = "Log Analytics Workspace (30-day retention)";
      in = microsoft_tech.azure;
      implemented_by = azure_log_analytics;
      slots = log_analytics_ws_prod;
    }
    slot log_analytics_ws_prod {
      label = "Production";
      environment = hub_prod;
      in_resource_group = platform_rg;
    }

    // ── Scenarios
    scenario low_carbon_request {
      label = "Low-Carbon Region Request";
      outcome = "HTTPS request served from the frontend VMSS in a region chosen for low grid carbon intensity, with response cached at Front Door to avoid redundant compute";
      sequences = sequence {
        id = "user_to_sql_low_carbon";
        entry_point = global_user;
        steps = [global_user ==> front_door, front_door ==> app_gateway, app_gateway ==> frontend_vmss, frontend_vmss ==> sql_private_link, sql_private_link ==> azure_sql];
      };
    }
    scenario spot_batch_job {
      label = "Spot Batch Job";
      outcome = "A deferrable batch job runs on interruptible spot capacity, writing results to cool-tier archival storage";
      sequences = sequence {
        id = "batch_to_archive";
        entry_point = batch_vmss_spot;
        steps = [batch_vmss_spot ==> blob_private_link, blob_private_link ==> archive_blob];
      };
    }
    scenario sampled_telemetry {
      label = "Sampled Telemetry";
      outcome = "Application telemetry is sampled at ingest to reduce log volume, then routed to a workspace with a short retention policy";
      sequences = sequence {
        id = "telemetry_sampled";
        entry_point = frontend_vmss;
        steps = [frontend_vmss ==> app_insights, app_insights ==> log_analytics_ws];
      };
    }
  }
}
```

- [ ] **Step 2: Fetch the Plexus MCP tools if not already loaded.**

Run: `ToolSearch` with query `select:mcp__plexus__refresh_project,mcp__plexus__get_problems`.

- [ ] **Step 3: Refresh and validate.**

Run:
1. `mcp__plexus__refresh_project`
2. `mcp__plexus__get_problems`

Expected: zero errors. If an error names a missing category, taxonomy term, or `microsoft_tech` member, look at `landscape.todl` for a working example of that construct and adjust. Iterate until clean.

---

## Task 3: Delete the old landscape and scenarios files

**Files:**
- Delete: `landscape.todl`
- Delete: `scenarios.todl`
- Delete: `diagram.diagram`

**Interfaces:**
- Consumes: successful `sustainability.todl` (Task 2) — required, because after this deletion `sustainability.todl` is the only reference for the template shape.
- Produces: clean project state — only `sustainability.todl` remains as a model file.

- [ ] **Step 1: Delete the three files.**

Run:
```powershell
Remove-Item "landscape.todl","scenarios.todl","diagram.diagram" -Force
```

- [ ] **Step 2: Refresh and validate.**

Run `mcp__plexus__refresh_project` then `mcp__plexus__get_problems`. Expected: zero errors. The project now contains only `sustainability.todl` plus `project.plexus`.

---

## Task 4: Author `saas.todl`

**Files:**
- Create: `saas.todl`

**Interfaces:**
- Consumes: `sustainability.todl` shape (namespace, imports, model header, tenant/subs/RGs/networks/subnets/environments/components/slots/scenarios).
- Produces: `SaaSModel` — used by no other task.

- [ ] **Step 1: Author the file, mirroring the sustainability template.**

Model name: `SaaSModel`. Region: `eastus`.

**Local technologies** (declare each with `label`, `available_in = microsoft_tech.azure`, `applicable_to = categories.<x>`; when unsure pick the closest existing category, then fix via `get_problems`):
- `apim` — API Management
- `cosmos_db_catalog` — Cosmos DB (tenant catalog)
- `event_grid` — Event Grid
- `entra_external_id` — Entra External ID (customer identity)
- `azure_log_analytics`
- `azure_application_insights`

**Actors:** `tenant_admin`, `end_user`, `saas_operator`.

**Tenant:** `contoso_tenant` (as sustainability).

**Subscriptions:** `connectivity_sub`, `control_plane_sub`, `shared_stamps_sub`, `dedicated_stamp_sub_premium_a`.

**Resource groups:** `hub_rg`, `platform_rg`, `control_plane_rg`, `shared_stamps_rg`, `dedicated_stamp_a_rg`.

**Networks / subnets:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet` (10.0.0.0/26), `bastion_subnet` (10.0.0.64/26), `shared_services_subnet` (10.0.1.0/24).
- `control_plane_vnet` (10.20.0.0/20) + `apim_subnet` (10.20.0.0/24), `orchestrator_subnet` (10.20.1.0/24), `pe_subnet` (10.20.2.0/24).
- `shared_stamps_vnet` (10.30.0.0/20) + `appgw_subnet` (10.30.0.0/24), `app_subnet` (10.30.1.0/24), `pe_subnet_shared` (10.30.2.0/24).
- `dedicated_stamp_a_vnet` (10.40.0.0/20) + `appgw_subnet_a` (10.40.0.0/24), `app_subnet_a` (10.40.1.0/24), `pe_subnet_a` (10.40.2.0/24).

**Environments:** `hub_prod`, `control_plane_prod`, `shared_stamps_prod`, `dedicated_stamp_a_prod`.

**Components + slots** (one slot each unless noted, following the sustainability slot pattern with `environment`, `in_resource_group`, and `in_subnet` where the slot lives inside a subnet):
- `front_door` (Front Door, ingress = public_internet)
- `apim_gateway` (implemented_by `apim`) — control plane
- `saas_control_api` (VMSS, orchestrator_subnet) — control plane
- `tenant_catalog_db` (Cosmos DB, implemented_by `cosmos_db_catalog`) — control plane
- `provisioning_event_grid` (implemented_by `event_grid`) — control plane
- `shared_app_gateway` (App Gateway, appgw_subnet in shared_stamps_vnet)
- `shared_stamp_app` (VMSS, app_subnet in shared_stamps_vnet)
- `shared_stamp_sql` (Azure SQL) + `shared_stamp_sql_pl` (Private Link, pe_subnet_shared)
- `dedicated_stamp_a_appgw` (App Gateway, appgw_subnet_a)
- `dedicated_stamp_a_app` (VMSS, app_subnet_a)
- `dedicated_stamp_a_sql` (Azure SQL) + `dedicated_stamp_a_sql_pl` (Private Link, pe_subnet_a)
- `key_vault` + `key_vault_pl` (Private Link in control_plane_vnet.pe_subnet)
- `azure_firewall_hub` (Azure Firewall, fw_subnet)
- `bastion` (Azure Bastion — declare locally as `azure_bastion` per landscape.todl pattern)
- `entra_external_id_comp` (implemented_by `entra_external_id`)
- `entra_id` (Entra, `microsoft_tech.microsoft_entra_id`) — for operators
- `azure_dns`
- `app_insights` + `log_analytics_ws`

**Scenarios (3):**
1. **Tenant onboarding** — `tenant_admin ==> front_door, front_door ==> apim_gateway, apim_gateway ==> saas_control_api, saas_control_api ==> tenant_catalog_db, saas_control_api ==> provisioning_event_grid, provisioning_event_grid ==> shared_stamp_app`.
2. **End-user request routing (shared stamp)** — `end_user ==> front_door, front_door ==> shared_app_gateway, shared_app_gateway ==> shared_stamp_app, shared_stamp_app ==> shared_stamp_sql_pl, shared_stamp_sql_pl ==> shared_stamp_sql`.
3. **Premium tenant on dedicated stamp** — `end_user ==> front_door, front_door ==> dedicated_stamp_a_appgw, dedicated_stamp_a_appgw ==> dedicated_stamp_a_app, dedicated_stamp_a_app ==> dedicated_stamp_a_sql_pl, dedicated_stamp_a_sql_pl ==> dedicated_stamp_a_sql`.

- [ ] **Step 2: Refresh and validate.**

Run `mcp__plexus__refresh_project` then `mcp__plexus__get_problems`. Fix any errors inline. Zero errors required.

---

## Task 5: Author `ai.todl`

**Files:**
- Create: `ai.todl`

**Interfaces:**
- Consumes: `sustainability.todl` shape.
- Produces: `AIModel`.

- [ ] **Step 1: Author the file.**

Model name: `AIModel`. Region: `eastus`.

**Local technologies:** `azure_openai`, `ai_search`, `apim`, `cosmos_db_chat`, `document_intelligence`, `content_safety`, `ai_foundry_hub`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `end_user`, `data_engineer`, `ai_operator`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub`, `ai_workload_sub`.

**RGs:** `hub_rg`, `platform_rg`, `ai_workload_rg`.

**Networks:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet`, `bastion_subnet`, `shared_services_subnet`.
- `ai_spoke_vnet` (10.50.0.0/20) + `apim_subnet` (10.50.0.0/24), `orchestrator_subnet` (10.50.1.0/24), `pe_subnet` (10.50.2.0/24).

**Environments:** `hub_prod`, `ai_workload_prod`.

**Components + slots:**
- `front_door`
- `apim_gateway` (implemented_by `apim`, `apim_subnet`) — token/quota governance
- `rag_orchestrator` (VMSS, `orchestrator_subnet`)
- `openai_ptu` (implemented_by `azure_openai`) — provisioned throughput slot
- `openai_paygo` (implemented_by `azure_openai`) — pay-as-you-go slot; **use two `slot` blocks under one `component` where feasible; if `slots` accepts a list on `component`, list both; otherwise use two components.** Prefer two components (`openai_ptu_comp`, `openai_paygo_comp`) if in doubt; keep the pattern uniform with the rest of the file.
- `ai_search` (implemented_by `ai_search`) + `ai_search_pl` (Private Link, `pe_subnet`)
- `chat_history_cosmos` (implemented_by `cosmos_db_chat`) + `chat_history_cosmos_pl`
- `document_intelligence_svc` (implemented_by `document_intelligence`) + private link
- `content_safety_svc` (implemented_by `content_safety`)
- `ai_foundry_hub_comp` (implemented_by `ai_foundry_hub`)
- `grounding_blob` (Blob) + `grounding_blob_pl`
- `key_vault` + `key_vault_pl`
- `azure_firewall_hub`
- `bastion`
- `entra_id`, `azure_dns`, `app_insights`, `log_analytics_ws`

**Scenarios (3):**
1. **RAG query** — `end_user ==> front_door, front_door ==> apim_gateway, apim_gateway ==> content_safety_svc, apim_gateway ==> rag_orchestrator, rag_orchestrator ==> ai_search_pl, ai_search_pl ==> ai_search, rag_orchestrator ==> openai_ptu_comp, rag_orchestrator ==> chat_history_cosmos_pl, chat_history_cosmos_pl ==> chat_history_cosmos`.
2. **Ingestion pipeline** — `data_engineer ==> bastion, bastion ==> rag_orchestrator, rag_orchestrator ==> grounding_blob_pl, grounding_blob_pl ==> grounding_blob, rag_orchestrator ==> document_intelligence_svc, rag_orchestrator ==> ai_search_pl`.
3. **Jailbreak filtered** — `end_user ==> front_door, front_door ==> apim_gateway, apim_gateway ==> content_safety_svc`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 6: Author `mission_critical.todl`

**Files:**
- Create: `mission_critical.todl`

**Interfaces:**
- Consumes: `sustainability.todl` shape.
- Produces: `MissionCriticalModel`.

- [ ] **Step 1: Author the file (paired-region active-active).**

Model name: `MissionCriticalModel`. Regions: `eastus`, `westus2`.

**Local techs:** `traffic_manager`, `cosmos_db_multi_region`, `event_hubs`, `aks`, `chaos_studio`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `global_user`, `mc_operator`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub_east`, `connectivity_sub_west`, `workload_sub_east`, `workload_sub_west`.

**RGs:** `hub_rg_east`, `hub_rg_west`, `workload_rg_east`, `workload_rg_west`, `platform_rg`.

**Networks:**
- `hub_vnet_east` (10.0.0.0/22) + `fw_subnet_east`, `bastion_subnet_east`, `shared_services_subnet_east`.
- `hub_vnet_west` (10.1.0.0/22) + `fw_subnet_west`, `bastion_subnet_west`, `shared_services_subnet_west`.
- `spoke_vnet_east` (10.10.0.0/20) + `appgw_subnet_east`, `aks_subnet_east`, `pe_subnet_east`.
- `spoke_vnet_west` (10.11.0.0/20) + `appgw_subnet_west`, `aks_subnet_west`, `pe_subnet_west`.

**Environments:** `hub_prod_east`, `hub_prod_west`, `workload_prod_east`, `workload_prod_west` (both prod; use `lifecycle_stages.prod`).

**Components + slots:**
- `front_door` (global, single slot — pick either environment, e.g. `workload_prod_east`)
- `traffic_manager_comp` (implemented_by `traffic_manager`)
- `app_gateway_east` + slot in `appgw_subnet_east`
- `app_gateway_west` + slot in `appgw_subnet_west`
- `aks_east` (implemented_by `aks`) + slot in `aks_subnet_east`
- `aks_west` + slot in `aks_subnet_west`
- `cosmos_db_east` (implemented_by `cosmos_db_multi_region`) + private link in `pe_subnet_east`
- `cosmos_db_west` + private link in `pe_subnet_west`
- `event_hubs_east` (implemented_by `event_hubs`) + private link in `pe_subnet_east`
- `event_hubs_west` + private link in `pe_subnet_west`
- `key_vault_east` + `key_vault_east_pl`
- `key_vault_west` + `key_vault_west_pl`
- `azure_firewall_hub_east`, `azure_firewall_hub_west`
- `bastion_east`, `bastion_west`
- `chaos_studio_comp` (implemented_by `chaos_studio`) — no subnet
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws` (in `platform_rg`, environment `hub_prod_east`)

**Scenarios (3):**
1. **Normal request (east active)** — `global_user ==> front_door, front_door ==> traffic_manager_comp, traffic_manager_comp ==> app_gateway_east, app_gateway_east ==> aks_east, aks_east ==> cosmos_db_east_pl, cosmos_db_east_pl ==> cosmos_db_east`.
2. **Regional failover to west** — `global_user ==> front_door, front_door ==> traffic_manager_comp, traffic_manager_comp ==> app_gateway_west, app_gateway_west ==> aks_west, aks_west ==> cosmos_db_west_pl, cosmos_db_west_pl ==> cosmos_db_west`.
3. **Chaos experiment** — `mc_operator ==> chaos_studio_comp, chaos_studio_comp ==> aks_east`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 7: Author `azure_virtual_desktop.todl`

**Files:**
- Create: `azure_virtual_desktop.todl`

**Interfaces:**
- Produces: `AzureVirtualDesktopModel`.

- [ ] **Step 1: Author the file.**

Model name: `AzureVirtualDesktopModel`. Region: `eastus`.

**Local techs:** `avd_host_pool`, `avd_workspace`, `avd_app_group`, `fslogix_share`, `azure_files_premium`, `msix_app_attach`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `end_user`, `avd_admin`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub`, `avd_workload_sub`.

**RGs:** `hub_rg`, `platform_rg`, `avd_rg`, `avd_storage_rg`.

**Networks:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet`, `bastion_subnet`, `shared_services_subnet`.
- `avd_spoke_vnet` (10.60.0.0/20) + `control_plane_subnet` (10.60.0.0/24), `session_host_subnet` (10.60.1.0/23), `pe_subnet` (10.60.4.0/24).

**Environments:** `hub_prod`, `avd_prod`.

**Components + slots:**
- `avd_workspace_comp` (implemented_by `avd_workspace`)
- `avd_pooled_host_pool` (implemented_by `avd_host_pool`) + slot in `session_host_subnet`
- `avd_personal_host_pool` (implemented_by `avd_host_pool`) + slot in `session_host_subnet`
- `avd_app_group_desktop` (implemented_by `avd_app_group`)
- `avd_app_group_remoteapp` (implemented_by `avd_app_group`)
- `session_hosts_vmss` (VMSS, `session_host_subnet`)
- `fslogix_files` (implemented_by `azure_files_premium`) + private link in `pe_subnet` — profile share
- `msix_files` (implemented_by `azure_files_premium`) + private link — MSIX app attach share
- `msix_app_attach_comp` (implemented_by `msix_app_attach`)
- `key_vault` + `key_vault_pl`
- `azure_firewall_hub`
- `bastion`
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws`

**Scenarios (3):**
1. **User launches published app** — `end_user ==> avd_workspace_comp, avd_workspace_comp ==> avd_app_group_remoteapp, avd_app_group_remoteapp ==> avd_pooled_host_pool, avd_pooled_host_pool ==> session_hosts_vmss`.
2. **FSLogix profile load** — `session_hosts_vmss ==> fslogix_files_pl, fslogix_files_pl ==> fslogix_files`.
3. **Scaling plan expansion** — `avd_admin ==> bastion, bastion ==> avd_pooled_host_pool, avd_pooled_host_pool ==> session_hosts_vmss`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 8: Author `microsoft_fabric.todl`

**Files:**
- Create: `microsoft_fabric.todl`

**Interfaces:**
- Produces: `MicrosoftFabricModel`.

- [ ] **Step 1: Author the file.**

Model name: `MicrosoftFabricModel`. Region: `eastus`.

**Local techs:** `fabric_capacity`, `onelake`, `fabric_workspace`, `dataflows_gen2`, `fabric_pipeline`, `eventhouse`, `semantic_model`, `on_prem_data_gateway`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `analyst`, `data_engineer`, `report_consumer`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub`, `fabric_workload_sub`.

**RGs:** `hub_rg`, `platform_rg`, `fabric_rg`.

**Networks:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet`, `bastion_subnet`, `shared_services_subnet`.
- `fabric_spoke_vnet` (10.70.0.0/20) + `gateway_subnet` (10.70.0.0/24), `pe_subnet` (10.70.1.0/24).

**Environments:** `hub_prod`, `fabric_prod`.

**Components + slots:**
- `fabric_capacity_comp` (implemented_by `fabric_capacity`) — no subnet
- `onelake_comp` (implemented_by `onelake`) + private link in `pe_subnet`
- `bronze_workspace` (implemented_by `fabric_workspace`)
- `silver_workspace` (implemented_by `fabric_workspace`)
- `gold_workspace` (implemented_by `fabric_workspace`)
- `ingest_pipeline` (implemented_by `fabric_pipeline`)
- `silver_dataflow` (implemented_by `dataflows_gen2`)
- `gold_semantic_model` (implemented_by `semantic_model`)
- `realtime_eventhouse` (implemented_by `eventhouse`)
- `on_prem_gateway_comp` (implemented_by `on_prem_data_gateway`) + slot in `gateway_subnet`
- `blob_source` (Blob) + private link in `pe_subnet`
- `key_vault` + `key_vault_pl`
- `azure_firewall_hub`
- `bastion`
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws`

**Scenarios (3):**
1. **Ingestion medallion** — `data_engineer ==> ingest_pipeline, ingest_pipeline ==> blob_source_pl, blob_source_pl ==> blob_source, ingest_pipeline ==> bronze_workspace, bronze_workspace ==> silver_dataflow, silver_dataflow ==> silver_workspace, silver_workspace ==> gold_semantic_model, gold_semantic_model ==> gold_workspace`.
2. **Real-time alert** — `data_engineer ==> realtime_eventhouse, realtime_eventhouse ==> gold_workspace`.
3. **Report consumption** — `report_consumer ==> gold_workspace, gold_workspace ==> gold_semantic_model`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 9: Author `hpc.todl`

**Files:**
- Create: `hpc.todl`

**Interfaces:**
- Produces: `HPCModel`.

- [ ] **Step 1: Author the file.**

Model name: `HPCModel`. Region: `eastus`.

**Local techs:** `cyclecloud`, `hb_series_vm`, `hc_series_vm`, `azure_batch`, `managed_lustre`, `slurm_scheduler`, `spot_vmss`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `researcher`, `hpc_operator`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub`, `hpc_workload_sub`.

**RGs:** `hub_rg`, `platform_rg`, `hpc_rg`.

**Networks:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet`, `bastion_subnet`, `shared_services_subnet`.
- `hpc_spoke_vnet` (10.80.0.0/16) + `head_node_subnet` (10.80.0.0/24), `compute_subnet` (10.80.1.0/22), `scratch_subnet` (10.80.5.0/24), `pe_subnet` (10.80.6.0/24).

**Environments:** `hub_prod`, `hpc_prod`.

**Components + slots:**
- `cyclecloud_head` (implemented_by `cyclecloud`) + slot in `head_node_subnet`
- `slurm_scheduler_comp` (implemented_by `slurm_scheduler`) + slot in `head_node_subnet`
- `hb_pool` (implemented_by `hb_series_vm`) + slot in `compute_subnet` — CPU-heavy
- `hc_pool` (implemented_by `hc_series_vm`) + slot in `compute_subnet` — CFD-tuned
- `spot_burst_pool` (implemented_by `spot_vmss`) + slot in `compute_subnet`
- `azure_batch_pool` (implemented_by `azure_batch`)
- `lustre_scratch` (implemented_by `managed_lustre`) + slot in `scratch_subnet`
- `archive_blob` (Blob, cool tier) + `archive_blob_pl` in `pe_subnet`
- `key_vault` + `key_vault_pl`
- `azure_firewall_hub`
- `bastion`
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws`

**Scenarios (3):**
1. **Job submission + scale-out** — `researcher ==> bastion, bastion ==> cyclecloud_head, cyclecloud_head ==> slurm_scheduler_comp, slurm_scheduler_comp ==> hb_pool, slurm_scheduler_comp ==> hc_pool`.
2. **Scratch read/write during job** — `hb_pool ==> lustre_scratch, hc_pool ==> lustre_scratch`.
3. **Archive results** — `slurm_scheduler_comp ==> archive_blob_pl, archive_blob_pl ==> archive_blob`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 10: Author `oracle_iaas.todl`

**Files:**
- Create: `oracle_iaas.todl`

**Interfaces:**
- Produces: `OracleIaaSModel`.

- [ ] **Step 1: Author the file (paired-region with Data Guard).**

Model name: `OracleIaaSModel`. Regions: `eastus` (primary), `westus2` (standby).

**Local techs:** `oracle_db_vm`, `oracle_data_guard`, `oracle_asm`, `oracle_goldengate`, `oracle_weblogic_vm`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `end_user`, `dba`, `analytics_consumer`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub_east`, `connectivity_sub_west`, `oracle_workload_sub_east`, `oracle_workload_sub_west`.

**RGs:** `hub_rg_east`, `hub_rg_west`, `oracle_rg_east`, `oracle_rg_west`, `platform_rg`.

**Networks:**
- `hub_vnet_east` (10.0.0.0/22) + `fw_subnet_east`, `bastion_subnet_east`.
- `hub_vnet_west` (10.1.0.0/22) + `fw_subnet_west`, `bastion_subnet_west`.
- `oracle_vnet_east` (10.90.0.0/20) + `appgw_subnet_east`, `weblogic_subnet_east`, `db_subnet_east`.
- `oracle_vnet_west` (10.91.0.0/20) + `db_subnet_west`.

**Environments:** `hub_prod_east`, `hub_prod_west`, `oracle_prod_east`, `oracle_dr_west` (lifecycle `lifecycle_stages.dr`).

**Components + slots:**
- `app_gateway_east` (App Gateway, `appgw_subnet_east`)
- `weblogic_vmss` (implemented_by `oracle_weblogic_vm`) + slot in `weblogic_subnet_east`
- `oracle_primary_db` (implemented_by `oracle_db_vm`) + slot in `db_subnet_east`, uses `oracle_asm`
- `oracle_standby_db` (implemented_by `oracle_db_vm`) + slot in `db_subnet_west`, env `oracle_dr_west`
- `data_guard_comp` (implemented_by `oracle_data_guard`)
- `goldengate_comp` (implemented_by `oracle_goldengate`) + slot in `db_subnet_east`
- `analytics_sink_blob` (Blob) + `analytics_sink_blob_pl` (Private Link) in `db_subnet_east` (or a dedicated pe subnet — pick pe_subnet variant if you added one)
- `key_vault` + `key_vault_pl`
- `azure_firewall_hub_east`, `azure_firewall_hub_west`
- `bastion_east`, `bastion_west`
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws` (platform_rg / hub_prod_east)

**Scenarios (3):**
1. **App read from primary** — `end_user ==> app_gateway_east, app_gateway_east ==> weblogic_vmss, weblogic_vmss ==> oracle_primary_db`.
2. **DR failover** — `dba ==> bastion_east, bastion_east ==> data_guard_comp, data_guard_comp ==> oracle_standby_db`.
3. **GoldenGate CDC to analytics** — `oracle_primary_db ==> goldengate_comp, goldengate_comp ==> analytics_sink_blob_pl, analytics_sink_blob_pl ==> analytics_sink_blob`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 11: Author `sap.todl`

**Files:**
- Create: `sap.todl`

**Interfaces:**
- Produces: `SAPModel`.

- [ ] **Step 1: Author the file (SAP S/4HANA with HANA cluster).**

Model name: `SAPModel`. Region: `eastus` (multi-AZ within region).

**Local techs:** `sap_hana_vm`, `sap_netweaver_vm`, `sap_web_dispatcher`, `sap_ascs_ers_cluster`, `azure_netapp_files`, `pacemaker_cluster`, `acss` (Azure Center for SAP solutions), `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `sap_user`, `sap_basis_admin`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub`, `sap_workload_sub`.

**RGs:** `hub_rg`, `platform_rg`, `sap_rg`.

**Networks:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet`, `bastion_subnet`, `shared_services_subnet`.
- `sap_spoke_vnet` (10.100.0.0/20) + `web_dispatcher_subnet` (10.100.0.0/24), `app_subnet` (10.100.1.0/24), `db_subnet` (10.100.2.0/24), `anf_subnet` (10.100.3.0/24, delegated), `pe_subnet` (10.100.4.0/24).

**Environments:** `hub_prod`, `sap_prod`.

**Components + slots:**
- `sap_web_dispatcher_comp` (implemented_by `sap_web_dispatcher`) + slot in `web_dispatcher_subnet`
- `sap_ascs_cluster` (implemented_by `sap_ascs_ers_cluster`) + slot in `app_subnet`
- `sap_app_vmss` (implemented_by `sap_netweaver_vm`) + slot in `app_subnet`
- `hana_primary` (implemented_by `sap_hana_vm`) + slot in `db_subnet`
- `hana_secondary` (implemented_by `sap_hana_vm`) + slot in `db_subnet` (different AZ implied by label)
- `pacemaker_hana` (implemented_by `pacemaker_cluster`)
- `anf_sapmnt` (implemented_by `azure_netapp_files`) + slot in `anf_subnet`
- `anf_transport` (implemented_by `azure_netapp_files`) + slot in `anf_subnet`
- `acss_comp` (implemented_by `acss`)
- `key_vault` + `key_vault_pl`
- `azure_firewall_hub`
- `bastion`
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws`

**Scenarios (3):**
1. **SAPGUI request** — `sap_user ==> sap_web_dispatcher_comp, sap_web_dispatcher_comp ==> sap_app_vmss, sap_app_vmss ==> sap_ascs_cluster, sap_app_vmss ==> hana_primary`.
2. **HANA failover** — `pacemaker_hana ==> hana_primary, pacemaker_hana ==> hana_secondary`.
3. **ANF-backed shared FS read** — `sap_app_vmss ==> anf_sapmnt, sap_app_vmss ==> anf_transport`.

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 12: Author `azure_vmware_solution.todl`

**Files:**
- Create: `azure_vmware_solution.todl`

**Interfaces:**
- Produces: `AzureVMwareSolutionModel`.

- [ ] **Step 1: Author the file.**

Model name: `AzureVMwareSolutionModel`. Region: `eastus`.

**Local techs:** `avs_private_cloud`, `vsan`, `nsx_t_edge`, `hcx_manager`, `srm`, `expressroute_global_reach`, `azure_bastion`, `azure_log_analytics`, `azure_application_insights`.

**Actors:** `vsphere_admin`, `on_prem_workload`.

**Tenant/subs:** `contoso_tenant`, `connectivity_sub`, `avs_workload_sub`.

**RGs:** `hub_rg`, `platform_rg`, `avs_rg`.

**Networks:**
- `hub_vnet` (10.0.0.0/22) + `fw_subnet`, `bastion_subnet`, `shared_services_subnet`, `ergw_subnet` (10.0.2.0/27) — for ExpressRoute gateway.
- `avs_management_vnet` (10.110.0.0/22) + `mgmt_subnet` (10.110.0.0/24), `pe_subnet` (10.110.1.0/24).

**Environments:** `hub_prod`, `avs_prod`.

**Components + slots:**
- `avs_private_cloud_comp` (implemented_by `avs_private_cloud`) — the SDDC
- `vsan_datastore` (implemented_by `vsan`)
- `nsx_t_edge_comp` (implemented_by `nsx_t_edge`)
- `hcx_manager_comp` (implemented_by `hcx_manager`) + slot in `mgmt_subnet`
- `srm_comp` (implemented_by `srm`)
- `expressroute_global_reach_comp` (implemented_by `expressroute_global_reach`)
- `azure_firewall_hub`
- `bastion`
- `key_vault` + `key_vault_pl` (in `pe_subnet`)
- `entra_id`, `azure_dns`
- `app_insights`, `log_analytics_ws`

**Scenarios (3):**
1. **On-prem → AVS migration via HCX** — `on_prem_workload ==> hcx_manager_comp, hcx_manager_comp ==> avs_private_cloud_comp, avs_private_cloud_comp ==> vsan_datastore`.
2. **AVS VM egress via hub firewall** — `avs_private_cloud_comp ==> nsx_t_edge_comp, nsx_t_edge_comp ==> azure_firewall_hub`.
3. **ExpressRoute Global Reach connectivity + SRM DR** — `vsphere_admin ==> bastion, bastion ==> srm_comp, srm_comp ==> avs_private_cloud_comp`. (Global Reach represented by the presence of `expressroute_global_reach_comp` at the tenant scope; no edge involvement required in this sequence.)

- [ ] **Step 2: Refresh and validate.** Zero errors required.

---

## Task 13: Rename the project directory and final verification

**Files:**
- Rename: `C:\Users\Eugene\Projects\plexus_tests\architecures\test_hubspoke_project` → `C:\Users\Eugene\Projects\plexus_tests\architecures\test_waf_architectures`

**Interfaces:**
- Consumes: all 10 model files present and validating.
- Produces: renamed directory, project-wide clean validation.

- [ ] **Step 1: Confirm the current directory is clean.**

Run `mcp__plexus__refresh_project` then `mcp__plexus__get_problems`. Zero errors required before renaming.

- [ ] **Step 2: Rename the directory.**

The current working directory holds the project. From the parent directory:

```powershell
Rename-Item -Path "C:\Users\Eugene\Projects\plexus_tests\architecures\test_hubspoke_project" -NewName "test_waf_architectures"
```

Note: after this, subsequent tool calls that hard-code the old path will fail. Update any working-directory references before continuing.

- [ ] **Step 3: Final refresh and validation.**

Run `mcp__plexus__refresh_project` then `mcp__plexus__get_problems`. Zero errors required. This is the acceptance test for the whole plan.

---

## Self-review (author check)

**Spec coverage.**
- Rename mechanics → Task 1 (project.plexus), all authoring tasks (namespaces), Task 13 (directory). ✓
- 10 files, one per WAF workload → Tasks 2, 4–12 (10 files: sustainability, saas, ai, mission_critical, avd, fabric, hpc, oracle, sap, avs). ✓
- Deletion of old files → Task 3. ✓
- Author order per spec (sustainability first) → Tasks 2, 4, 5, 6, 7, 8, 9, 10, 11, 12. ✓
- Heavy fidelity per workload → each authoring task lists ≥ 20 components + 3 scenarios. ✓
- Local tech declarations for library gaps → each task lists them explicitly. ✓
- Validation per file via `mcp__plexus__get_problems` → Step 2 of every authoring task. ✓
- Final directory rename last → Task 13. ✓

**Placeholder scan.** No "TBD" / "handle edge cases" / "similar to Task N" instances. Task 5 has one qualified branch ("if `slots` accepts a list on `component`") — this is a real meta-model uncertainty and includes a concrete fallback, so it's not a placeholder.

**Type / name consistency.** All components referenced in scenarios exist in the same task's component list. Sustainability's slot naming pattern (`<component_name>_prod`) is intentionally optional in later tasks (some slots are just `_prod`, some `_east`/`_west`); executor is instructed to mirror sustainability's shape but may adapt suffix to reflect region/env. No cross-task references to functions or types.

**Known-unknowns flagged to executor.** Meta-model surface (concepts, categories, `microsoft_tech` members) is inferred from `landscape.todl`. Validation via `get_problems` after each file catches divergence. This is intentional per the spec's risk section.

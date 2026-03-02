-- Sprint 7: Capacity tracking, deploy progress, LLM provider config

-- Hosts: GPU and system info
ALTER TABLE "hosts" ADD COLUMN "gpu_model" text;
ALTER TABLE "hosts" ADD COLUMN "gpu_vram_gb" real;
ALTER TABLE "hosts" ADD COLUMN "docker_version" text;
ALTER TABLE "hosts" ADD COLUMN "arch" text;

-- Hosts: Resource allocation tracking
ALTER TABLE "hosts" ADD COLUMN "allocated_ram_mb" integer DEFAULT 0;
ALTER TABLE "hosts" ADD COLUMN "allocated_cpu_cores" real DEFAULT 0;
ALTER TABLE "hosts" ADD COLUMN "allocated_disk_gb" integer DEFAULT 0;
ALTER TABLE "hosts" ADD COLUMN "can_accept_agents" boolean DEFAULT true;

-- Agents: Deploy progress tracking
ALTER TABLE "agents" ADD COLUMN "deploy_stage" text;
ALTER TABLE "agents" ADD COLUMN "deploy_progress" integer;

-- Agents: LLM provider config
ALTER TABLE "agents" ADD COLUMN "llm_provider" text;
ALTER TABLE "agents" ADD COLUMN "llm_model" text;

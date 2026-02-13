ALTER TABLE "hosts" ADD COLUMN "specs_verified" boolean DEFAULT false;
ALTER TABLE "hosts" ADD COLUMN "verified_cpu_cores" integer;
ALTER TABLE "hosts" ADD COLUMN "verified_ram_gb" integer;
ALTER TABLE "hosts" ADD COLUMN "verified_os_info" text;
ALTER TABLE "hosts" ADD COLUMN "verified_at" timestamp;

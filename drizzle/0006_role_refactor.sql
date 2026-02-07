-- Add new enum values
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'default';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'deployer';

-- Rename existing "user" role users to "deployer"  
UPDATE "user" SET role = 'deployer' WHERE role = 'user';

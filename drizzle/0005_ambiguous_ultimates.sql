DROP INDEX "generation_parentId_idx";--> statement-breakpoint
ALTER TABLE "generation" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "generation" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "generation" DROP COLUMN "prompt";
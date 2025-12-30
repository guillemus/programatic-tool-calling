ALTER TABLE "generation" RENAME COLUMN "step_number" TO "parent_id";--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "type" text DEFAULT 'final' NOT NULL;--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "prompt" text;--> statement-breakpoint
CREATE INDEX "generation_parentId_idx" ON "generation" USING btree ("parent_id");
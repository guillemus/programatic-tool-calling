CREATE TABLE "generation" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"step_number" integer NOT NULL,
	"image_data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_threadId_idx" ON "generation" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "thread_userId_idx" ON "thread" USING btree ("user_id");
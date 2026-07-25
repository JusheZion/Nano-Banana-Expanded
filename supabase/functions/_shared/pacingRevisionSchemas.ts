import { z } from 'npm:zod@3.23.8';

export const pacingRevisionLayerSchema = z.enum(['outline', 'beats', 'dialogue']);
export const pacingRevisionDecisionSchema = z.enum(['pending', 'approved', 'rejected']);
export const pacingRevisionGenerationStatusSchema = z.enum([
  'pending',
  'ready',
  'failed',
  'stale',
  'locked',
  'applied',
]);
export const pacingRevisionSetStatusSchema = z.enum([
  'generating',
  'partially_ready',
  'ready',
  'applying',
  'applied',
  'failed',
  'discarded',
]);

export const pacingRevisionFailureSchema = z.object({
  page_number: z.number().int().positive().max(500),
  reason: z.string().min(1).max(4000),
  item_id: z.string().uuid().optional(),
}).strict();

export const pacingRevisionProgressSchema = z.object({
  total_pages: z.number().int().nonnegative().max(500).default(0),
  completed_pages: z.array(z.number().int().positive().max(500)).max(500).default([]),
  current_page: z.number().int().positive().max(500).nullable().default(null),
  stopped: z.boolean().default(false),
}).strict();

export const pacingRevisionChangeSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  layer: pacingRevisionLayerSchema,
  target_key: z.string().min(1).max(240),
  page_id: z.string().uuid().nullable().optional(),
  page_number: z.number().int().positive().max(500).nullable().optional(),
  current_value: z.unknown().nullable(),
  ai_proposal: z.unknown().refine((value) => value !== undefined, {
    message: 'An immutable AI proposal is required.',
  }),
  edited_candidate: z.unknown().nullable().default(null),
  decision: pacingRevisionDecisionSchema,
  dependency_ids: z.array(z.string().uuid()).max(100),
  reason: z.string().min(1).max(4000),
  source_fingerprint: z.string().min(1).max(240),
  generation_status: pacingRevisionGenerationStatusSchema,
  applied_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export const pacingRevisionItemSchema = z.object({
  id: z.string().uuid(),
  revision_set_id: z.string().uuid(),
  position: z.number().int().nonnegative().max(500),
  title: z.string().min(1).max(240),
  rationale: z.string().min(1).max(4000),
  affected_page_numbers: z.array(z.number().int().positive().max(500)).max(500),
  generation_status: pacingRevisionGenerationStatusSchema,
  changes: z.array(pacingRevisionChangeSchema).max(1000).default([]),
}).strict();

export const pacingRevisionSetSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
  source_outline_id: z.string().uuid().nullable().optional(),
  status: pacingRevisionSetStatusSchema,
  pacing_review_json: z.unknown(),
  source_outline_json: z.unknown(),
  proposed_outline_json: z.unknown().nullable().default(null),
  source_fingerprint: z.string().min(1).max(240),
  progress_json: pacingRevisionProgressSchema,
  failure_ledger: z.array(pacingRevisionFailureSchema).max(500),
  apply_snapshot: z.unknown().nullable().optional(),
  recovery_status: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  items: z.array(pacingRevisionItemSchema).max(100).default([]),
}).strict();

export const pacingRevisionDecisionPatchSchema = z.object({
  decision: pacingRevisionDecisionSchema.optional(),
  edited_candidate: z.unknown().nullable().optional(),
}).strict().refine((patch) => Object.keys(patch).length > 0, {
  message: 'At least one decision field is required.',
});

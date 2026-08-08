import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const noteCategories = [
  'Power Conversion',
  'Power Magnetics',
  'Digital Power & Control',
  'Wireless Power',
  'Design & Lab',
] as const;

export const noteTypes = [
  'Deep Dive',
  'Design Note',
  'Lab Note',
  'Research Note',
  'Tool',
] as const;

export const noteVisuals = [
  'architecture-flow',
  'transformer-stack',
  'control-bandwidth',
  'zvs-orbit',
] as const;

const notes = defineCollection({
  loader: glob({
    base: './src/content/notes',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(noteCategories),
    tags: z.array(z.string().min(1)).default([]),
    series: z.string().min(1).optional(),
    type: z.enum(noteTypes),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    cover: z.string().min(1).optional(),
    authors: z.array(z.string().min(1)).default([]),
    references: z
      .array(
        z.object({
          title: z.string().min(1),
          url: z.url().optional(),
        }),
      )
      .default([]),
    visual: z.enum(noteVisuals),
    featureSize: z.enum(['wide', 'narrow']).default('narrow'),
    featuredOrder: z.number().int().positive().optional(),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { notes };

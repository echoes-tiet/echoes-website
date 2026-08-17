import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    authorRole: z.string().optional(),
    publishedLabel: z.string().optional(),
    cover: z.string().optional(),
    excerpt: z.string().optional(),
  }),
});

const editions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/editions' }),
  schema: z.object({
    number: z.number(),
    title: z.string(),
    subtitle: z.string().optional(),
    cover: z.string().optional(),
    embedUrl: z.string().optional(),
    blurb: z.string().optional(),
  }),
});

const newsletters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/newsletters' }),
  schema: z.object({
    title: z.string(),
    cover: z.string().optional(),
    embedUrl: z.string().optional(),
    blurb: z.string().optional(),
    order: z.number().optional(),
  }),
});

const interviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/interviews' }),
  schema: z.object({
    title: z.string(),
    photo: z.string().optional(),
  }),
});

const bulletin = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bulletin' }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    cover: z.string().optional(),
    order: z.number().optional(),
  }),
});

const members = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/members' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    section: z.enum(['Faculty', 'Executive Board', 'Core']),
    photo: z.string().optional(),
    socials: z
      .array(z.object({ platform: z.string(), url: z.string() }))
      .optional(),
    order: z.number().optional(),
  }),
});

export const collections = {
  blog,
  editions,
  newsletters,
  interviews,
  bulletin,
  members,
};

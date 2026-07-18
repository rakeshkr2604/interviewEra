import { describe, expect, it } from 'vitest';
import {
  canonicalizeSkill,
  canonicalizeSkills,
  canonicalSkillNames,
} from '@/lib/resume/skill-canonicalize';

describe('canonicalizeSkill', () => {
  it('collapses React aliases to React', () => {
    expect(canonicalizeSkill('React')).toBe('React');
    expect(canonicalizeSkill('react.js')).toBe('React');
    expect(canonicalizeSkill('ReactJS')).toBe('React');
    expect(canonicalizeSkill('ReactJS 18')).toBe('React');
    expect(canonicalizeSkill('react 18')).toBe('React');
  });

  it('collapses Node aliases to Node.js', () => {
    expect(canonicalizeSkill('Node')).toBe('Node.js');
    expect(canonicalizeSkill('NodeJS')).toBe('Node.js');
    expect(canonicalizeSkill('node.js')).toBe('Node.js');
  });

  it('normalizes punctuation and case for known aliases', () => {
    expect(canonicalizeSkill('TypeScript')).toBe('TypeScript');
    expect(canonicalizeSkill('typescript')).toBe('TypeScript');
    expect(canonicalizeSkill('postgres')).toBe('PostgreSQL');
    expect(canonicalizeSkill('k8s')).toBe('Kubernetes');
  });

  it('preserves official brand capitalization (no title-case flattening)', () => {
    expect(canonicalizeSkill('Tailwind CSS')).toBe('Tailwind CSS');
    expect(canonicalizeSkill('tailwindcss')).toBe('Tailwind CSS');
    expect(canonicalizeSkill('OpenAI API')).toBe('OpenAI API');
    expect(canonicalizeSkill('openai apis')).toBe('OpenAI API');
    expect(canonicalizeSkill('GitHub')).toBe('GitHub');
    expect(canonicalizeSkill('github')).toBe('GitHub');
    expect(canonicalizeSkill('MongoDB')).toBe('MongoDB');
    expect(canonicalizeSkill('PostgreSQL')).toBe('PostgreSQL');
    expect(canonicalizeSkill('Node.js')).toBe('Node.js');
    expect(canonicalizeSkill('Next.js')).toBe('Next.js');
    expect(canonicalizeSkill('JavaScript')).toBe('JavaScript');
    expect(canonicalizeSkill('GraphQL')).toBe('GraphQL');
    expect(canonicalizeSkill('MySQL')).toBe('MySQL');
    expect(canonicalizeSkill('REST API')).toBe('REST API');
    expect(canonicalizeSkill('rest apis')).toBe('REST API');
    expect(canonicalizeSkill('CI/CD')).toBe('CI/CD');
    expect(canonicalizeSkill('ci/cd')).toBe('CI/CD');
    expect(canonicalizeSkill('FastAPI')).toBe('FastAPI');
    expect(canonicalizeSkill('Fastapi')).toBe('FastAPI');
    expect(canonicalizeSkill('fastapi')).toBe('FastAPI');
    expect(canonicalizeSkill('OOP')).toBe('OOP');
    expect(canonicalizeSkill('Oop')).toBe('OOP');
    expect(canonicalizeSkill('JWT')).toBe('JWT');
    expect(canonicalizeSkill('Jwt')).toBe('JWT');
    expect(canonicalizeSkill('ORM')).toBe('ORM');
    expect(canonicalizeSkill('SDK')).toBe('SDK');
    expect(canonicalizeSkill('API')).toBe('API');
    expect(canonicalizeSkill('gRPC')).toBe('gRPC');
    expect(canonicalizeSkill('Grpc')).toBe('gRPC');
    expect(canonicalizeSkill('NoSQL')).toBe('NoSQL');
    expect(canonicalizeSkill('HTML')).toBe('HTML');
    expect(canonicalizeSkill('CSS')).toBe('CSS');
    expect(canonicalizeSkill('AWS')).toBe('AWS');
    expect(canonicalizeSkill('GCP')).toBe('GCP');
  });
});

describe('canonicalizeSkills', () => {
  it('dedupes by canonical and preserves raw', () => {
    const out = canonicalizeSkills(['ReactJS', 'react.js', 'Node', 'Node.js', 'WeirdSkill']);
    expect(out).toEqual([
      { raw: 'ReactJS', canonical: 'React' },
      { raw: 'Node', canonical: 'Node.js' },
      { raw: 'WeirdSkill', canonical: 'Weirdskill' },
    ]);
  });

  it('canonicalSkillNames returns display list for interview context', () => {
    expect(canonicalSkillNames(['react.js', 'NODE', 'react'])).toEqual(['React', 'Node.js']);
  });
});

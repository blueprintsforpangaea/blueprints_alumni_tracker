// Self-check for the pure career logic. No framework — run it directly:
//   node --experimental-strip-types lib/careers.check.ts
// It exits non-zero on the first failed assertion.

import assert from 'node:assert/strict'
import {
  buildCareerIndex,
  buildExperiencesWithMembers,
  computeCareerStats,
  groupByCompany,
} from './careers.ts'
import type { Profile, WorkExperience } from './types.ts'

function profile(id: string, name: string, over: Partial<Profile> = {}): Profile {
  return {
    id,
    clerk_id: `clerk_${id}`,
    full_name: name,
    graduation_year: 2026,
    major: null,
    minor: null,
    bio: null,
    phone_number: null,
    linkedin_url: null,
    github_url: null,
    instagram_url: null,
    contact_email: null,
    avatar_url: null,
    banner_url: null,
    is_admin: false,
    created_at: '2026-01-01T00:00:00.000Z',
    status: 'Current Member',
    team: [],
    role_title: null,
    location: null,
    hometown: null,
    skills: [],
    hobbies: [],
    current_classes: [],
    chapter_role: null,
    big_id: null,
    family_tree_id: null,
    fun_fact: null,
    open_to_chat: false,
    ...over,
  }
}

function experience(
  id: string,
  profileId: string,
  company: string,
  role: string,
  over: Partial<WorkExperience> = {}
): WorkExperience {
  return {
    id,
    profile_id: profileId,
    company,
    role,
    start_date: '2026-01-01',
    end_date: null,
    description: null,
    employment_type: 'Internship',
    industry: null,
    location: null,
    company_website: null,
    is_current: false,
    ...over,
  }
}

const amy = profile('p1', 'Amy Chen', { status: 'Alumni' })
const ben = profile('p2', 'Ben Ortiz', { status: 'Current Member' })
const cara = profile('p3', 'Cara Liu', { status: 'Alumni' })

const experiences = [
  // Amy has two Google roles — she is one contact, not two.
  experience('e1', 'p1', 'Google', 'SWE Intern', { industry: 'Tech' }),
  experience('e2', 'p1', 'google', 'SWE II', { industry: 'Tech', start_date: '2026-06-01' }),
  experience('e3', 'p2', 'Google', 'PM Intern', { industry: 'Tech' }),
  experience('e4', 'p3', 'Jane Street', 'Trader', { industry: 'Finance' }),
]

// ─── rankByKey pairs each name with its own count ─────────────────────────────
// The bug this guards: names were read from an unsorted map by the sorted
// slice's index, so a bar could show one company's name with another's count.

const withMembers = buildExperiencesWithMembers(experiences, [amy, ben, cara])
const stats = computeCareerStats(withMembers)

assert.deepEqual(
  stats.topCompanies,
  [
    { name: 'Google', count: 3 },
    { name: 'Jane Street', count: 1 },
  ],
  'top companies must pair each name with its own count, case-insensitively'
)

assert.deepEqual(stats.topIndustries, [
  { name: 'Tech', count: 3 },
  { name: 'Finance', count: 1 },
])

// Every role here is distinct, so counts are all 1 and only the names matter.
assert.equal(stats.topRoles.length, 4)
assert.deepEqual(
  new Set(stats.topRoles.map((r) => r.name)),
  new Set(['SWE Intern', 'SWE II', 'PM Intern', 'Trader'])
)

// ─── groupByCompany counts people, not rows ───────────────────────────────────

const groups = groupByCompany(withMembers)
const google = groups.find((g) => g.company.toLowerCase() === 'google')!

assert.equal(google.experiences.length, 3, 'Google should keep all three roles')
assert.equal(google.uniqueMembers, 2, 'Amy twice at Google is still one member')
assert.equal(google.alumniCount, 1)
assert.equal(google.currentCount, 1)
assert.equal(groups[0].company.toLowerCase(), 'google', 'biggest company sorts first')

// Experiences within a group run newest first.
assert.equal(google.experiences[0].start_date, '2026-06-01')

// ─── buildExperiencesWithMembers survives a missing profile ───────────────────

const orphan = buildExperiencesWithMembers([experience('e9', 'gone', 'Acme', 'Intern')], [])
assert.equal(orphan[0].member_name, 'Unknown member')
assert.equal(orphan[0].member_status, null)

// Rows without a company or role are dropped — they'd render as blank cards.
assert.equal(buildExperiencesWithMembers([experience('e10', 'p1', '', 'Intern')], [amy]).length, 0)

// ─── buildCareerIndex dedupes per member ──────────────────────────────────────

const index = buildCareerIndex(experiences)
assert.deepEqual(index.p1.companies, ['Google', 'google'], 'keeps each spelling as written')
assert.deepEqual(index.p1.roles, ['SWE Intern', 'SWE II'])
assert.deepEqual(index.p1.industries, ['Tech'], 'industry appears once despite two roles')
assert.equal(index.gone, undefined)

console.log('careers checks passed')

import { Client } from '@notionhq/client'
import { unstable_cache, revalidateTag } from 'next/cache'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Profile, MemberStatus, WorkExperience, EmploymentType, Club, FamilyTree } from './types'
import { normalizeTeamName } from './teams'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

// ─── Cache tags ──────────────────────────────────────────────────────────────
// The heavy, network-bound reads below are wrapped in `unstable_cache` so repeat
// navigations reuse a result instead of re-hitting Notion. Mutations call
// `revalidateTag` so edits made through the app appear immediately; the 60s TTL
// is the backstop for edits made directly in Notion (the source of truth).
export const CACHE_TAGS = {
  profiles: 'profiles',
  workExperiences: 'work-experiences',
  familyTrees: 'family-trees',
} as const

const CACHE_TTL_SECONDS = 60

const PROFILES_DB = process.env.NOTION_PROFILES_DB_ID!
const INTERNSHIPS_DB = process.env.NOTION_INTERNSHIPS_DB_ID!
const CLUBS_DB = process.env.NOTION_CLUBS_DB_ID!
const FAMILY_TREES_DB = process.env.NOTION_FAMILY_TREES_DB_ID!

// ─── Property helpers ────────────────────────────────────────────────────────

function getText(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (!p) return ''
  if (p.type === 'title') return p.title[0]?.plain_text ?? ''
  if (p.type === 'rich_text') return p.rich_text[0]?.plain_text ?? ''
  return ''
}

function getNumber(page: PageObjectResponse, prop: string): number | null {
  const p = page.properties[prop]
  return p?.type === 'number' ? p.number : null
}

function getBool(page: PageObjectResponse, prop: string): boolean {
  const p = page.properties[prop]
  return p?.type === 'checkbox' ? p.checkbox : false
}

function getUrl(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'url' ? p.url : null
}

function getPhone(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'phone_number' ? p.phone_number : null
}

function getDate(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'date' ? (p.date?.start ?? null) : null
}

function getSelect(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'select' ? (p.select?.name ?? null) : null
}

// Reads a list property, tolerating legacy `select` data so a Profiles DB
// partway through the schema migration still loads.
function getTeams(page: PageObjectResponse, prop: string): string[] {
  const p = page.properties[prop]
  const rawValues =
    !p
      ? []
      : p.type === 'multi_select'
        ? p.multi_select.map((s) => s.name)
        : p.type === 'select'
          ? (p.select ? [p.select.name] : [])
          : []

  return [...new Set(rawValues.map((name) => normalizeTeamName(name)).filter(Boolean) as string[])]
}

function getMultiSelect(page: PageObjectResponse, prop: string): string[] {
  const p = page.properties[prop]
  return p?.type === 'multi_select' ? p.multi_select.map((s) => s.name) : []
}

function getRelationId(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'relation' ? (p.relation[0]?.id ?? null) : null
}

function getFirstRelationId(page: PageObjectResponse, props: string[]): string | null {
  for (const prop of props) {
    const relationId = getRelationId(page, prop)
    if (relationId !== null) return relationId
  }
  return null
}

function getPageIconUrl(page: PageObjectResponse): string | null {
  if (!page.icon) return null
  if (page.icon.type === 'external') return page.icon.external.url
  if (page.icon.type === 'file') return page.icon.file.url
  return null
}

function getPageCoverUrl(page: PageObjectResponse): string | null {
  if (!page.cover) return null
  if (page.cover.type === 'external') return page.cover.external.url
  if (page.cover.type === 'file') return page.cover.file.url
  return null
}

// ─── Page → Type converters ──────────────────────────────────────────────────

export function pageToProfile(page: PageObjectResponse): Profile {
  return {
    id: page.id,
    clerk_id: getText(page, 'clerk_id'),
    full_name: getText(page, 'Name'),
    graduation_year: getNumber(page, 'graduation_year'),
    major: getText(page, 'major') || null,
    minor: getText(page, 'minor') || null,
    bio: getText(page, 'bio') || null,
    phone_number: getPhone(page, 'phone_number'),
    linkedin_url: getUrl(page, 'linkedin_url'),
    github_url: getUrl(page, 'github_url'),
    instagram_url: getUrl(page, 'instagram_url'),
    contact_email: getText(page, 'contact_email') || null,
    avatar_url: getPageIconUrl(page) ?? getUrl(page, 'avatar_url'),
    banner_url: getPageCoverUrl(page) ?? getUrl(page, 'banner_url'),
    is_admin: getBool(page, 'is_admin'),
    created_at: page.created_time,
    status: (getSelect(page, 'status') as MemberStatus) ?? null,
    team: getTeams(page, 'team'),
    role_title: getText(page, 'role_title') || null,
    location: getText(page, 'location') || null,
    hometown: getText(page, 'hometown') || null,
    skills: getMultiSelect(page, 'skills'),
    hobbies: getMultiSelect(page, 'hobbies'),
    current_classes: getMultiSelect(page, 'current_classes'),
    chapter_role: getText(page, 'chapter_role') || null,
    big_id: getFirstRelationId(page, ['big', 'Big']),
    family_tree_id: getFirstRelationId(page, ['family_tree', 'Family Tree']),
    fun_fact: getText(page, 'fun_fact') || null,
    open_to_chat: getBool(page, 'open_to_chat'),
  }
}

export function pageToFamilyTree(page: PageObjectResponse): FamilyTree {
  return {
    id: page.id,
    name: getText(page, 'Name'),
  }
}

export function pageToWorkExperience(page: PageObjectResponse): WorkExperience {
  return {
    id: page.id,
    profile_id: getRelationId(page, 'Profile') ?? '',
    company: getText(page, 'company'),
    role: getText(page, 'Name'),
    start_date: getDate(page, 'start_date') ?? '',
    end_date: getDate(page, 'end_date'),
    description: getText(page, 'description') || null,
    employment_type: (getSelect(page, 'employment_type') as EmploymentType) ?? null,
    industry: getSelect(page, 'industry') ?? null,
    location: getText(page, 'location') || null,
    company_website: getUrl(page, 'company_website'),
    is_current: getBool(page, 'is_current'),
  }
}

/** @deprecated Use pageToWorkExperience */
export const pageToInternship = pageToWorkExperience

export function pageToClub(page: PageObjectResponse): Club {
  return {
    id: page.id,
    profile_id: getRelationId(page, 'Profile') ?? '',
    club_name: getText(page, 'Name'),
    role: getText(page, 'role') || null,
    start_year: getNumber(page, 'start_year'),
    end_year: getNumber(page, 'end_year'),
  }
}

// ─── Query helpers ───────────────────────────────────────────────────────────

// Cached because the app layout reads this on every server render. Keyed by the
// clerkId argument and tagged `profiles`, so app-driven admin/profile edits
// invalidate it immediately; edits made directly in Notion lag ≤ the TTL.
export const getProfileByClerkId = unstable_cache(
  async (clerkId: string): Promise<Profile | null> => {
    const res = await notion.databases.query({
      database_id: PROFILES_DB,
      filter: { property: 'clerk_id', rich_text: { equals: clerkId } },
    })
    const page = res.results[0]
    return page ? pageToProfile(page as PageObjectResponse) : null
  },
  ['getProfileByClerkId'],
  { tags: [CACHE_TAGS.profiles], revalidate: CACHE_TTL_SECONDS }
)

export async function getProfileById(id: string): Promise<Profile | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    return pageToProfile(page as PageObjectResponse)
  } catch {
    return null
  }
}

async function getAllProfilesUncached(filters?: {
  q?: string
  year?: number
  major?: string
  status?: string
  team?: string
}): Promise<Profile[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = []

  if (filters?.q) {
    conditions.push({ property: 'Name', title: { contains: filters.q } })
  }
  if (filters?.year) {
    conditions.push({ property: 'graduation_year', number: { equals: filters.year } })
  }
  if (filters?.major) {
    conditions.push({ property: 'major', rich_text: { contains: filters.major } })
  }
  if (filters?.status) {
    conditions.push({ property: 'status', select: { equals: filters.status } })
  }
  if (filters?.team) {
    const teamPropertyType = await getProfilesTeamPropertyType()
    conditions.push(
      teamPropertyType === 'multi_select'
        ? { property: 'team', multi_select: { contains: filters.team } }
        : { property: 'team', select: { equals: filters.team } }
    )
  }

  const filter =
    conditions.length > 1
      ? { and: conditions }
      : conditions.length === 1
        ? conditions[0]
        : undefined

  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const res = await notion.databases.query({
      database_id: PROFILES_DB,
      filter,
      sorts: [{ property: 'Name', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: 100,
    })

    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages.map(pageToProfile)
}

export const getAllProfiles = unstable_cache(
  getAllProfilesUncached,
  ['getAllProfiles'],
  { tags: [CACHE_TAGS.profiles], revalidate: CACHE_TTL_SECONDS }
)

async function getProfilesBigRelationProperty(): Promise<string | null> {
  const database = await notion.databases.retrieve({ database_id: PROFILES_DB })
  const properties = (database as { properties?: Record<string, unknown> }).properties ?? {}

  for (const candidate of ['big', 'Big']) {
    if (candidate in properties) return candidate
  }

  return null
}

// Notion rejects the entire page update if it names a property the database
// doesn't have. Several profile fields are optional in a given workspace, so
// unknown ones are dropped instead of failing the whole save.
async function getProfilesPropertyNames(): Promise<Set<string>> {
  const database = await notion.databases.retrieve({ database_id: PROFILES_DB })
  const properties = (database as { properties?: Record<string, unknown> }).properties ?? {}
  return new Set(Object.keys(properties))
}

async function getProfilesTeamPropertyType(): Promise<'select' | 'multi_select'> {
  const database = await notion.databases.retrieve({ database_id: PROFILES_DB })
  const properties =
    (database as { properties?: Record<string, { type?: string }> }).properties ?? {}
  const teamProperty = properties.team

  return teamProperty?.type === 'multi_select' ? 'multi_select' : 'select'
}

async function getProfilesFamilyTreeRelationProperty(): Promise<string | null> {
  const database = await notion.databases.retrieve({ database_id: PROFILES_DB })
  const properties = (database as { properties?: Record<string, unknown> }).properties ?? {}

  for (const candidate of ['family_tree', 'Family Tree']) {
    if (candidate in properties) return candidate
  }

  return null
}

async function getAllFamilyTreesUncached(): Promise<FamilyTree[]> {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const res = await notion.databases.query({
      database_id: FAMILY_TREES_DB,
      start_cursor: cursor,
      page_size: 100,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    })

    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages.map(pageToFamilyTree)
}

export const getAllFamilyTrees = unstable_cache(
  getAllFamilyTreesUncached,
  ['getAllFamilyTrees'],
  { tags: [CACHE_TAGS.familyTrees], revalidate: CACHE_TTL_SECONDS }
)

export async function getInternshipsByProfileId(profileId: string): Promise<WorkExperience[]> {
  const res = await notion.databases.query({
    database_id: INTERNSHIPS_DB,
    filter: { property: 'Profile', relation: { contains: profileId } },
  })
  return res.results.map((p) => pageToWorkExperience(p as PageObjectResponse))
}

async function getAllWorkExperiencesUncached(): Promise<WorkExperience[]> {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  // Paginate through all results
  do {
    const res = await notion.databases.query({
      database_id: INTERNSHIPS_DB,
      start_cursor: cursor,
      page_size: 100,
      sorts: [{ property: 'company', direction: 'ascending' }],
    })
    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages.map(pageToWorkExperience)
}

export const getAllWorkExperiences = unstable_cache(
  getAllWorkExperiencesUncached,
  ['getAllWorkExperiences'],
  { tags: [CACHE_TAGS.workExperiences], revalidate: CACHE_TTL_SECONDS }
)

export async function getClubsByProfileId(profileId: string): Promise<Club[]> {
  const res = await notion.databases.query({
    database_id: CLUBS_DB,
    filter: { property: 'Profile', relation: { contains: profileId } },
  })
  return res.results.map((p) => pageToClub(p as PageObjectResponse))
}

// ─── Mutation helpers ────────────────────────────────────────────────────────

export async function createProfile(clerkId: string, fullName: string): Promise<void> {
  await notion.pages.create({
    parent: { database_id: PROFILES_DB },
    properties: {
      Name: { title: [{ text: { content: fullName } }] },
      clerk_id: { rich_text: [{ text: { content: clerkId } }] },
      is_admin: { checkbox: false },
    },
  })
  revalidateTag(CACHE_TAGS.profiles, { expire: 0 })
}

export async function updateProfile(
  profileId: string,
  data: {
    full_name: string
    graduation_year: number | null
    major: string | null
    minor: string | null
    bio: string | null
    phone_number?: string | null
    linkedin_url: string | null
    avatar_url?: string | null
    banner_url?: string | null
    status?: string | null
    team?: string[] | null
    role_title?: string | null
    location?: string | null
    skills?: string[]
    big_id?: string | null
    fun_fact?: string | null
    hometown?: string | null
    chapter_role?: string | null
    github_url?: string | null
    instagram_url?: string | null
    contact_email?: string | null
    hobbies?: string[]
    current_classes?: string[]
    open_to_chat?: boolean
  }
): Promise<void> {
  if (data.big_id === profileId) {
    throw new Error('A member cannot be their own big.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    Name: { title: [{ text: { content: data.full_name } }] },
    graduation_year: { number: data.graduation_year },
    major: { rich_text: [{ text: { content: data.major ?? '' } }] },
    minor: { rich_text: [{ text: { content: data.minor ?? '' } }] },
    bio: { rich_text: [{ text: { content: data.bio ?? '' } }] },
    linkedin_url: { url: data.linkedin_url },
  }

  if (data.phone_number !== undefined) {
    properties.phone_number = { phone_number: data.phone_number }
  }

  if (data.avatar_url !== undefined) {
    properties.avatar_url = { url: data.avatar_url }
  }
  if (data.banner_url !== undefined) {
    properties.banner_url = { url: data.banner_url }
  }
  if (data.role_title !== undefined) {
    properties.role_title = { rich_text: [{ text: { content: data.role_title ?? '' } }] }
  }
  if (data.location !== undefined) {
    properties.location = { rich_text: [{ text: { content: data.location ?? '' } }] }
  }
  if (data.fun_fact !== undefined) {
    properties.fun_fact = { rich_text: [{ text: { content: data.fun_fact ?? '' } }] }
  }
  if (data.hometown !== undefined) {
    properties.hometown = { rich_text: [{ text: { content: data.hometown ?? '' } }] }
  }
  if (data.chapter_role !== undefined) {
    properties.chapter_role = { rich_text: [{ text: { content: data.chapter_role ?? '' } }] }
  }
  if (data.contact_email !== undefined) {
    properties.contact_email = { rich_text: [{ text: { content: data.contact_email ?? '' } }] }
  }
  if (data.github_url !== undefined) {
    properties.github_url = { url: data.github_url }
  }
  if (data.instagram_url !== undefined) {
    properties.instagram_url = { url: data.instagram_url }
  }
  if (data.hobbies !== undefined) {
    properties.hobbies = { multi_select: data.hobbies.map((h) => ({ name: h })) }
  }
  if (data.current_classes !== undefined) {
    properties.current_classes = {
      multi_select: data.current_classes.map((c) => ({ name: c })),
    }
  }
  if (data.open_to_chat !== undefined) {
    properties.open_to_chat = { checkbox: data.open_to_chat }
  }
  if (data.status !== undefined) {
    properties.status = data.status ? { select: { name: data.status } } : { select: null }
  }
  if (data.team !== undefined) {
    const teamPropertyType = await getProfilesTeamPropertyType()
    const selectedTeams = data.team ?? []

    properties.team =
      teamPropertyType === 'multi_select'
        ? { multi_select: selectedTeams.map((name) => ({ name })) }
        : (() => {
            if (selectedTeams.length > 1) {
              throw new Error(
                'The Profiles `team` property in Notion is still a single-select field, so multiple teams cannot be saved yet.'
              )
            }

            const selectedTeam = selectedTeams[0] ?? null
            return { select: selectedTeam ? { name: selectedTeam } : null }
          })()
  }
  if (data.skills !== undefined) {
    properties.skills = {
      multi_select: data.skills.map((s) => ({ name: s })),
    }
  }
  if (data.big_id !== undefined) {
    const relationProperty = await getProfilesBigRelationProperty()

    if (!relationProperty) {
      if (data.big_id) {
        throw new Error(
          'Connections are not configured yet. Add a self-relation property named `big` to the Profiles Notion database.'
        )
      }
    } else {
      properties[relationProperty] = data.big_id ? { relation: [{ id: data.big_id }] } : { relation: [] }
    }
  }

  const known = await getProfilesPropertyNames()
  const supported = Object.fromEntries(
    Object.entries(properties).filter(([name]) => known.has(name))
  )

  await notion.pages.update({ page_id: profileId, properties: supported })
  revalidateTag(CACHE_TAGS.profiles, { expire: 0 })
}

export async function createFamilyTree(name: string): Promise<FamilyTree> {
  const page = await notion.pages.create({
    parent: { database_id: FAMILY_TREES_DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
    },
  })

  revalidateTag(CACHE_TAGS.familyTrees, { expire: 0 })
  return pageToFamilyTree(page as PageObjectResponse)
}

export async function updateFamilyTreeName(
  familyTreeId: string,
  name: string
): Promise<void> {
  await notion.pages.update({
    page_id: familyTreeId,
    properties: {
      Name: { title: [{ text: { content: name } }] },
    },
  })
  revalidateTag(CACHE_TAGS.familyTrees, { expire: 0 })
}

export async function assignFamilyTreeToProfiles(
  profileIds: string[],
  familyTreeId: string
): Promise<void> {
  const relationProperty = await getProfilesFamilyTreeRelationProperty()

  if (!relationProperty) {
    throw new Error(
      'Connections are not configured yet. Add a relation property named `family_tree` to the Profiles Notion database.'
    )
  }

  await Promise.all(
    profileIds.map((profileId) =>
      notion.pages.update({
        page_id: profileId,
        properties: {
          [relationProperty]: { relation: [{ id: familyTreeId }] },
        },
      })
    )
  )
  revalidateTag(CACHE_TAGS.profiles, { expire: 0 })
  revalidateTag(CACHE_TAGS.familyTrees, { expire: 0 })
}

export async function syncInternships(
  profileId: string,
  internships: Array<{
    company: string
    role: string
    start_date: string
    end_date: string | null
    description: string | null
    employment_type?: string | null
    industry?: string | null
    location?: string | null
    company_website?: string | null
    is_current?: boolean
  }>
): Promise<void> {
  const existing = await getInternshipsByProfileId(profileId)
  await Promise.all(existing.map((i) => notion.pages.update({ page_id: i.id, archived: true })))
  await Promise.all(
    internships
      .filter((i) => i.company && i.role && i.start_date)
      .map((i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const properties: Record<string, any> = {
          Name: { title: [{ text: { content: i.role } }] },
          company: { rich_text: [{ text: { content: i.company } }] },
          Profile: { relation: [{ id: profileId }] },
          start_date: { date: { start: i.start_date } },
          end_date: i.end_date ? { date: { start: i.end_date } } : { date: null },
          description: { rich_text: [{ text: { content: i.description ?? '' } }] },
          is_current: { checkbox: i.is_current ?? false },
        }
        if (i.employment_type) {
          properties.employment_type = { select: { name: i.employment_type } }
        }
        if (i.industry) {
          properties.industry = { select: { name: i.industry } }
        }
        if (i.location) {
          properties.location = { rich_text: [{ text: { content: i.location } }] }
        }
        if (i.company_website) {
          properties.company_website = { url: i.company_website }
        }
        return notion.pages.create({ parent: { database_id: INTERNSHIPS_DB }, properties })
      })
  )
  revalidateTag(CACHE_TAGS.workExperiences, { expire: 0 })
}

export async function syncClubs(
  profileId: string,
  clubs: Array<{
    club_name: string
    role: string | null
    start_year: number | null
    end_year: number | null
  }>
): Promise<void> {
  const existing = await getClubsByProfileId(profileId)
  await Promise.all(existing.map((c) => notion.pages.update({ page_id: c.id, archived: true })))
  await Promise.all(
    clubs
      .filter((c) => c.club_name)
      .map((c) =>
        notion.pages.create({
          parent: { database_id: CLUBS_DB },
          properties: {
            Name: { title: [{ text: { content: c.club_name } }] },
            role: { rich_text: [{ text: { content: c.role ?? '' } }] },
            Profile: { relation: [{ id: profileId }] },
            start_year: { number: c.start_year },
            end_year: { number: c.end_year },
          },
        })
      )
  )
}

export async function deleteProfileAndRelated(profileId: string): Promise<void> {
  const [internships, clubs] = await Promise.all([
    getInternshipsByProfileId(profileId),
    getClubsByProfileId(profileId),
  ])
  await Promise.all([
    ...internships.map((i) => notion.pages.update({ page_id: i.id, archived: true })),
    ...clubs.map((c) => notion.pages.update({ page_id: c.id, archived: true })),
  ])
  await notion.pages.update({ page_id: profileId, archived: true })
  revalidateTag(CACHE_TAGS.profiles, { expire: 0 })
  revalidateTag(CACHE_TAGS.workExperiences, { expire: 0 })
}

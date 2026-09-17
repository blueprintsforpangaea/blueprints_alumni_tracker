'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { FamilyTree, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Pencil, Search, Users } from 'lucide-react'

type Props = {
  profiles: Profile[]
  familyTrees: FamilyTree[]
  currentUserProfileId: string | null
  isAdmin: boolean
}

type Family = {
  rootId: string
  familyTreeId: string | null
  title: string
  memberIds: string[]
  levels: Profile[][]
}

export default function ConnectionsExplorer({
  profiles,
  familyTrees,
  currentUserProfileId,
  isAdmin,
}: Props) {
  const [query, setQuery] = useState('')
  const [profilesState, setProfilesState] = useState(profiles)
  const [familyTreesState, setFamilyTreesState] = useState(familyTrees)
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null)
  const [draftFamilyName, setDraftFamilyName] = useState('')
  const [savingFamilyId, setSavingFamilyId] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)

  const { connectedFamilies, unlinkedProfiles, childrenById, profileMap } = useMemo(
    () => buildConnectionsData(profilesState, familyTreesState),
    [profilesState, familyTreesState]
  )

  const normalizedQuery = query.trim().toLowerCase()

  const filteredFamilies = useMemo(() => {
    if (!normalizedQuery) return connectedFamilies

    return connectedFamilies.filter(
      (family) =>
        family.title.toLowerCase().includes(normalizedQuery) ||
        family.memberIds.some((memberId) => {
          const profile = profileMap.get(memberId)
          return profile ? matchesProfile(profile, normalizedQuery) : false
        })
    )
  }, [connectedFamilies, normalizedQuery, profileMap])

  const filteredUnlinkedProfiles = useMemo(() => {
    if (!normalizedQuery) return unlinkedProfiles
    return unlinkedProfiles.filter((profile) => matchesProfile(profile, normalizedQuery))
  }, [normalizedQuery, unlinkedProfiles])

  if (connectedFamilies.length === 0) {
    return (
      <div className="space-y-6">
        <SearchBar query={query} setQuery={setQuery} />
        <div className="rounded-[2rem] brand-field border px-8 py-16 text-center shadow-[0_20px_60px_oklch(0.22_0.02_255/0.08)] backdrop-blur-md">
          <p className="text-base font-semibold text-foreground">No family trees yet.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Once members add their big in Edit Profile, their family cards will appear here.
          </p>
          <Link
            href="/profile/edit"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Add your big
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SearchBar query={query} setQuery={setQuery} />

      {filteredFamilies.length === 0 && filteredUnlinkedProfiles.length === 0 ? (
        <div className="rounded-[2rem] brand-field border px-8 py-16 text-center shadow-[0_20px_60px_oklch(0.22_0.02_255/0.08)] backdrop-blur-md">
          <p className="text-base font-semibold text-foreground">No family trees match that search.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different member name, role, major, or family title.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredFamilies.map((family) => (
              <FamilyCard
                key={family.rootId}
                family={family}
                childrenById={childrenById}
                canEditTitle={isAdmin || (!!currentUserProfileId && family.memberIds.includes(currentUserProfileId))}
                isEditing={editingFamilyId === family.rootId}
                draftFamilyName={editingFamilyId === family.rootId ? draftFamilyName : ''}
                renameError={editingFamilyId === family.rootId ? renameError : null}
                isSaving={savingFamilyId === family.rootId}
                onStartEditing={() => {
                  setEditingFamilyId(family.rootId)
                  setDraftFamilyName(family.title)
                  setRenameError(null)
                }}
                onCancelEditing={() => {
                  setEditingFamilyId(null)
                  setDraftFamilyName('')
                  setRenameError(null)
                }}
                onDraftChange={setDraftFamilyName}
                onSave={async () => {
                  setSavingFamilyId(family.rootId)
                  setRenameError(null)

                  try {
                    const res = await fetch('/api/family-trees', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        anchor_profile_id: family.rootId,
                        name: draftFamilyName,
                      }),
                    })

                    const data = await res.json()
                    if (!res.ok) {
                      throw new Error(data.error ?? 'Failed to update family tree.')
                    }

                    setFamilyTreesState((currentFamilyTrees) => {
                      const nextFamilyTrees = [...currentFamilyTrees]
                      const existingIndex = nextFamilyTrees.findIndex(
                        (familyTree) => familyTree.id === data.family_tree_id
                      )

                      if (existingIndex >= 0) {
                        nextFamilyTrees[existingIndex] = {
                          ...nextFamilyTrees[existingIndex],
                          name: data.name,
                        }
                      } else {
                        nextFamilyTrees.push({
                          id: data.family_tree_id,
                          name: data.name,
                        })
                      }

                      return nextFamilyTrees
                    })
                    setProfilesState((currentProfiles) =>
                      currentProfiles.map((profile) =>
                        data.member_profile_ids.includes(profile.id)
                          ? { ...profile, family_tree_id: data.family_tree_id }
                          : profile
                      )
                    )
                    setEditingFamilyId(null)
                    setDraftFamilyName('')
                  } catch (error) {
                    setRenameError(
                      error instanceof Error ? error.message : 'Failed to update family tree.'
                    )
                  } finally {
                    setSavingFamilyId(null)
                  }
                }}
              />
            ))}
          </div>

          {filteredUnlinkedProfiles.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="size-4 text-muted-foreground" />
                Members without a family yet
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {filteredUnlinkedProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-[1.5rem] brand-field border p-4 shadow-[0_12px_34px_oklch(0.22_0.02_255/0.06)] backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarLink profile={profile} size="sm" />
                      <div className="min-w-0">
                        <Link
                          href={`/profile/${profile.id}`}
                          className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {profile.full_name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {profile.role_title || profile.team[0] || profile.major || 'Member'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function SearchBar({
  query,
  setQuery,
}: {
  query: string
  setQuery: (value: string) => void
}) {
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name..."
        className="h-11 rounded-2xl brand-field pl-10 text-sm shadow-[0_12px_28px_oklch(0.23_0.015_255/0.05)]"
      />
    </div>
  )
}

function FamilyCard({
  family,
  childrenById,
  canEditTitle,
  isEditing,
  draftFamilyName,
  renameError,
  isSaving,
  onStartEditing,
  onCancelEditing,
  onDraftChange,
  onSave,
}: {
  family: Family
  childrenById: Map<string, Profile[]>
  canEditTitle: boolean
  isEditing: boolean
  draftFamilyName: string
  renameError: string | null
  isSaving: boolean
  onStartEditing: () => void
  onCancelEditing: () => void
  onDraftChange: (value: string) => void
  onSave: () => void
}) {
  return (
    <article className="brand-panel rounded-[1.9rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={draftFamilyName}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder="Enter family tree name"
                className="h-9 rounded-xl"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEditing} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
              {renameError && (
                <p className="text-xs text-destructive">{renameError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight text-[var(--color-brand-deep)]">
                {family.title}
              </h2>
              {canEditTitle && (
                <button
                  type="button"
                  onClick={onStartEditing}
                  className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label={`Edit ${family.title} name`}
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="brand-chip rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand-deep)]">
          {family.memberIds.length} member{family.memberIds.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {family.levels.map((level, levelIndex) => (
          <GenerationRow
            key={`${family.rootId}-${levelIndex}`}
            level={level}
            levelIndex={levelIndex}
            hasNextLevel={levelIndex < family.levels.length - 1}
            childrenById={childrenById}
          />
        ))}
      </div>
    </article>
  )
}

function GenerationRow({
  level,
  levelIndex,
  hasNextLevel,
  childrenById,
}: {
  level: Profile[]
  levelIndex: number
  hasNextLevel: boolean
  childrenById: Map<string, Profile[]>
}) {
  const connectorWidth = Math.min(92, 24 + level.length * 18)
  // Themed so the lineage lines stay visible in both modes.
  const connectorColor = 'var(--connector)'

  return (
    <div className="space-y-3">
      {levelIndex > 0 && (
        <div className="relative mx-auto h-4" style={{ width: `${connectorWidth}%` }}>
          <span className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: connectorColor }} />
          {level.map((profile, index) => (
            <span
              key={profile.id}
              className="absolute top-0 h-4 w-px"
              style={{
                backgroundColor: connectorColor,
                left: `${((index + 0.5) / level.length) * 100}%`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          'flex flex-wrap justify-center gap-3',
          level.length === 1 && 'gap-0',
          level.length >= 4 && 'gap-2.5'
        )}
      >
        {level.map((profile) => (
          <PersonNode
            key={profile.id}
            profile={profile}
            hasChildren={hasNextLevel && (childrenById.get(profile.id)?.length ?? 0) > 0}
            isRoot={levelIndex === 0}
          />
        ))}
      </div>
    </div>
  )
}

function PersonNode({
  profile,
  hasChildren,
  isRoot,
}: {
  profile: Profile
  hasChildren: boolean
  isRoot: boolean
}) {
  return (
    <div className="relative flex flex-col items-center pb-4">
      <div
        className={cn(
          'w-[8.8rem] rounded-[1.15rem] brand-field border px-3 py-3 text-center shadow-[0_10px_24px_oklch(0.23_0.015_255/0.05)]',
          isRoot && 'w-[9.5rem] py-4'
        )}
      >
        <div className="flex justify-center">
          <AvatarLink profile={profile} size={isRoot ? 'lg' : 'md'} />
        </div>
        <Link
          href={`/profile/${profile.id}`}
          className="mt-3 block text-sm font-semibold leading-tight text-[var(--color-brand-deep)] transition-colors hover:text-primary"
        >
          {profile.full_name}
        </Link>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {profile.team[0] || profile.role_title || profile.major || 'Member'}
        </p>
      </div>

      {hasChildren && (
        <span className="absolute bottom-0 left-1/2 h-4 w-px -translate-x-1/2 bg-[var(--connector)]" />
      )}
    </div>
  )
}

function AvatarLink({
  profile,
  size,
}: {
  profile: Profile
  size: 'sm' | 'md' | 'lg'
}) {
  const dimensionClass =
    size === 'sm' ? 'size-11' : size === 'lg' ? 'size-14' : 'size-12'

  if (profile.avatar_url) {
    return (
      <Link href={`/profile/${profile.id}`} className="block">
        <img
          src={profile.avatar_url}
          alt={profile.full_name}
          className={cn(
            dimensionClass,
            'rounded-full object-cover ring-2 ring-[var(--avatar-ring)] transition-transform hover:scale-[1.03]'
          )}
        />
      </Link>
    )
  }

  const initials = profile.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <Link
      href={`/profile/${profile.id}`}
      className={cn(
        dimensionClass,
        'flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]'
      )}
    >
      {initials || '?'}
    </Link>
  )
}

function buildConnectionsData(profiles: Profile[], familyTrees: FamilyTree[]) {
  const orderedProfiles = [...profiles].sort((a, b) => a.full_name.localeCompare(b.full_name))
  const profileMap = new Map(orderedProfiles.map((profile) => [profile.id, profile]))
  const familyTreeMap = new Map(familyTrees.map((familyTree) => [familyTree.id, familyTree]))
  const childrenById = new Map<string, Profile[]>()

  for (const profile of orderedProfiles) {
    if (!profile.big_id || profile.big_id === profile.id || !profileMap.has(profile.big_id)) continue

    const children = childrenById.get(profile.big_id) ?? []
    children.push(profile)
    childrenById.set(profile.big_id, children)
  }

  for (const children of childrenById.values()) {
    children.sort((a, b) => a.full_name.localeCompare(b.full_name))
  }

  const roots = orderedProfiles
    .filter((profile) => !profile.big_id || profile.big_id === profile.id || !profileMap.has(profile.big_id))
    .map((profile) => profile.id)

  const families: Family[] = []
  const globallyVisited = new Set<string>()

  for (const rootId of roots) {
    const memberIds = collectFamilyMemberIds(rootId, childrenById)
    memberIds.forEach((memberId) => globallyVisited.add(memberId))

    if (memberIds.length < 2) continue

    const root = profileMap.get(rootId)
    if (!root) continue

    const familyTreeId = resolveFamilyTreeId(memberIds, profileMap, familyTreeMap)

    families.push({
      rootId,
      familyTreeId,
      title: getFamilyTitle(root, familyTreeId ? familyTreeMap.get(familyTreeId)?.name ?? null : null),
      memberIds,
      levels: buildFamilyLevels(rootId, childrenById, profileMap),
    })
  }

  for (const profile of orderedProfiles) {
    if (globallyVisited.has(profile.id)) continue
    const memberIds = collectFamilyMemberIds(profile.id, childrenById)
    memberIds.forEach((memberId) => globallyVisited.add(memberId))
  }

  const familyMemberIds = new Set(families.flatMap((family) => family.memberIds))
  const unlinkedProfiles = orderedProfiles.filter((profile) => !familyMemberIds.has(profile.id))

  families.sort((a, b) => {
    if (b.memberIds.length !== a.memberIds.length) return b.memberIds.length - a.memberIds.length
    return a.title.localeCompare(b.title)
  })

  return {
    connectedFamilies: families,
    unlinkedProfiles,
    childrenById,
    profileMap,
    familyTreeMap,
  }
}

function collectFamilyMemberIds(rootId: string, childrenById: Map<string, Profile[]>) {
  const seen = new Set<string>()
  const orderedIds: string[] = []

  function walk(currentId: string) {
    if (seen.has(currentId)) return
    seen.add(currentId)
    orderedIds.push(currentId)

    const children = childrenById.get(currentId) ?? []
    for (const child of children) walk(child.id)
  }

  walk(rootId)
  return orderedIds
}

function buildFamilyLevels(
  rootId: string,
  childrenById: Map<string, Profile[]>,
  profileMap: Map<string, Profile>
) {
  const levels: Profile[][] = []
  const visited = new Set<string>()
  let currentIds = [rootId]

  while (currentIds.length > 0) {
    const levelProfiles = currentIds
      .filter((id) => !visited.has(id))
      .map((id) => {
        visited.add(id)
        return profileMap.get(id)
      })
      .filter((profile): profile is Profile => Boolean(profile))

    if (levelProfiles.length === 0) break

    levels.push(levelProfiles)

    currentIds = levelProfiles.flatMap((profile) =>
      (childrenById.get(profile.id) ?? []).map((child) => child.id)
    )
  }

  return levels
}

function resolveFamilyTreeId(
  memberIds: string[],
  profileMap: Map<string, Profile>,
  familyTreeMap: Map<string, FamilyTree>
) {
  for (const memberId of memberIds) {
    const familyTreeId = profileMap.get(memberId)?.family_tree_id
    if (familyTreeId && familyTreeMap.has(familyTreeId)) {
      return familyTreeId
    }
  }

  return null
}

function getFamilyTitle(root: Profile, persistedTitle: string | null) {
  if (persistedTitle?.trim()) return persistedTitle.trim()

  const nameParts = root.full_name.split(' ').filter(Boolean)
  const firstName = nameParts[0] ?? root.full_name
  const surname = nameParts.at(-1)

  if (surname && surname.toLowerCase() !== firstName.toLowerCase()) {
    return `${surname} Line`
  }

  return `${firstName}'s Line`
}

function matchesProfile(profile: Profile, query: string) {
  const haystack = [
    profile.full_name,
    profile.major,
    profile.team.join(' '),
    profile.role_title,
    profile.location,
    profile.status,
    profile.graduation_year ? String(profile.graduation_year) : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import {
  getProfileById,
  getProfileByClerkId,
  getInternshipsByProfileId,
  getClubsByProfileId,
} from '@/lib/notion'
import InternshipList from '@/components/InternshipList'
import ClubList from '@/components/ClubList'
import ProfileMediaEditor from '@/components/profile/ProfileMediaEditor'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Phone,
  Linkedin,
  Pencil,
  ArrowLeft,
  Sparkles,
  Github,
  Mail,
  MessageSquare,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()

  const [profile, internships, clubs, viewer] = await Promise.all([
    getProfileById(id),
    getInternshipsByProfileId(id),
    getClubsByProfileId(id),
    getProfileByClerkId(userId!),
  ])

  if (!profile) notFound()

  const isOwner = profile.clerk_id === userId
  const isAdmin = viewer?.is_admin ?? false
  const canEdit = isOwner || isAdmin
  const isAlumni = profile.status === 'Alumni'
  // Email is opt-in. Owners and admins always see it so it stays editable.
  const contactEmail = profile.open_to_chat || canEdit ? profile.contact_email : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3" />
        Back to directory
      </Link>

      {/* Header card */}
      <div className="brand-panel overflow-hidden rounded-[2rem]">
        <ProfileMediaEditor
          profileId={profile.id}
          fullName={profile.full_name}
          initialAvatarUrl={profile.avatar_url}
          initialBannerUrl={profile.banner_url}
          variant="profile"
          editable={canEdit}
        />

        <div className="relative px-6 pb-6">
          {/* Avatar — overlapping the banner */}
          <div className="-mt-12 flex items-end justify-between">
            <div className="size-24 shrink-0" />

            {canEdit && (
              <Link
                href={`/profile/edit?id=${profile.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5 mt-14'}
              >
                <Pencil className="size-3" />
                Edit Profile
              </Link>
            )}
          </div>

          {/* Name & meta */}
          <div className="mt-4 space-y-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
              {(profile.role_title || profile.team.length > 0) && (
                <p className="text-sm text-muted-foreground">
                  {profile.role_title}
                  {profile.role_title && profile.team.length > 0 && ' · '}
                  {profile.team.join(' · ')}
                </p>
              )}
            </div>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2">
              {profile.status && (
                <Badge variant={isAlumni ? 'outline' : 'default'} className="text-xs">
                  {profile.status}
                </Badge>
              )}
              {profile.graduation_year && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <GraduationCap className="size-3" />
                  Class of {profile.graduation_year}
                </Badge>
              )}
              {profile.major && (
                <Badge variant="secondary" className="text-xs">
                  {profile.major}
                </Badge>
              )}
              {profile.minor && (
                <Badge variant="outline" className="text-xs">
                  Minor: {profile.minor}
                </Badge>
              )}
              {profile.location && (
                <Badge variant="outline" className="text-xs gap-1">
                  <MapPin className="size-3" />
                  {profile.location}
                </Badge>
              )}
            </div>

            {/* Skills, hobbies, classes */}
            <ChipRow label="Skills" items={profile.skills} />
            <ChipRow label="Hobbies" items={profile.hobbies} />
            <ChipRow label="Classes" items={profile.current_classes} />

            {profile.open_to_chat && (
              <Badge variant="default" className="gap-1 text-xs">
                <MessageSquare className="size-3" />
                Open to chat
              </Badge>
            )}

            {/* Contact links */}
            {(profile.phone_number || profile.linkedin_url || profile.github_url || contactEmail) && (
              <div className="flex flex-col items-start gap-2">
                {profile.phone_number && (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Phone className="size-3.5" />
                    {profile.phone_number}
                  </div>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Linkedin className="size-3.5" />
                    LinkedIn Profile
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Github className="size-3.5" />
                    GitHub
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {contactEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* Bio */}
          {profile.bio && (
            <Section title="About">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {profile.bio}
              </p>
            </Section>
          )}

          {/* Internships */}
          {internships.length > 0 && (
            <Section title="Experience" icon={Briefcase}>
              <InternshipList internships={internships} />
            </Section>
          )}

          {/* Clubs */}
          {clubs.length > 0 && (
            <Section title="Clubs & Activities">
              <ClubList clubs={clubs} />
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {profile.fun_fact && (
            <div className="brand-panel rounded-[1.5rem] p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                <Sparkles className="size-3" />
                Fun Fact
              </div>
              <p className="text-sm leading-relaxed text-foreground">{profile.fun_fact}</p>
            </div>
          )}

          <div className="brand-panel rounded-[1.5rem] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Quick Info
            </p>
            <InfoRow label="Joined" value={new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
            {profile.graduation_year && (
              <InfoRow label="Class" value={String(profile.graduation_year)} />
            )}
            {profile.team.length > 0 && (
              <InfoRow
                label={profile.team.length > 1 ? 'Teams' : 'Team'}
                value={profile.team.join(', ')}
              />
            )}
            {profile.chapter_role && (
              <InfoRow label="Chapter Role" value={profile.chapter_role} />
            )}
            {profile.location && <InfoRow label="Location" value={profile.location} />}
            {profile.hometown && <InfoRow label="Hometown" value={profile.hometown} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="brand-panel rounded-[1.5rem] p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {title}
      </h2>
      {children}
    </div>
  )
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {items.map((item) => (
        <span
          key={item}
          className="brand-chip rounded-full px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-brand-deep)]"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

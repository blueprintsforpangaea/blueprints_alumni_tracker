'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Image as ImageIcon, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  profileId: string
  fullName: string
  initialAvatarUrl: string | null
  initialBannerUrl: string | null
  variant?: 'form' | 'profile'
  editable?: boolean
}

export default function ProfileMediaEditor({
  profileId,
  fullName,
  initialAvatarUrl,
  initialBannerUrl,
  variant = 'form',
  editable = true,
}: Props) {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl)
  const [uploadingTarget, setUploadingTarget] = useState<'avatar' | 'banner' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function uploadFile(target: 'avatar' | 'banner', file: File) {
    setUploadingTarget(target)
    setError(null)

    try {
      const body = new FormData()
      body.append('target', target)
      body.append('file', file)

      const res = await fetch(`/api/profiles/${profileId}/media`, {
        method: 'POST',
        body,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to upload image')
      }

      setAvatarUrl(data.profile?.avatar_url ?? null)
      setBannerUrl(data.profile?.banner_url ?? null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingTarget(null)
    }
  }

  function isUploading(target: 'avatar' | 'banner') {
    return uploadingTarget === target
  }

  function onFileChange(target: 'avatar' | 'banner', files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    void uploadFile(target, file)
  }

  if (variant === 'profile') {
    return (
      <div className="relative">
        <div
          className="relative h-24 bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))]"
          style={
            bannerUrl
              ? {
                  backgroundImage: `linear-gradient(135deg, oklch(0.2 0.03 255 / 0.42), oklch(0.4 0.12 255 / 0.2)), url(${bannerUrl})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }
              : undefined
          }
        >
          {editable && (
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="group absolute inset-0 transition-colors hover:bg-black/20"
            >
              <span className="absolute inset-x-0 bottom-3 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
                  {isUploading('banner') ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="size-3.5" />
                  )}
                  Edit banner
                </span>
              </span>
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFileChange('banner', e.target.files)}
          />
        </div>

        <div className="pointer-events-none absolute left-6 top-[4.5rem] right-6 flex items-end justify-between">
          <div className="pointer-events-auto relative group">
            <button
              type="button"
              onClick={() => editable && avatarInputRef.current?.click()}
              className="relative block"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  width={96}
                  height={96}
                  decoding="async"
                  className="size-24 rounded-full border-4 avatar-ring object-cover shadow-[0_8px_24px_oklch(0.22_0.07_257/0.15)]"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full border-4 avatar-ring bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-2xl font-bold text-primary-foreground shadow-[0_8px_24px_oklch(0.5_0.18_257/0.2)]">
                  {initials}
                </div>
              )}
              {editable && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
                  {isUploading('avatar') ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" />
                  )}
                </span>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileChange('avatar', e.target.files)}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Profile Media</p>
        <p className="text-xs text-muted-foreground">
          Uploads save immediately. Use images under 20 MB.
        </p>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border">
          <div
            className="h-32 w-full bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))]"
            style={
              bannerUrl
                ? {
                    backgroundImage: `linear-gradient(135deg, oklch(0.2 0.03 255 / 0.42), oklch(0.4 0.12 255 / 0.2)), url(${bannerUrl})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                : undefined
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => bannerInputRef.current?.click()}
          disabled={isUploading('banner')}
        >
          {isUploading('banner') ? 'Uploading Banner...' : 'Upload Banner'}
        </Button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange('banner', e.target.files)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              width={80}
              height={80}
              decoding="async"
              className="size-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border border-border bg-secondary text-lg font-semibold text-secondary-foreground">
              {initials}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploading('avatar')}
          >
            {isUploading('avatar') ? 'Uploading Photo...' : 'Upload Profile Picture'}
          </Button>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange('avatar', e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

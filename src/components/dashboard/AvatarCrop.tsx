'use client'

import { useRef, useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Props {
  supabase: any
  memberId: string
  currentAvatarUrl: string
  initials: string
  onSaved: (url: string) => void
}

interface Area { x: number; y: number; width: number; height: number }

async function getCroppedBlob(imageSrc: string, cropArea: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 400
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(
        image,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, size, size
      )
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92)
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

export function AvatarCrop({ supabase, memberId, currentAvatarUrl, initials, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [srcUrl, setSrcUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setSrcUrl(reader.result as string); setOpen(true) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleConfirm() {
    if (!srcUrl || !croppedAreaPixels) return
    setUploading(true)
    setError('')
    try {
      const blob = await getCroppedBlob(srcUrl, croppedAreaPixels)
      const path = `${memberId}/avatar.jpg`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const busted = `${publicUrl}?t=${Date.now()}`

      const { error: updateErr } = await supabase
        .from('members').update({ avatar_url: busted }).eq('id', memberId)
      if (updateErr) throw updateErr

      onSaved(busted)
      setOpen(false)
      setSrcUrl(null)
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <div
          className="relative cursor-pointer group"
          onClick={() => fileRef.current?.click()}
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={currentAvatarUrl} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-medium">Change</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">Click avatar to upload - JPG, PNG, WebP up to 5MB</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!uploading) { setOpen(o); if (!o) setSrcUrl(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
          </DialogHeader>

          {srcUrl && (
            <div className="relative w-full h-72 rounded-lg overflow-hidden bg-black">
              <Cropper
                image={srcUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground w-8">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#f0e6d3]"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setSrcUrl(null) }} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={uploading || !croppedAreaPixels}>
              {uploading ? 'Saving...' : 'Save photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

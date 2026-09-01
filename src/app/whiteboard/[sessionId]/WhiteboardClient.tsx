'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

type WBSession = { id: string; title: string; is_active: boolean; event_id: string | null; created_by: string }
type CurrentUser = { id: string; name: string }

type RemoteState = {
  color: string
  lineWidth: number
  tool: 'pen' | 'eraser'
  lastX: number
  lastY: number
  active: boolean
}

type CursorState = { x: number; y: number; name: string }

const PRESET_COLORS = ['#ffffff', '#000000', '#f7768e', '#7aa2f7', '#9ece6a', '#e0af68']

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function userColor(userId: string) {
  const colors = ['#f7768e', '#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#73daca']
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function WhiteboardClient({ session, currentUser }: { session: WBSession; currentUser: CurrentUser }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [color, setColor] = useState('#ffffff')
  const [lineWidth, setLineWidth] = useState(3)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorState>>({})

  const isDrawing = useRef(false)
  const lastPt = useRef({ x: 0, y: 0 })
  const remoteStates = useRef<Record<string, RemoteState>>({})
  const cursorThrottle = useRef<number>(0)

  // resize canvas to container
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const ctx = canvas.getContext('2d')
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      if (imageData) ctx?.putImageData(imageData, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Realtime channel
  useEffect(() => {
    const channel = supabase.channel(`whiteboard-${session.id}`)

    channel.on('broadcast', { event: 'stroke_start' }, ({ payload }: any) => {
      if (payload.userId === currentUser.id) return
      remoteStates.current[payload.userId] = {
        color: payload.color,
        lineWidth: payload.lineWidth,
        tool: payload.tool,
        lastX: payload.x,
        lastY: payload.y,
        active: true,
      }
    })

    channel.on('broadcast', { event: 'stroke_segment' }, ({ payload }: any) => {
      if (payload.userId === currentUser.id) return
      const state = remoteStates.current[payload.userId]
      if (!state?.active) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return
      ctx.save()
      ctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = state.color
      ctx.lineWidth = state.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(state.lastX, state.lastY)
      ctx.lineTo(payload.x, payload.y)
      ctx.stroke()
      ctx.restore()
      state.lastX = payload.x
      state.lastY = payload.y
    })

    channel.on('broadcast', { event: 'stroke_end' }, ({ payload }: any) => {
      if (payload.userId === currentUser.id) return
      const state = remoteStates.current[payload.userId]
      if (state) state.active = false
    })

    channel.on('broadcast', { event: 'cursor' }, ({ payload }: any) => {
      if (payload.userId === currentUser.id) return
      setRemoteCursors(prev => ({
        ...prev,
        [payload.userId]: { x: payload.x, y: payload.y, name: payload.name },
      }))
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id, currentUser.id])

  function getCanvas() { return canvasRef.current }
  function getCtx() { return canvasRef.current?.getContext('2d') ?? null }

  function canvasCoords(e: React.MouseEvent | React.Touch) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function broadcastStrokeStart(x: number, y: number) {
    supabase.channel(`whiteboard-${session.id}`).send({
      type: 'broadcast', event: 'stroke_start',
      payload: { userId: currentUser.id, x, y, color, lineWidth, tool },
    })
  }

  function broadcastStrokeSegment(x: number, y: number) {
    supabase.channel(`whiteboard-${session.id}`).send({
      type: 'broadcast', event: 'stroke_segment',
      payload: { userId: currentUser.id, x, y },
    })
  }

  function broadcastStrokeEnd() {
    supabase.channel(`whiteboard-${session.id}`).send({
      type: 'broadcast', event: 'stroke_end',
      payload: { userId: currentUser.id },
    })
  }

  function broadcastCursor(x: number, y: number) {
    const now = Date.now()
    if (now - cursorThrottle.current < 50) return
    cursorThrottle.current = now
    supabase.channel(`whiteboard-${session.id}`).send({
      type: 'broadcast', event: 'cursor',
      payload: { userId: currentUser.id, x, y, name: currentUser.name },
    })
  }

  function startDraw(x: number, y: number) {
    isDrawing.current = true
    lastPt.current = { x, y }
    const ctx = getCtx()
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.restore()
    broadcastStrokeStart(x, y)
  }

  function continueDraw(x: number, y: number) {
    if (!isDrawing.current) return
    const ctx = getCtx()
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.restore()
    lastPt.current = { x, y }
    broadcastStrokeSegment(x, y)
    broadcastCursor(x, y)
  }

  function endDraw() {
    if (!isDrawing.current) return
    isDrawing.current = false
    broadcastStrokeEnd()
  }

  // Mouse handlers
  function onMouseDown(e: React.MouseEvent) {
    const { x, y } = canvasCoords(e)
    startDraw(x, y)
  }
  function onMouseMove(e: React.MouseEvent) {
    const { x, y } = canvasCoords(e)
    continueDraw(x, y)
    if (!isDrawing.current) broadcastCursor(x, y)
  }
  function onMouseUp() { endDraw() }
  function onMouseLeave() { endDraw() }

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    const { x, y } = canvasCoords(e.touches[0])
    startDraw(x, y)
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const { x, y } = canvasCoords(e.touches[0])
    continueDraw(x, y)
  }
  function onTouchEnd(e: React.TouchEvent) {
    e.preventDefault()
    endDraw()
  }

  function clearCanvas() {
    const canvas = getCanvas()
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function saveSnapshot() {
    const canvas = getCanvas()
    if (!canvas) return
    setSaving(true)
    setSaveMsg('')
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const res = await fetch('/api/whiteboard/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, snapshot_data: dataUrl }),
      })
      if (!res.ok) throw new Error()
      setSaveMsg('Saved!')
    } catch {
      setSaveMsg('Save failed')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 2500)
    }
  }

  async function loadSnapshot() {
    setLoading(true)
    try {
      const res = await fetch(`/api/whiteboard/snapshot/${session.id}`)
      if (!res.ok) { setLoading(false); return }
      const { snapshot } = await res.json()
      if (!snapshot?.snapshot_data?.dataUrl) { setLoading(false); return }
      const img = new Image()
      img.onload = () => {
        const ctx = getCtx()
        if (!ctx) return
        clearCanvas()
        ctx.drawImage(img, 0, 0)
        setLoading(false)
      }
      img.src = snapshot.snapshot_data.dataUrl
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-[#c9d1e8] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[#252b3a] px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</span>
        <span className="text-[#3a3f52]">/</span>
        <span className="text-sm text-[#5a6278] truncate">{session.title}</span>
        {!session.is_active && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#f7768e]/10 text-[#f7768e] border border-[#f7768e]/20">Inactive</span>
        )}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b border-[#252b3a] px-4 py-2 flex flex-wrap items-center gap-3">
        {/* Preset colors */}
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen') }}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: color === c && tool === 'pen' ? '#f0e6d3' : '#252b3a' }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => { setColor(e.target.value); setTool('pen') }}
            className="w-6 h-6 rounded cursor-pointer border border-[#252b3a] bg-transparent"
            title="Custom color"
          />
        </div>

        {/* Line width */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#5a6278]">Size</span>
          <input
            type="range" min={1} max={20} value={lineWidth}
            onChange={e => setLineWidth(Number(e.target.value))}
            className="w-20 accent-[#f0e6d3]"
          />
          <span className="text-[10px] text-[#5a6278] w-4 tabular-nums">{lineWidth}</span>
        </div>

        {/* Tool toggle */}
        <div className="flex rounded overflow-hidden border border-[#252b3a]">
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${tool === 'pen' ? 'bg-[#f0e6d3] text-[#0b0e14]' : 'text-[#5a6278] hover:text-[#c9d1e8]'}`}
          >
            Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${tool === 'eraser' ? 'bg-[#f0e6d3] text-[#0b0e14]' : 'text-[#5a6278] hover:text-[#c9d1e8]'}`}
          >
            Eraser
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={clearCanvas}
          className="text-xs px-3 py-1 rounded border border-[#252b3a] text-[#5a6278] hover:text-[#f7768e] hover:border-[#f7768e]/30 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={saveSnapshot}
          disabled={saving}
          className="text-xs px-3 py-1 rounded border border-[#252b3a] text-[#5a6278] hover:text-[#9ece6a] hover:border-[#9ece6a]/30 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Snapshot'}
        </button>
        <button
          onClick={loadSnapshot}
          disabled={loading}
          className="text-xs px-3 py-1 rounded border border-[#252b3a] text-[#5a6278] hover:text-[#7aa2f7] hover:border-[#7aa2f7]/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Snapshot'}
        </button>
        {saveMsg && <span className="text-xs text-[#9ece6a]">{saveMsg}</span>}
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'none' }}
        />

        {/* Remote cursors */}
        {Object.entries(remoteCursors).map(([uid, cur]) => (
          <div
            key={uid}
            className="absolute pointer-events-none z-10 flex items-center gap-1"
            style={{ left: cur.x, top: cur.y, transform: 'translate(-4px, -4px)' }}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
              style={{ background: userColor(uid) }}
            >
              {getInitials(cur.name)}
            </div>
            <span
              className="text-[9px] px-1 rounded"
              style={{ background: userColor(uid), color: '#fff' }}
            >
              {cur.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

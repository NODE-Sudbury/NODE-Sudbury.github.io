import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'NODE Sudbury'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0b1120',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#38bdf8', fontSize: 80, fontWeight: 800, letterSpacing: '0.12em' }}>
          NODE
        </div>
        <div style={{ color: '#d8e3f0', fontSize: 28, marginTop: 16 }}>
          Northern Ontario Developer Exchange
        </div>
        <div style={{ color: '#6b7d96', fontSize: 20, marginTop: 10 }}>
          Greater Sudbury, Ontario
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

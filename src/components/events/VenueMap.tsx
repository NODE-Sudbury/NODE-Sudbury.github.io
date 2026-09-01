"use client"

interface VenueMapProps {
  address: string
  venueName: string
  lat?: number
  lng?: number
}

export default function VenueMap({ address, venueName }: VenueMapProps) {
  const encodedAddress = encodeURIComponent(address)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  const staticMapUrl =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${encodedAddress}` +
    `&zoom=15` +
    `&size=600x300` +
    `&key=${apiKey}` +
    `&markers=${encodedAddress}`

  const directionsUrl = `https://maps.google.com/?q=${encodedAddress}`

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #1e2230',
        borderRadius: '12px',
        overflow: 'hidden',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Map image */}
      <div style={{ width: '100%', aspectRatio: '2 / 1', position: 'relative', background: '#1a1f2e' }}>
        <img
          src={staticMapUrl}
          alt={`Map showing ${venueName}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Venue info */}
      <div
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#f1f5f9',
              marginBottom: '0.25rem',
            }}
          >
            {venueName}
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            {address}
          </div>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#1e40af',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            padding: '0.45rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLAnchorElement).style.background = '#1d4ed8'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLAnchorElement).style.background = '#1e40af'
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Get Directions
        </a>
      </div>
    </div>
  )
}

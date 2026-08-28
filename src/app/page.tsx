import { framerBody } from '@/lib/framerBody'
import FramerScripts from '@/components/FramerScripts'
import NodeTextOverride from '@/components/NodeTextOverride'

export default function Home() {
  return (
    <>
      <div
        dangerouslySetInnerHTML={{ __html: framerBody }}
        suppressHydrationWarning
      />
      <FramerScripts />
      <NodeTextOverride />
    </>
  )
}

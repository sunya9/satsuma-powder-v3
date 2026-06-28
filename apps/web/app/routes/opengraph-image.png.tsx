import { createRoute } from 'honox/factory'
import { ogPng } from '#lib/og'
import { getSite } from '#lib/payload'

export default createRoute(async (c) => {
  const site = await getSite()
  const png = await ogPng({ title: site.title, subtitle: site.description })
  return new Response(png, { headers: { 'Content-Type': 'image/png' } })
})

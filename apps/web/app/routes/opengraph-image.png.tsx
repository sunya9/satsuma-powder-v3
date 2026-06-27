import { createRoute } from 'honox/factory'
import { ogPng, SITE_TITLE } from '../lib/og'

const SITE_DESC = '小学生でももうちょっとマシな感想言う。'

export default createRoute(async (c) => {
  const png = await ogPng({ title: SITE_TITLE, subtitle: SITE_DESC })
  return c.body(png, 200, { 'Content-Type': 'image/png' })
})

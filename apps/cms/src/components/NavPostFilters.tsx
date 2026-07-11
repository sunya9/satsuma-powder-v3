'use client'
import { Link, NavGroup, useConfig } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'
import React from 'react'

import { buildPostsListHref, getActiveStatus, type PostStatus } from './nav-post-filters'

const FILTERS: { label: string; status?: PostStatus }[] = [
  { label: 'All' },
  { label: 'Draft', status: 'draft' },
  { label: 'Published', status: 'published' },
]

// Sidebar group with status-filtered links to the Posts list view.
// Rendered via admin.components.afterNavLinks; reuses the built-in NavGroup
// and .nav__link styles so it looks native.
export function NavPostFilters() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { config } = useConfig()
  const active = getActiveStatus(pathname, searchParams, config.routes.admin)

  return (
    <NavGroup label="Posts">
      {FILTERS.map(({ label, status }) => {
        const isActive = active === (status ?? 'all')
        return (
          <Link
            className="nav__link"
            href={buildPostsListHref(config.routes.admin, status)}
            key={label}
            prefetch={false}
          >
            {isActive && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{label}</span>
          </Link>
        )
      })}
    </NavGroup>
  )
}

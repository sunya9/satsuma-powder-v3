export const config = {
  title: '粉蜜柑。',
  description: '小学生でももうちょっとマシな感想言う。',
  url: (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  coverImage:
    'https://firebasestorage.googleapis.com/v0/b/sunya9-blog.appspot.com/o/assets%2F2021%2F12%2FIMG_1610.resized.resized.JPG?generation=1639123373747761&alt=media',
  icon: 'https://firebasestorage.googleapis.com/v0/b/sunya9-blog.appspot.com/o/assets%2F2021%2F12%2FProfileImage4-circle-ghost.png?generation=1639172821700900&alt=media',
  twitterHandle: 'ephemeralMocha',
} as const

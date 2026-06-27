import { createRoute } from 'honox/factory'
import { AppLayout } from '../components/AppLayout'
import { Articles } from '../components/Articles'
import { config } from '../lib/config'
import { LexicalContent } from '../lib/lexical'
import { payloadRepo } from '../lib/payload'

export default createRoute(async (c) => {
  const [posts, about] = await Promise.all([payloadRepo.getPosts(5), payloadRepo.getAbout()])
  return c.render(
    <AppLayout coverImage={config.coverImage}>
      {about?.content && <LexicalContent state={about.content} />}
      <section aria-labelledby="recent-entries">
        <h2 id="recent-entries" class="my-[1em] text-[2rem] font-normal text-strong">
          最近の投稿
        </h2>
        <Articles posts={posts} />
      </section>
      <hr class="invisible" />
      <p>
        <a class="button" href="/blog">
          全ての投稿
        </a>
      </p>
    </AppLayout>,
  )
})

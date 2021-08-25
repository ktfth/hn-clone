import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import staticFiles from "https://deno.land/x/static_files@1.1.0/mod.ts";
import { parseFeed } from "https://deno.land/x/rss/mod.ts";

const handle = new Handlebars();
const router = new Router();

function cleanUrl(url: URL): string {
  let address = '';
  const pattern = 'www.'
  if (url.host.indexOf(pattern) > -1) {
    address = url.host.slice(pattern.length);
  } else {
    address = url.host;
  }
  return address;
}

router
  .get('/', async (context: any) => {
    const response = await fetch('https://news.ycombinator.com/rss');
    const xml = await response.text();
    const feed = await parseFeed(xml);
    const news: any = [];

    feed.entries.forEach((entry, index) => {
      const href = entry.links[0]['href'];
      let address = null;
      if (href) {
        const url = new URL(href);
        address = cleanUrl(url);
      }
      news.push({
        rank: index + 1,
        url: href,
        tagline: (entry.title && entry.title.value) || href,
        address,
        points: 0
      });
    });

    context.response.body = await handle.renderView('index', {
      title: 'HN Clone',
      news: news
    });
  });

const app = new Application();

app.use(staticFiles("public"));
app.use(router.routes());
app.use(router.allowedMethods());

console.log('Listening on port 8000');
await app.listen("127.0.0.1:8000");
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import staticFiles from "https://deno.land/x/static_files@1.1.0/mod.ts";

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

const title = 'HN Clone'

const news = [{
  rank: 1,
  url: 'https://google.com',
  tagline: 'Google',
  address: 'google.com',
  points: 0
}];

router
  .get('/', async (context: any) => {
    context.response.body = await handle.renderView('index', {
      title,
      news: news
    });
  })
  .get('/submit', async (context: any) => {
    context.response.body = await handle.renderView('submit', {
      title
    });
  })
  .post('/r', async (context: any) => {
    const result = context.request.body();
    const value = await result.value;
    news.push({
      rank: news[news.length - 1]['rank'] + 1,
      tagline: value.get('tagline'),
      url: value.get('url'),
      address: cleanUrl(new URL(value.get('url'))),
      points: 0,
    });
    context.response.redirect('/');
  });

const app = new Application();

app.use(staticFiles("public"));
app.use(router.routes());
app.use(router.allowedMethods());

console.log('Listening on port 8000');
await app.listen("127.0.0.1:8000");
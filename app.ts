import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import { moment } from "https://deno.land/x/deno_moment/mod.ts";

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
  points: 0,
  createdAt: new Date(),
  displayDate: null,
}];

router
  .get('/', async (context: any) => {
    const modifiedNews = news
      .map((n) => {
        n.displayDate = moment(n.createdAt).fromNow().toString();
        return n;
      });
    context.response.body = await handle.renderView('index', {
      title,
      news: modifiedNews,
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
      createdAt: new Date(),
      displayDate: null,
    });
    context.response.redirect('/');
  });

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (context: any) => {
  await context.send({
    root: `${Deno.cwd()}/public`,
    index: context.request.url.pathname
  });
});

const PORT = Deno.env.get('PORT') || 3000;
console.log(`Listening on port ${PORT}`);
await app.listen(`127.0.0.1:${PORT}`);

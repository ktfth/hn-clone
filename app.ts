import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import { moment } from "https://deno.land/x/deno_moment/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.24.0/mod.ts";
import { create, verify } from "https://deno.land/x/djwt/mod.ts"

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

const client = new MongoClient();

await client.connect('mongodb://localhost:27017');

const db = client.database('hn-clone');

interface News {
  rank: number;
  tagline: string;
  url: string;
  address: string;
  points: number;
  createdAt: Date;
  displayDate: string | null;
}

const news = db.collection<News>('news');

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

router
  .get('/', async (context: any) => {
    const allNews = await news.find({}).limit(30).sort({ createdAt: -1 }).toArray();
    const modifiedNews = allNews
      .map((n, i) => {
        n['rank'] = i + 1;
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
  .get('/auth', async (context) => {
    context.response.body = await handle.renderView('auth');
  })
  .post('/auth', async (context) => {
    const result = context.request.body();
    const value = await result.value;
    console.log(value.get('creating'));
    const jwt = await create({
      alg: 'HS512',
      typ: 'JWT'
    }, {
      acct: value.get('acct'),
      pw: value.get('pw'),
    }, key);
    context.response.redirect('/');
  })
  .post('/r', async ({request, response, cookies}) => {
    const result = request.body();
    const value = await result.value;
    await news.insertOne({
      rank: -1,
      tagline: value.get('tagline'),
      url: value.get('url'),
      address: cleanUrl(new URL(value.get('url'))),
      points: 0,
      createdAt: new Date(),
      displayDate: null,
    });
    response.redirect('/');
  });

const app = new Application();

app.use(async (context, next) => {
  const token = await context.cookies.get('token') || '';
  if (token) {
    const result = await verify(token, key);
    if (result) {
      context.state.auth = true;
      context.state.username = result.username;
    }
  }
  await next();
});
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

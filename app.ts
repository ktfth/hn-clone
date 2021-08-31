import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import { moment } from 'https://deno.land/x/deno_moment/mod.ts';
import { Bson, MongoClient } from 'https://deno.land/x/mongo@v0.24.0/mod.ts';
import { create, verify } from 'https://deno.land/x/djwt/mod.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt/mod.ts';

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

const client = new MongoClient();

await client.connect('mongodb://localhost:27017');

const db = client.database('hn-clone');

interface News {
  _id: { $oid: string };
  rank: number;
  tagline: string;
  url: string;
  address: string;
  points: number;
  createdAt: Date;
  displayDate: string | null;
}

interface User {
  _id: { $oid: string };
  acct: string;
  pw: string;
  createdAt: Date;
}

interface Comment {
  _id: { $oid: string };
  message: string;
  createdAt: Date;
  user_id: string;
  news_id: string;
  displayDate: string | null;
}

const news = db.collection<News>('news');
const users = db.collection<User>('users');
const comments = db.collection<Comment>('comments');

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
    if (!context.state.auth) context.response.redirect('/auth');
    context.response.body = await handle.renderView('submit', {
      title
    });
  })
  .get('/auth', async (context) => {
    context.response.body = await handle.renderView('auth', {
      message: await context.cookies.get('message')
    });
  })
  .post('/auth', async (context) => {
    const result = context.request.body();
    const value = await result.value;
    if (context.state.auth) {
      context.cookies.set('message', 'User authenticated');
      context.response.redirect('/');
    } else {
      if (value.get('creating') === 't') {
        const hasUser = await users.findOne({ acct: value.get('acct') });
        if (hasUser) {
          context.cookies.set('message', 'User exists');
          context.response.redirect('/auth')
        } else {
          const user = await users.insertOne({
            acct: value.get('acct'),
            pw: await bcrypt.hash(value.get('pw')),
          });
          context.cookies.set('message', `User created: ${value.get('acct')}`);
          context.response.redirect('/auth');
        }
      } else {
        const user = await users.findOne({ acct: value.get('acct') });
        if (user && await bcrypt.compare(value.get('pw'), user.pw)) {
          const jwt = await create({
            alg: 'HS512',
            typ: 'JWT'
          }, {
            acct: value.get('acct'),
            exp: new Date().getTime() * 60000 * 60,
            iss: 'hn-clone'
          }, key);
          context.cookies.set('token', jwt);
          context.response.redirect('/submit');
        } else {
          context.cookies.set('message', 'Wrong password');
          context.response.redirect('/auth');
        }
      }
    }
  })
  .get('/logout', async (context) => {
    if (context.state.auth) {
      context.cookies.set('token', '');
      context.cookies.set('message', 'Logged out');
      context.response.redirect('/');
    } else {
      context.cookies.set('message', 'Please log in');
      context.response.redirect('/');
    }
  })
  .post('/r', async ({request, response, cookies, state}) => {
    if (!state.auth) response.redirect('/auth');
    const result = request.body();
    const value = await result.value;
    const user = await users.findOne({ acct: state.username });
    if (user) {
      await news.insertOne({
        rank: -1,
        tagline: value.get('tagline'),
        url: value.get('url'),
        address: cleanUrl(new URL(value.get('url'))),
        points: 0,
        createdAt: new Date(),
        displayDate: null,
        user_id: user._id.toString(),
      });
      response.redirect('/');
    } else {
      response.redirect('/auth');
    }
  })
  .get('/comment', async (context) => {
    if (!context.state.auth) context.response.redirect('/auth');
    const id = context.request.url.searchParams.get('id');
    let currentNews = await news
      .findOne({ _id: new Bson.ObjectId(id) });
    let allComments = await comments
      .find({ news_id: id })
      .sort({ createdAt: -1 })
      .toArray();
    allComments = allComments
      .map((comment) => {
        comment.displayDate = moment(comment.createdAt).fromNow().toString();
        return comment;
      });
    if (currentNews) {
      currentNews.displayDate = moment(currentNews.createdAt).fromNow().toString();
    }
    context.response.body = await handle.renderView('comment', {
      title,
      news: currentNews,
      comments: allComments,
    });
  });

const app = new Application();

app.use(async (context, next) => {
  const token = await context.cookies.get('token') || '';
  if (token) {
    try {
      const result = await verify(token, key);
      if (result) {
        context.state.auth = true;
        context.state.username = result.username;
      }
    } catch (err) {
      context.cookies.set('token', '');
      context.cookies.set('message', '');
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

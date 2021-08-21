import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import staticFiles from "https://deno.land/x/static_files@1.1.0/mod.ts";

const handle = new Handlebars();
const router = new Router();

router
  .get('/', async (context: any) => {
    context.response.body = await handle.renderView('index', {
      title: 'HN Clone',
      news: [
        {
          rank: 1,
          url: 'https://codewriteplay.com/2021/08/20/a-facebook-hacker-beat-my-2fa-bricked-my-oculus-quest-and-hit-the-company-credit-card/',
          tagline: 'Facebook hacker beat my 2FA, bricked my Oculus, and hit the company credit card',
          address: 'codewriteplay.com',
          points: 539,
        }
      ]
    });
  });

const app = new Application();

app.use(staticFiles("public"));
app.use(router.routes());
app.use(router.allowedMethods());

console.log('Listening on port 8000');
await app.listen("127.0.0.1:8000");
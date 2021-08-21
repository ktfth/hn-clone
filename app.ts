import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Handlebars } from 'https://deno.land/x/handlebars/mod.ts';
import staticFiles from "https://deno.land/x/static_files@1.1.0/mod.ts";

const handle = new Handlebars();
const router = new Router();

router
  .get('/', async (context: any) => {
    context.response.body = await handle.renderView('index', {
      title: 'HN Clone'
    });
  });

const app = new Application();

app.use(staticFiles("public"));
app.use(router.routes());
app.use(router.allowedMethods());

console.log('Listening on port 8000');
await app.listen("127.0.0.1:8000");
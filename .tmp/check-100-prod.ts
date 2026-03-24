import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

async function main() {
  const client = new ConvexHttpClient('https://cheery-okapi-475.convex.cloud');
  (client as any).setAdminAuth(process.env.CONVEX_DEPLOY_KEY!, { subject: process.env.LIBRARY_CLERK_ID!, issuer: 'https://clerk.local' });
  const tree = await client.query(api.library.getLibraryCollectionsTree, {});
  const root = tree.find((node:any) => node.name === '100. Filosofía' && node.depth === 0);
  if (!root) {
    console.log(JSON.stringify({ rootFound:false, treeSample: tree.slice(0,20) }, null, 2));
    return;
  }
  let cursor: string | null = null;
  let total = 0;
  let pages = 0;
  while (true) {
    const page = await client.query(api.library.getLibraryCollectionBooksPage, {
      collectionId: root.id,
      search: '',
      paginationOpts: { numItems: 200, cursor }
    });
    total += page.page.length;
    pages += 1;
    if (page.isDone) break;
    cursor = page.continueCursor;
    if (!cursor) break;
  }
  console.log(JSON.stringify({ rootFound:true, root, total, pages }, null, 2));
}
main().catch((e)=>{console.error(e);process.exit(1)});

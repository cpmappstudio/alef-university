import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

async function main() {
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  (client as any).setAdminAuth(process.env.CONVEX_DEPLOY_KEY!, {
    subject: process.env.LIBRARY_CLERK_ID!, issuer: 'https://clerk.local'
  });
  const tree = await client.query(api.library.getLibraryCollectionsTree, {});
  const page = await client.query(api.library.getAllLibraryBooksPage, { paginationOpts: { numItems: 200, cursor: null }, search: '', statuses: [], languages: [], categories: [] });
  console.log(JSON.stringify({ tree, books: page.page.map((b:any)=>({id:b.id,title:b.title,fileName:b.fileName})) }, null, 2));
}
main().catch((e)=>{console.error(e);process.exit(1);});

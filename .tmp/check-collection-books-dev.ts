import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

async function main() {
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  (client as any).setAdminAuth(process.env.CONVEX_DEPLOY_KEY!, {
    subject: process.env.LIBRARY_CLERK_ID!, issuer: 'https://clerk.local'
  });
  const tree = await client.query(api.library.getLibraryCollectionsTree, {});
  const leaf = tree.find((node:any)=>node.name==='04.2 El aparato crítico');
  if (!leaf) throw new Error('Leaf not found');
  const page = await client.query(api.library.getLibraryCollectionBooksPage, { collectionId: leaf.id, search: '', paginationOpts: { numItems: 20, cursor: null } });
  console.log(JSON.stringify(page.page.map((b:any)=>({id:b.id,title:b.title,fileName:b.fileName,status:b.status})), null, 2));
}
main().catch((e)=>{console.error(e);process.exit(1);});

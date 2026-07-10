import { Metadata, ResolvingMetadata } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function generateMetadata(
  { params }: { params: any },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Await params safely for Next.js 15+
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    // Check if id is an valid ObjectId or treating it as an alias string
    const query = ObjectId.isValid(id) && id.length === 24 
      ? { _id: new ObjectId(id) } 
      : { alias: id };
      
    const edition = await db.collection('editions').findOne(query);
    
    if (!edition) {
      return {};
    }
    
    // OG image: first page URL from DB (e.g. Cloudflare R2 public URL). Must be https for WhatsApp/Facebook.
    const pageImage = edition.pages?.[0]?.url || '/logo.png';
    const baseUrl = process.env.NEXTAUTH_URL || 'https://yellowsingam.com';
    const absoluteImageUrl = pageImage.startsWith('http') ? pageImage : `${baseUrl}${pageImage}`;
    const editionSlug = typeof edition.alias === 'string' ? edition.alias : id;
    const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/edition/${editionSlug}`;

    return {
      title: `${edition.name} - Yellow Singam ePaper`,
      description: edition.metaDescription || `Read ${edition.name} online from Yellow Singam Daily ePaper.`,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: edition.metaTitle || `${edition.name} - Yellow Singam`,
        description: edition.metaDescription || `Read ${edition.name} online from Yellow Singam Daily ePaper.`,
        url: canonicalUrl,
        siteName: 'Yellow Singam',
        locale: 'te_IN',
        images: [
          {
            url: absoluteImageUrl,
            width: 800,
            height: 1200,
            alt: `${edition.name} Front Page`,
          },
        ],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: edition.metaTitle || `${edition.name} - Yellow Singam`,
        description: edition.metaDescription || `Read ${edition.name} online from Yellow Singam Daily ePaper.`,
        images: [absoluteImageUrl],
      },
    };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return {};
  }
}

export default function EditionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}

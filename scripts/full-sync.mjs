import { createClient } from '@supabase/supabase-js';

async function fullSync() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const sanityApiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01';

  if (!supabaseUrl || !supabaseServiceKey || !sanityProjectId || !sanityDataset) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const sanityToken = process.env.SANITY_API_TOKEN;
  const headers = {};
  if (sanityToken) headers['Authorization'] = `Bearer ${sanityToken}`;

  console.log('Fetching all products from Sanity...');
  const sanityQuery = encodeURIComponent('*[_type == "product" && !(_id in path("drafts.**"))]');
  const sanityUrl = `https://${sanityProjectId}.api.sanity.io/v${sanityApiVersion}/data/query/${sanityDataset}?query=${sanityQuery}`;
  
  const sanityRes = await fetch(sanityUrl, { headers });
  if (!sanityRes.ok) {
    throw new Error(`Sanity API error: ${sanityRes.status} ${sanityRes.statusText}`);
  }
  
  const sanityData = await sanityRes.json();
  const products = sanityData.result;
  
  console.log(`Found ${products.length} active products in Sanity. Upserting to Supabase...`);

  for (const payload of products) {
    try {
      const imageRef = payload.images?.[0]?.asset?._ref;
      let imageUrl = null;

      if (imageRef) {
        const [, id, dimensions, format] = imageRef.split('-');
        imageUrl = `https://cdn.sanity.io/images/${sanityProjectId}/${sanityDataset}/${id}-${dimensions}.${format}`;
      }

      const productRow = {
        id: payload._id,
        slug: payload.slug?.current,
        name: payload.name,
        short_description: payload.shortDescription,
        price: payload.price ?? null,
        original_price: payload.originalPrice ?? null,
        image_url: imageUrl,
        category: payload.category ?? null,
        is_new: payload.isNew ?? false,
        is_best_seller: payload.isBestSeller ?? false,
        hero_title: payload.heroTitle ?? null,
        hero_subtitle: payload.heroSubtitle ?? null,
        hero_cta: payload.heroCta ?? null,
        benefits: payload.benefits ?? null,
        specifications: payload.specifications ?? null,
        testimonials: payload.testimonials ?? null,
        cta_headline: payload.ctaHeadline ?? null,
        cta_text: payload.ctaText ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('products')
        .upsert(productRow, { onConflict: 'id' });

      if (error) {
        console.error(`Error upserting ${payload.name}:`, error.message);
      } else {
        console.log(`✅ Synced: ${payload.name}`);
      }
    } catch (e) {
      console.error(`Failed parsing product ${payload._id}:`, e);
    }
  }
  
  console.log('🎉 Full sync complete!');
}

fullSync();

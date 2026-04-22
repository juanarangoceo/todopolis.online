import { createClient } from '@supabase/supabase-js';

async function syncDeletes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const sanityApiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01';

  if (!supabaseUrl || !supabaseServiceKey || !sanityProjectId || !sanityDataset) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('1. Fetching products from Sanity...');
    const sanityQuery = encodeURIComponent('*[_type == "product"] { _id }');
    const sanityUrl = `https://${sanityProjectId}.api.sanity.io/v${sanityApiVersion}/data/query/${sanityDataset}?query=${sanityQuery}`;
    
    // Add Authorization header if you are using a protected dataset, 
    // although generally queries to 'production' are public, we use the token just in case.
    const sanityToken = process.env.SANITY_API_TOKEN;
    const headers = {};
    if (sanityToken) headers['Authorization'] = `Bearer ${sanityToken}`;

    const sanityRes = await fetch(sanityUrl, { headers });
    if (!sanityRes.ok) {
      throw new Error(`Sanity API error: ${sanityRes.status} ${sanityRes.statusText}`);
    }
    
    const sanityData = await sanityRes.json();
    const sanityProductIds = new Set(sanityData.result.map((p) => p._id));
    // also remove draft prefixes in case we want to match exact IDs. Usually in Supabase they are the same.
    const cleanSanityIds = new Set(Array.from(sanityProductIds).map(id => id.replace('drafts.', '')));
    
    console.log(`✅ Found ${cleanSanityIds.size} products in Sanity.`);

    console.log('2. Fetching products from Supabase...');
    const { data: supabaseProducts, error: supabaseError } = await supabase
      .from('products')
      .select('id, name');

    if (supabaseError) throw supabaseError;

    console.log(`✅ Found ${supabaseProducts.length} products in Supabase.`);

    console.log('3. Comparing Data...');
    const productsToDelete = supabaseProducts.filter(p => !cleanSanityIds.has(p.id));

    if (productsToDelete.length === 0) {
      console.log('🎉 Supabase is already in sync. No products to delete.');
      return;
    }

    console.log(`⚠️ Found ${productsToDelete.length} extra products in Supabase that don't exist in Sanity:`);
    productsToDelete.forEach(p => console.log(`  - [${p.id}] ${p.name}`));

    console.log('4. Deleting extra products from Supabase...');
    
    const idsToDelete = productsToDelete.map(p => p.id);
    
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) throw deleteError;

    console.log(`✅ Successfully deleted ${productsToDelete.length} orphaned products from Supabase.`);

  } catch (error) {
    console.error('❌ Error during synchronization:', error);
  }
}

syncDeletes();

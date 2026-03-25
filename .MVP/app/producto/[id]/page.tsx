import { notFound } from 'next/navigation';
import { getProductById, getRelatedProducts, products } from '@/lib/products';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductHero } from '@/components/product/product-hero';
import { ProductBenefits } from '@/components/product/product-benefits';
import { ProductDetails } from '@/components/product/product-details';
import { ProductTestimonials } from '@/components/product/product-testimonials';
import { ProductCTA } from '@/components/product/product-cta';
import { RelatedProducts } from '@/components/product/related-products';

export function generateStaticParams() {
  return products.map((product) => ({
    id: product.id,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  
  if (!product) {
    return { title: 'Producto no encontrado' };
  }
  
  return {
    title: `${product.name} | Todopolis`,
    description: product.shortDescription,
    openGraph: {
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  
  if (!product) {
    notFound();
  }
  
  const relatedProducts = getRelatedProducts(product);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section with Product */}
        <ProductHero product={product} />
        
        {/* Benefits Section */}
        <ProductBenefits product={product} />
        
        {/* Product Details */}
        <ProductDetails product={product} />
        
        {/* Testimonials */}
        <ProductTestimonials product={product} />
        
        {/* CTA Section */}
        <ProductCTA product={product} />
        
        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />
      </main>
      
      <Footer />
    </div>
  );
}

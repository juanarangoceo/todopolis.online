'use server';

import { createClient } from '@supabase/supabase-js';

export async function createOrder(formData: FormData) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase no está configurado');
    }

    // Initialize Supabase admin client to bypass RLS for inserting orders
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderData = {
      product_id: formData.get('productId') as string,
      product_name: formData.get('productName') as string,
      price: parseFloat(formData.get('price') as string),
      quantity: parseInt(formData.get('quantity') as string) || 1,
      customer_name: formData.get('customerName') as string,
      customer_phone: formData.get('customerPhone') as string,
      customer_address: formData.get('customerAddress') as string,
      customer_city: formData.get('customerCity') as string,
      status: 'pending',
    };

    if (!orderData.customer_name || !orderData.customer_phone || !orderData.customer_address || !orderData.customer_city) {
      return { success: false, error: 'Por favor completa todos los campos' };
    }

    const { error } = await supabase
      .from('orders')
      .insert([orderData]);

    if (error) {
      console.error('Error insertando orden:', error);
      return { success: false, error: 'Ocurrió un error al procesar tu pedido' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Server action error:', err);
    return { success: false, error: 'Ocurrió un error inesperado' };
  }
}

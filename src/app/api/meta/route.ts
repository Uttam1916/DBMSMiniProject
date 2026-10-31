import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [categoriesRes, locationsRes, usersRes] = await Promise.all([
      query('SELECT category_id, name FROM category ORDER BY name ASC;'),
      query('SELECT location_id, name FROM location ORDER BY name ASC;'),
      query('SELECT user_id, name, email, role FROM users ORDER BY user_id ASC;'),
    ]);

    return NextResponse.json({
      categories: categoriesRes.rows,
      locations: locationsRes.rows,
      users: usersRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error.message },
      { status: 500 }
    );
  }
}

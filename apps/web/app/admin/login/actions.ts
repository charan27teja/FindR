'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function adminLogin(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return { error: 'Admin credentials not configured on the server.' };
  }

  if (username === validUsername && password === validPassword) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'active', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });
  } else {
    return { error: 'Invalid username or password' };
  }
  
  redirect('/admin');
}

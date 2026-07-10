import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  if (!user && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) {
      if (pathname !== '/inactive' && pathname !== '/login') {
         const url = request.nextUrl.clone()
         url.pathname = '/inactive'
         return NextResponse.redirect(url)
      }
    } else {
        if (pathname === '/login' || pathname === '/') {
            const url = request.nextUrl.clone()
            url.pathname = profile.role === 'admin' ? '/admin/dashboard' : '/app/tasks'
            return NextResponse.redirect(url)
        }

        if (pathname.startsWith('/admin') && profile.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/app/tasks'
            return NextResponse.redirect(url)
        }

        if (pathname.startsWith('/app') && profile.role === 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/dashboard'
            return NextResponse.redirect(url)
        }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

import { redirect } from 'next/navigation'

export default function HomePage() {
  // The middleware will handle authentication
  // If user reaches here, they're authenticated, so redirect to dashboard
  redirect('/dashboard')
}
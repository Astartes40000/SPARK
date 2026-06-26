import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Tag, Eye, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import ReplySection from './ReplySection'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { data: post } = await supabase
    .from('posts')
    .select(`*, profiles(full_name, role, email), categories(name)`)
    .eq('id', id)
    .single()

  if (!post) notFound()

  // Update views
  await supabase.from('posts').update({ views: (post.views || 0) + 1 }).eq('id', id)

  // Get replies
  const { data: replies } = await supabase
    .from('replies')
    .select('*, profiles(full_name, role)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const statusColors: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-700',
    answered: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to consultations
      </Link>

      {/* Post */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[post.status]}`}>
            {post.status === 'open' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
            {post.status}
          </span>
          {(post.categories as any)?.name && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              <Tag className="w-3 h-3" />
              {(post.categories as any).name}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
            <Eye className="w-3 h-3" /> {post.views} views
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>

        {/* Author */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-700">
              {(post.profiles as any)?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">{(post.profiles as any)?.full_name}</span>
            <span className="text-xs text-gray-400 ml-2">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.image_urls.map((url: string, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="max-h-64 rounded-lg border border-gray-200 object-contain cursor-pointer hover:opacity-90"
              />
            ))}
          </div>
        )}
      </div>

      {/* Replies */}
      <ReplySection
        postId={id}
        replies={replies || []}
        currentProfile={profile}
        postAuthorId={post.author_id}
      />
    </div>
  )
}

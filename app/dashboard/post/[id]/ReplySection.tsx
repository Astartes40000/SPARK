'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Reply } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import RichEditor from '@/components/RichEditor'
import { MessageSquare, Award } from 'lucide-react'

interface ReplySectionProps {
  postId: string
  replies: (Reply & { profiles: Profile })[]
  currentProfile: Profile | null
  postAuthorId: string
}

export default function ReplySection({ postId, replies: initialReplies, currentProfile, postAuthorId }: ReplySectionProps) {
  const [replies, setReplies] = useState(initialReplies)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content === '<p></p>') {
      setError('Reply cannot be empty')
      return
    }

    setLoading(true)
    setError('')

    const isSmeAnswer = currentProfile?.role === 'sme'

    const { data: reply, error: replyError } = await supabase
      .from('replies')
      .insert({
        post_id: postId,
        author_id: currentProfile!.id,
        content,
        is_sme_answer: isSmeAnswer,
      })
      .select('*, profiles(full_name, role)')
      .single()

    if (replyError) {
      setError(replyError.message)
    } else {
      setReplies([...replies, reply as Reply & { profiles: Profile }])
      setContent('')
      router.refresh()
    }
    setLoading(false)
  }

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      sme: 'bg-green-100 text-green-700',
      investigator: 'bg-blue-100 text-blue-700',
    }
    return badges[role] || badges.investigator
  }

  return (
    <div className="space-y-4">
      {/* Replies count */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        <h2 className="font-semibold text-gray-900">{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</h2>
      </div>

      {/* Replies list */}
      {replies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No replies yet. Be the first to respond!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`bg-white rounded-xl border p-4 ${
                reply.is_sme_answer ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              {reply.is_sme_answer && (
                <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium mb-2">
                  <Award className="w-4 h-4" />
                  SME Expert Answer
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">
                    {(reply.profiles as any)?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {(reply.profiles as any)?.full_name}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getRoleBadge((reply.profiles as any)?.role)}`}>
                  {(reply.profiles as any)?.role?.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                </span>
              </div>
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: reply.content }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {currentProfile && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            {currentProfile.role === 'sme' ? '🎓 Post your expert answer' : '💬 Add a reply'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <RichEditor
              content={content}
              onChange={setContent}
              placeholder={currentProfile.role === 'sme' ? 'Share your expert knowledge...' : 'Write your reply...'}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  currentProfile.role === 'sme'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Posting...' : currentProfile.role === 'sme' ? 'Post Expert Answer' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

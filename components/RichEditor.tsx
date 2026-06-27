'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react'

interface RichEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Write your message...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  })

  if (!editor) return null

  const tools = [
    { icon: <Bold className="w-3.5 h-3.5" />, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
    { icon: <Italic className="w-3.5 h-3.5" />, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
    { icon: <Heading2 className="w-3.5 h-3.5" />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'Heading' },
    { icon: <List className="w-3.5 h-3.5" />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Bullet List' },
    { icon: <ListOrdered className="w-3.5 h-3.5" />, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Ordered List' },
  ]

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#FF9900'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,153,0,0.15)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div className="flex items-center gap-0.5 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {tools.map((tool, i) => (
          <button key={i} type="button" onClick={tool.action} title={tool.title}
            className="p-1.5 rounded-lg transition-all"
            style={tool.active ? { background: 'rgba(255,153,0,0.15)', color: '#E68A00' } : { color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { if (!tool.active) { e.currentTarget.style.background = 'rgba(255,153,0,0.08)'; e.currentTarget.style.color = '#FF9900' }}}
            onMouseLeave={(e) => { if (!tool.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}}>
            {tool.icon}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="p-3 min-h-[120px] prose prose-sm max-w-none focus:outline-none" style={{ color: 'var(--text)' }} />
    </div>
  )
}

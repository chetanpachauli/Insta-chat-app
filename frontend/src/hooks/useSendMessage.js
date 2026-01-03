import { useContext } from 'react'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import ChatContext from '../context/ChatContext'

export default function useSendMessage() {
  const { user } = useContext(AuthContext)
  const { sendMessage, addLocalMessage } = useContext(ChatContext)

  const uploadImageToCloudinary = async (file) => {
    const url = import.meta.env.VITE_CLOUDINARY_URL
    if (!url) throw new Error('Missing Cloudinary URL')
    const form = new FormData()
    form.append('file', file)
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
    if (preset) form.append('upload_preset', preset)
    const res = await fetch(url, { method: 'POST', body: form })
    const data = await res.json()
    return data.secure_url || data.url
  }

  const send = async ({ receiverId, text = '', file = null }) => {
    if (!user?.id) throw new Error('Not authenticated')
    if (!receiverId) throw new Error('No receiver specified')

    let imageUrl = ''
    if (file) {
      imageUrl = await uploadImageToCloudinary(file)
    }

    // No need for manual optimistic update here since sendMessage in ChatContext handles it
    return await sendMessage({ 
      receiverId, 
      message: text || '', 
      image: imageUrl || '' 
    })
  }

  return { send }
}

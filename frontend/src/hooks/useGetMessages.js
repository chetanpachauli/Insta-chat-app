import { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import ChatContext from '../context/ChatContext'

export default function useGetMessages(selectedUser) {
  const { user } = useContext(AuthContext)
  const { messages, fetchMessages } = useContext(ChatContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const targetId = selectedUser?._id || selectedUser?.id
      if (!user?.id || !targetId) return
      
      setLoading(true)
      setError(null)
      try {
        await fetchMessages(targetId)
      } catch (err) {
        if (!mounted) return
        setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [user?.id, selectedUser?._id, selectedUser?.id])

  const targetId = selectedUser?._id || selectedUser?.id
  const chatMessages = targetId ? (messages[targetId] || []) : []

  return { messages: chatMessages, loading, error, refetch: () => fetchMessages(targetId) }
}

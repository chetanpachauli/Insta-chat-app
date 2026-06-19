import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ChatContext } from './ChatContext';
import { useAuth } from './AuthContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/axiosConfig';

const CallContext = createContext(null);

// Dynamic sound generator using Web Audio API (cross-browser, zero external asset dependencies)
class SoundGenerator {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
    this.dialInterval = null;
  }
  
  init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch (e) {
        console.warn('AudioContext initialization failed:', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playRing() {
    try {
      this.init();
      this.stop();
      if (!this.ctx) return;
      
      const playTone = () => {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.frequency.setValueAtTime(440, this.ctx.currentTime); // Ring tone A4
        osc2.frequency.setValueAtTime(480, this.ctx.currentTime); // Ring tone G4
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.8);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 2);
        osc2.stop(this.ctx.currentTime + 2);
      };

      playTone();
      this.ringInterval = setInterval(playTone, 3000);
    } catch (e) {
      console.warn('Failed to play ringtone:', e);
    }
  }

  playDial() {
    try {
      this.init();
      this.stop();
      if (!this.ctx) return;

      const playTone = () => {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(350, this.ctx.currentTime); // Standard US Dial Tone
        
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.setValueAtTime(0, this.ctx.currentTime + 0.8);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 1.0);
      };
      
      playTone();
      this.dialInterval = setInterval(playTone, 2000);
    } catch (e) {
      console.warn('Failed to play dial tone:', e);
    }
  }

  stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.dialInterval) {
      clearInterval(this.dialInterval);
      this.dialInterval = null;
    }
  }
}

const sounds = new SoundGenerator();

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const { getSocket, isConnected, sendMessage } = useContext(ChatContext);

  const [callState, setCallState] = useState(null); // 'dialing' | 'incoming' | 'connecting' | 'connected' | null
  const [callType, setCallType] = useState(null); // 'voice' | 'video' | null
  const [callerInfo, setCallerInfo] = useState(null);
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const callingTimeoutRef = useRef(null);
  const activeChatIdRef = useRef(null); // Keep track of the active user we are calling

  const currentUserId = user?.id || user?._id;

  // Cleanup helper
  const resetCallState = useCallback(() => {
    sounds.stop();
    
    if (callingTimeoutRef.current) {
      clearTimeout(callingTimeoutRef.current);
      callingTimeoutRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState(null);
    setCallType(null);
    setCallerInfo(null);
    setReceiverInfo(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setDuration(0);
    iceCandidateQueueRef.current = [];
    activeChatIdRef.current = null;
  }, []);

  // Format call duration to MM:SS
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // WebRTC configuration
  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Helper to persist calling messages/logs in database
  const saveCallMessage = useCallback(async (text) => {
    const targetId = activeChatIdRef.current;
    if (!targetId || !currentUserId) return;
    try {
      // Save directly using sendMessage API from ChatContext
      await sendMessage({
        receiverId: targetId,
        message: text
      });
    } catch (err) {
      console.error('Failed to save call log message:', err);
    }
  }, [currentUserId, sendMessage]);

  // Stop calling sound on accept/reject
  const stopAudioTracks = (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Handle peer connection track and candidate setup
  const createPeerConnection = useCallback((otherUserId, socket) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(pcConfig);
    peerConnectionRef.current = pc;

    // Send local stream tracks to other user
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Ice candidate callback
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('iceCandidate', { to: otherUserId, candidate: event.candidate });
      }
    };

    // Received remote stream track callback
    pc.ontrack = (event) => {
      console.log('Received remote track', event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection state change:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        toast.error('Call disconnected');
        resetCallState();
      }
    };

    return pc;
  }, [resetCallState]);

  // Flush queued ice candidates
  const flushIceCandidates = useCallback(() => {
    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
      console.log(`Flushing ${iceCandidateQueueRef.current.length} ICE candidates`);
      iceCandidateQueueRef.current.forEach(candidate => {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(e => console.warn('Error applying queued ICE candidate:', e));
      });
      iceCandidateQueueRef.current = [];
    }
  }, []);

  // Initiate a call
  const startCall = useCallback(async (targetUser, type) => {
    const socket = getSocket();
    if (!socket) {
      toast.error('Chat server disconnected. Try again in a moment.');
      return;
    }

    const targetUserId = targetUser?._id || targetUser?.id;
    if (!targetUserId) {
      toast.error('Cannot call: Invalid user');
      return;
    }

    resetCallState();
    sounds.init();
    sounds.playDial();

    setCallState('dialing');
    setCallType(type);
    setReceiverInfo(targetUser);
    activeChatIdRef.current = String(targetUserId);

    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Render local preview immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create WebRTC Peer Connection
      const pc = createPeerConnection(targetUserId, socket);

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit call initiation
      socket.emit('callUser', {
        userToCall: targetUserId,
        signalData: offer,
        from: currentUserId,
        fromUser: {
          _id: currentUserId,
          username: user.username,
          profilePic: user.profilePic
        },
        type
      });

      // 30 seconds call timeout (missed call)
      callingTimeoutRef.current = setTimeout(() => {
        toast.error('No answer');
        socket.emit('cancelCall', { to: targetUserId });
        saveCallMessage(`📞 Missed ${type} call`);
        resetCallState();
      }, 30000);

    } catch (err) {
      console.error('Error starting media stream:', err);
      toast.error('Failed to access camera or microphone. Please check permissions.');
      resetCallState();
    }
  }, [getSocket, currentUserId, user, createPeerConnection, resetCallState, saveCallMessage]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const socket = getSocket();
    if (!socket || !callerInfo) return;

    sounds.stop();
    setCallState('connecting');

    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Render local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(callerInfo._id, socket);

      // Set caller's SDP offer
      await pc.setRemoteDescription(new RTCSessionDescription(callerInfo.signal));
      flushIceCandidates();

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Emit accepted signal
      socket.emit('answerCall', { to: callerInfo._id, signal: answer });

    } catch (err) {
      console.error('Error accepting call:', err);
      toast.error('Failed to access camera/mic.');
      socket.emit('rejectCall', { to: callerInfo._id });
      resetCallState();
    }
  }, [getSocket, callerInfo, callType, createPeerConnection, flushIceCandidates, resetCallState]);

  // Decline incoming call
  const rejectCall = useCallback(() => {
    const socket = getSocket();
    if (socket && callerInfo) {
      socket.emit('rejectCall', { to: callerInfo._id });
    }
    resetCallState();
  }, [getSocket, callerInfo, resetCallState]);

  // End active call
  const endCall = useCallback((sendSignal = true) => {
    const socket = getSocket();
    const otherId = activeChatIdRef.current;

    if (sendSignal && socket && otherId) {
      socket.emit('endCall', { to: otherId });
    }

    if (callState === 'connected') {
      const callTypeName = callType === 'video' ? 'video' : 'voice';
      saveCallMessage(`📞 ${callTypeName.charAt(0).toUpperCase() + callTypeName.slice(1)} call ended • ${formatDuration(duration)}`);
    } else if (callState === 'dialing' && otherId && socket) {
      socket.emit('cancelCall', { to: otherId });
      const callTypeName = callType === 'video' ? 'video' : 'voice';
      saveCallMessage(`📞 Cancelled ${callTypeName} call`);
    }

    resetCallState();
  }, [getSocket, callState, callType, duration, saveCallMessage, resetCallState]);

  // Toggle Mute mic
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle Camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, [callType]);

  // Handle incoming track bind
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration Timer logic
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Socket signaling listener setup
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) return;

    const handleIncomingCall = (data) => {
      // If already in a call, send busy signal automatically
      if (callStateRef.current) {
        console.log('Incoming call ignored: User busy');
        socket.emit('busyCall', { to: data.from });
        return;
      }

      sounds.init();
      sounds.playRing();

      setCallState('incoming');
      setCallType(data.type);
      setCallerInfo({
        _id: data.from,
        username: data.fromUser.username,
        profilePic: data.fromUser.profilePic,
        signal: data.signal
      });
      activeChatIdRef.current = String(data.from);
    };

    const handleCallAccepted = async (data) => {
      if (callingTimeoutRef.current) {
        clearTimeout(callingTimeoutRef.current);
        callingTimeoutRef.current = null;
      }

      sounds.stop();
      setCallState('connected');

      try {
        if (peerConnectionRef.current) {
          console.log('Setting remote description (answer SDP)');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          flushIceCandidates();
        }
      } catch (e) {
        console.error('Error setting remote description on callAccepted:', e);
        toast.error('Failed to connect call');
        resetCallState();
      }
    };

    const handleIceCandidate = (data) => {
      const candidate = data.candidate;
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(e => console.error('Error adding ICE candidate:', e));
      } else {
        iceCandidateQueueRef.current.push(candidate);
      }
    };

    const handleCallRejected = () => {
      toast.error('Call declined');
      const otherId = activeChatIdRef.current;
      const callTypeName = callTypeRef.current === 'video' ? 'video' : 'voice';
      if (otherId) {
        saveCallMessage(`📞 Declined ${callTypeName} call`);
      }
      resetCallState();
    };

    const handleCallEnded = () => {
      toast.success('Call ended');
      resetCallState();
    };

    const handleCallCancelled = () => {
      toast.error('Call cancelled');
      resetCallState();
    };

    const handleCallBusy = () => {
      toast.error('User is busy on another call');
      resetCallState();
    };

    const handleCallOffline = () => {
      toast.error('User is currently offline');
      resetCallState();
    };

    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('callRejected', handleCallRejected);
    socket.on('callEnded', handleCallEnded);
    socket.on('callCancelled', handleCallCancelled);
    socket.on('callBusy', handleCallBusy);
    socket.on('callOffline', handleCallOffline);

    return () => {
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('iceCandidate', handleIceCandidate);
      socket.off('callRejected', handleCallRejected);
      socket.off('callEnded', handleCallEnded);
      socket.off('callCancelled', handleCallCancelled);
      socket.off('callBusy', handleCallBusy);
      socket.off('callOffline', handleCallOffline);
    };
  }, [getSocket, isConnected, resetCallState, flushIceCandidates, saveCallMessage]);

  // Keep refs in sync for the event handlers (since useEffect binds listeners once)
  const callStateRef = useRef(callState);
  const callTypeRef = useRef(callType);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  // Auto clean-up on unmount
  useEffect(() => {
    return () => {
      resetCallState();
    };
  }, [resetCallState]);

  return (
    <CallContext.Provider value={{
      callState,
      callType,
      callerInfo,
      receiverInfo,
      localStream,
      remoteStream,
      isMuted,
      isCameraOff,
      duration,
      formatDuration,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      localVideoRef,
      remoteVideoRef
    }}>
      {children}

      {/* Global Call Overlays */}
      {callState === 'incoming' && (
        <IncomingCallOverlay
          callerInfo={callerInfo}
          callType={callType}
          onAccept={acceptCall}
          onDecline={rejectCall}
        />
      )}

      {(callState === 'dialing' || callState === 'connecting' || callState === 'connected') && (
        <ActiveCallOverlay
          callState={callState}
          callType={callType}
          partnerInfo={callState === 'dialing' ? receiverInfo : callerInfo}
          localStream={localStream}
          remoteStream={remoteStream}
          duration={duration}
          formatDuration={formatDuration}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onMuteToggle={toggleMute}
          onCameraToggle={toggleCamera}
          onHangup={() => endCall(true)}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
        />
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);

// --- CALL OVERLAY COMPONENTS ---

// 1. Incoming Call Screen
const IncomingCallOverlay = ({ callerInfo, callType, onAccept, onDecline }) => {
  const avatarText = callerInfo?.username ? callerInfo.username[0].toUpperCase() : 'U';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 text-white animate-fade-in backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center px-6">
        
        {/* Pulsing Double Ring Avatar */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full border-4 border-purple-500/40 animate-ping" />
          <div className="absolute w-28 h-28 rounded-full border-4 border-pink-500/60 animate-pulse-soft" />
          {callerInfo?.profilePic ? (
            <img
              src={callerInfo.profilePic}
              alt={callerInfo.username}
              className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800 shadow-2xl relative z-10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-brand flex items-center justify-center text-white text-3xl font-bold border-4 border-zinc-800 shadow-2xl relative z-10">
              {avatarText}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4">
          <h3 className="text-2xl font-bold truncate tracking-wide">{callerInfo?.username || 'Unknown'}</h3>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            Incoming Instagram {callType === 'video' ? 'Video' : 'Voice'} Call...
          </p>
        </div>

        {/* Actions Button Group */}
        <div className="flex items-center gap-12 mt-12 w-full justify-center">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-all duration-200">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium group-hover:text-red-400 transition-colors">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-all duration-200 animate-pulse-soft">
              {callType === 'video' ? (
                <Video className="w-7 h-7 text-white" />
              ) : (
                <Phone className="w-7 h-7 text-white" />
              )}
            </div>
            <span className="text-xs text-zinc-400 font-medium group-hover:text-emerald-400 transition-colors">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Active Call Screen
const ActiveCallOverlay = ({
  callState,
  callType,
  partnerInfo,
  localStream,
  remoteStream,
  duration,
  formatDuration,
  isMuted,
  isCameraOff,
  onMuteToggle,
  onCameraToggle,
  onHangup,
  localVideoRef,
  remoteVideoRef
}) => {
  const avatarText = partnerInfo?.username ? partnerInfo.username[0].toUpperCase() : 'U';
  const showVideoGrid = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white animate-fade-in">
      
      {/* Upper Status Bar */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900/60 backdrop-blur-md border border-zinc-800 text-zinc-300">
          {callType === 'video' ? 'Video call' : 'Voice call'}
        </span>
        {callState === 'connected' && (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-pink-500/25 border border-pink-500/40 text-pink-400">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Main Calling Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        
        {/* Case A: Video Call Grid */}
        {showVideoGrid ? (
          <div className="w-full h-full relative">
            {/* Remote Full Screen Video */}
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center px-4">
                  {partnerInfo?.profilePic ? (
                    <img
                      src={partnerInfo.profilePic}
                      alt={partnerInfo.username}
                      className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800 shadow-2xl animate-pulse-soft"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-brand flex items-center justify-center text-white text-3xl font-bold border-4 border-zinc-800 shadow-2xl animate-pulse-soft">
                      {avatarText}
                    </div>
                  )}
                  <p className="text-zinc-400 font-medium">
                    {callState === 'dialing' ? 'Calling...' : callState === 'connecting' ? 'Connecting...' : 'Waiting for video stream...'}
                  </p>
                </div>
              )}
            </div>

            {/* Local Draggable/PiP Preview (Bottom Right Overlay) */}
            <div className="absolute bottom-28 right-4 w-28 h-40 md:w-36 md:h-52 bg-zinc-800 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl z-10 transition-all duration-300">
              {isCameraOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                  <VideoOff className="w-5 h-5 text-zinc-500 mb-1" />
                  <span className="text-[10px] text-zinc-500 font-medium">Camera off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        ) : (
          /* Case B: Voice Call Card (No Video Grid) */
          <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center px-6">
            <div className="relative flex items-center justify-center">
              {callState === 'dialing' && (
                <div className="absolute w-36 h-36 rounded-full border border-purple-500/20 animate-ping" />
              )}
              {callState === 'connected' && (
                <div className="absolute w-36 h-36 rounded-full bg-gradient-brand/5 animate-pulse-soft border border-purple-500/10" />
              )}
              {partnerInfo?.profilePic ? (
                <img
                  src={partnerInfo.profilePic}
                  alt={partnerInfo.username}
                  className="w-28 h-28 rounded-full object-cover border-4 border-zinc-800 shadow-2xl relative z-10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-brand flex items-center justify-center text-white text-4xl font-bold border-4 border-zinc-800 shadow-2xl relative z-10">
                  {avatarText}
                </div>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-2xl font-bold truncate tracking-wide">{partnerInfo?.username || 'Unknown'}</h3>
              <p className="text-sm mt-2 text-zinc-400 font-medium capitalize animate-pulse-soft">
                {callState === 'dialing' ? 'dialing...' : callState === 'connecting' ? 'connecting...' : 'connected'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Control Bar Overlay at the Bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 px-6 py-4 rounded-3xl flex items-center justify-around shadow-2xl">
          {/* Mute Mic Button */}
          <button
            onClick={onMuteToggle}
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30'
                : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Hangup (Red Circle) */}
          <button
            onClick={onHangup}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>

          {/* Toggle Camera Button (Only active for video calls) */}
          {showVideoGrid ? (
            <button
              onClick={onCameraToggle}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                isCameraOff
                  ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30'
                  : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
              }`}
              title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          ) : (
            // Disabled or empty state spacer to keep the layout centered and symmetrical
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-zinc-600 bg-zinc-850 cursor-not-allowed">
              <VideoOff className="w-5 h-5 opacity-40" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

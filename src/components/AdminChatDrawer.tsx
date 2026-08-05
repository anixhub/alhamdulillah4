import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Trash2, 
  Search, 
  Check, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  AtSign,
  Pencil,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileCode,
  File,
  GripHorizontal,
  ChevronDown,
  Reply,
  Eye,
  Star,
  Pin,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { 
  fetchTableData, 
  insertTableRow, 
  updateTableRow,
  deleteTableRow, 
  subscribeRealtimeChanges, 
  sendRealtimeWSMessage, 
  safeLocalStorageSetItem,
  uploadFileToStorage
} from '../lib/api';

export interface ChatAttachment {
  name: string;
  url: string;
  type: 'file' | 'image';
  fileType?: string; // pdf, word, excel, image, generic
  size?: number; // size in bytes
  isCompressed?: boolean;
}

export interface ChatReplyTo {
  id: string;
  sender_name: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender_username?: string;
  sender_name?: string;
  sender_role?: string;
  sender?: string;
  senderRole?: string;
  sender_avatar?: string;
  senderAvatar?: string;
  recipient_role?: string;
  channel?: string;
  message?: string;
  text?: string;
  attachment?: ChatAttachment;
  reply_to?: ChatReplyTo;
  replyTo?: any;
  is_edited?: boolean;
  edited_at?: string;
  created_at: string;
  timestamp?: string;
}

interface AdminChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onClearUnread: () => void;
}

const LOCAL_STORAGE_KEY = 'smartsantri_admin_chat_messages';

// Mention suggestions for @
const ADMIN_MENTIONS = [
  // Role / Rule Channels (Cleaned - no dummy names or sub-descriptions)
  { type: 'role', id: 'superadmin', display: '@superadmin', role: 'Superadmin' },
  { type: 'role', id: 'sekretarisputra', display: '@sekretarisputra', role: 'Sekretaris Putra' },
  { type: 'role', id: 'sekretarisputri', display: '@sekretarisputri', role: 'Sekretaris Putri' },
  { type: 'role', id: 'bendaharaputra', display: '@bendaharaputra', role: 'Bendahara Putra' },
  { type: 'role', id: 'bendaharaputri', display: '@bendaharaputri', role: 'Bendahara Putri' },
  { type: 'role', id: 'keamananputra', display: '@keamananputra', role: 'Keamanan Putra' },
  { type: 'role', id: 'keamananputri', display: '@keamananputri', role: 'Keamanan Putri' },
  { type: 'role', id: 'humasputra', display: '@humasputra', role: 'Humas Putra' },
  { type: 'role', id: 'humasputri', display: '@humasputri', role: 'Humas Putri' },
  { type: 'role', id: 'pendidikan', display: '@pendidikan', role: 'Pendidikan' },
  { type: 'role', id: 'pengurus', display: '@pengurus', role: 'Pengurus' }
];

export default function AdminChatDrawer({
  isOpen,
  onClose,
  unreadCount,
  onClearUnread
}: AdminChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'media'>('chat');
  const [layoutMode, setLayoutMode] = useState<'sidebar' | 'floating' | 'full'>('floating');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showHideTooltip, setShowHideTooltip] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Attachment Menu & Pending Attachment State
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Edit & Reply State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<ChatMessage | null>(null);
  const [activeMsgMenuId, setActiveMsgMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; name: string } | null>(null);
  const msgMenuRef = useRef<HTMLDivElement>(null);

  // Media Selection, Star & Action Panel State
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [starredMediaIds, setStarredMediaIds] = useState<string[]>([]);
  const [filterOnlyStarred, setFilterOnlyStarred] = useState<boolean>(false);
  const [showDeleteMediaModal, setShowDeleteMediaModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pinned Messages State
  const [pinnedMsgIds, setPinnedMsgIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smartsantri_admin_chat_pinned');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    safeLocalStorageSetItem('smartsantri_admin_chat_pinned', JSON.stringify(pinnedMsgIds));
  }, [pinnedMsgIds]);

  const handleTogglePinMessage = (msgId: string) => {
    setPinnedMsgIds((prev) => {
      const isPinned = prev.includes(msgId);
      if (isPinned) {
        showToast('Sematkan pesan dilepas');
        return prev.filter((id) => id !== msgId);
      } else {
        if (prev.length >= 3) {
          showToast('Maksimal 3 pesan disematkan. Lepas sematan lain terlebih dahulu.');
          return prev;
        }
        showToast('Pesan berhasil disematkan 📌');
        return [...prev, msgId];
      }
    });
    setActiveMsgMenuId(null);
  };

  // Unselect media and cancel selection mode when switching to Chat tab or closing modal
  useEffect(() => {
    if (activeTab === 'chat' || !isOpen) {
      setSelectedMediaId(null);
      setSelectedMediaIds([]);
    }
  }, [activeTab, isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handlePreviewMedia = (m: ChatMessage) => {
    const att = m.attachment;
    if (!att) return;
    const fileName = att.name || 'File';
    const isImage = att.type === 'image' || att.fileType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
    if (isImage) {
      setPreviewImageModal({ url: att.url, name: fileName });
    } else {
      showToast('Tidak bisa preview file ini, hanya preview gambar yang didukung');
    }
  };

  const handleShowInChat = (msgId: string) => {
    setActiveTab('chat');
    setTimeout(() => {
      scrollToMsg(msgId);
    }, 120);
  };

  const handleDownloadImage = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'foto_chat.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Floating Width, Position & Drag State (Supports Left & Right Resizers + Header Window Drag)
  const [floatingWidth, setFloatingWidth] = useState<number>(460);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [positionX, setPositionX] = useState<number>(0);
  const [isDraggingWindow, setIsDraggingWindow] = useState<boolean>(false);

  const isResizingRef = useRef<boolean>(false);
  const isDraggingWindowRef = useRef<boolean>(false);
  const floatingWidthRef = useRef<number>(460);
  const positionXRef = useRef<number>(0);

  useEffect(() => {
    floatingWidthRef.current = floatingWidth;
  }, [floatingWidth]);

  useEffect(() => {
    positionXRef.current = positionX;
  }, [positionX]);

  const dragStateRef = useRef<{
    type: 'resize_left' | 'resize_right' | 'window';
    startX: number;
    startWidth: number;
    startPosX: number;
  }>({ type: 'window', startX: 0, startWidth: 460, startPosX: 0 });

  // Fast Exit Animation State
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  // @ Mention Suggestion State
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [userMentionsList, setUserMentionsList] = useState<any[]>(ADMIN_MENTIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const rawFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Active User Info
  const currentUsername = localStorage.getItem('smartsantri_active_username') || '';
  const currentDisplayName = localStorage.getItem('smartsantri_active_display_name') || 'Admin';
  const currentRole = localStorage.getItem('smartsantri_active_role') || 'admin';

  // Helper to normalize message structure from DB / WebSocket / LocalStorage
  const normalizeChatMessage = (msg: any): ChatMessage => {
    if (!msg) return msg;

    let attachment = msg.attachment;
    if (typeof attachment === 'string') {
      try {
        attachment = JSON.parse(attachment);
      } catch (e) {
        attachment = undefined;
      }
    }

    let reply_to = msg.reply_to || msg.replyTo;
    if (typeof reply_to === 'string') {
      try {
        reply_to = JSON.parse(reply_to);
      } catch (e) {
        reply_to = undefined;
      }
    }

    const senderUsername = msg.sender_username || msg.sender || '';
    const senderName = msg.sender_name || (msg.sender && !msg.sender.includes('@') ? msg.sender : '') || msg.sender || 'Admin';
    const senderRole = msg.sender_role || msg.senderRole || 'Admin';
    const messageText = msg.message || msg.text || '';
    const createdAt = msg.created_at || msg.timestamp || new Date().toISOString();
    const avatar = msg.sender_avatar || msg.senderAvatar || undefined;

    return {
      ...msg,
      id: String(msg.id || Date.now()),
      sender_username: senderUsername,
      sender_name: senderName,
      sender_role: senderRole,
      sender_avatar: avatar,
      recipient_role: msg.recipient_role || msg.channel || 'semua',
      message: messageText,
      created_at: createdAt,
      attachment,
      reply_to
    };
  };

  useEffect(() => {
    loadChatMessages();
    loadUserMentions();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUserMentions();
      onClearUnread();
      setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  // Dynamic user accounts loader for @ mention suggestions
  const loadUserMentions = async () => {
    try {
      const local = localStorage.getItem('smartsantri_app_credentials');
      let creds: any[] = local ? JSON.parse(local) : [];

      const remoteData = await fetchTableData<any>('app_credentials', 'smartsantri_app_credentials', creds);
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        creds = remoteData;
      }

      // Default registered accounts (including screenshot accounts)
      const defaultAccounts = [
        { username: 'david@attaroqqy.com', name: 'David', role: 'Sekretaris Putra' },
        { username: 'aniq@attaroqqy.com', name: 'Aniq', role: 'Humas/Humasy Putra' },
        { username: 'daud@attaroqqy', name: 'Daud', role: 'Sekretaris Putra' },
        { username: 'mbahnapex@attaroqqy.com', name: 'Mbah Napex', role: 'Humas/Humasy Putra' },
        { username: 'qowam@attaroqqy.com', name: 'Qowam', role: 'Pengurus' },
        { username: 'aniq2@attaroqqy.com', name: 'Aniq 2', role: 'Humas' },
        { username: 'najih@attaroqqy.com', name: 'Najih', role: 'Pengurus' },
        { username: 'sekretaris@attaroqqy.com', name: 'Sekretaris Attaroqqy', role: 'Sekretaris' },
        { username: 'bendahara@attaroqqy.com', name: 'Bendahara Attaroqqy', role: 'Bendahara' },
        { username: 'admin@attaroqqy.com', name: 'Superadmin Attaroqqy', role: 'Superadmin' }
      ];

      const mentionMap = new Map<string, any>();

      // 1. Standard Role Channels
      ADMIN_MENTIONS.forEach(m => mentionMap.set(m.id, m));

      // Helper to insert account mentions
      const addAccountMention = (username: string, name?: string, role?: string) => {
        if (!username) return;
        const uname = username.trim().toLowerCase();
        const prefix = uname.split('@')[0];
        const roleStr = role || 'Pengurus';
        const nameStr = name || prefix;

        // Full Email Mention e.g. @david@attaroqqy.com
        mentionMap.set(`full_${uname}`, {
          type: 'user',
          id: uname,
          display: `@${uname}`,
          name: nameStr,
          email: uname,
          role: roleStr
        });

        // Short Mention e.g. @david, @aniq, @daud, @mbahnapex
        if (prefix && prefix !== uname) {
          mentionMap.set(`short_${prefix}`, {
            type: 'user',
            id: prefix,
            display: `@${prefix}`,
            name: `${nameStr} (@${prefix})`,
            email: uname,
            role: roleStr
          });
        }
      };

      // 2. Add default accounts
      defaultAccounts.forEach(acc => addAccountMention(acc.username, acc.name, acc.role));

      // 3. Add dynamic accounts from app_credentials
      if (Array.isArray(creds)) {
        creds.forEach(c => {
          if (c.username) {
            addAccountMention(c.username, c.nama || c.name || c.displayName, c.jenis_akun || c.role);
          }
        });
      }

      setUserMentionsList(Array.from(mentionMap.values()));
    } catch (err) {
      console.warn("Gagal memuat akun pengguna untuk mention:", err);
    }
  };

  // Click outside listener for dropdown menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) {
        setActiveMsgMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Floating Mode Resizers (Left & Right Handles) & Window Drag Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current && !isDraggingWindowRef.current) return;

      // If mouse button is released anywhere, release resize/drag immediately
      if (e.buttons === 0) {
        handleMouseUp();
        return;
      }

      const { type, startX, startWidth, startPosX } = dragStateRef.current;
      const screenMargin = window.innerWidth >= 640 ? 16 : 8;

      if (isResizingRef.current) {
        if (type === 'resize_left') {
          // Dragging left handle: moving cursor left increases width
          const deltaX = startX - e.clientX;
          const newWidth = startWidth + deltaX;

          // Prevent left edge from going past left screen boundary (x = screenMargin)
          const maxAllowedWidth = Math.max(340, window.innerWidth - (2 * screenMargin) + startPosX);
          const clampedWidth = Math.max(340, Math.min(newWidth, maxAllowedWidth));
          setFloatingWidth(clampedWidth);
        } else if (type === 'resize_right') {
          // Dragging right handle: moving cursor right increases width
          const deltaX = e.clientX - startX;
          const newWidth = startWidth + deltaX;

          const maxAllowedWidth = Math.max(340, startWidth - startPosX);
          const clampedWidth = Math.max(340, Math.min(newWidth, maxAllowedWidth));
          const widthDiff = clampedWidth - startWidth;
          
          setFloatingWidth(clampedWidth);
          const newPosX = Math.min(0, startPosX + widthDiff);
          setPositionX(newPosX);
        }
      } else if (isDraggingWindowRef.current) {
        const deltaX = e.clientX - startX;
        const newX = startPosX + deltaX;

        // Base right gap is screenMargin (when positionX = 0).
        // Current left gap is (window.innerWidth - screenMargin - startWidth + positionX).
        // For left gap to equal screenMargin: minLeft = -(window.innerWidth - startWidth - 2 * screenMargin).
        const maxLeftShift = -(window.innerWidth - startWidth - (2 * screenMargin));
        const safeMinLeft = Math.min(0, maxLeftShift);
        const maxRight = 0;
        
        const clampedX = Math.max(safeMinLeft, Math.min(newX, maxRight));
        setPositionX(clampedX);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current || isDraggingWindowRef.current) {
        isResizingRef.current = false;
        isDraggingWindowRef.current = false;
        setIsResizing(false);
        setIsDraggingWindow(false);
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointerup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointerup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
    };
  }, []);

  // WebSocket Sync & Background Real-Time Polling
  useEffect(() => {
    const unsubscribe = subscribeRealtimeChanges((payload: any) => {
      if (payload.type === 'admin_chat_message' && payload.message) {
        const normalized = normalizeChatMessage(payload.message);
        setMessages(prev => {
          const exists = prev.some(m => String(m.id) === String(normalized.id));
          if (exists) {
            return prev.map(m => String(m.id) === String(normalized.id) ? { ...m, ...normalized } : m);
          }
          const updated = [...prev, normalized];
          safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        setTimeout(scrollToBottom, 50);
      } else if (payload.type === 'admin_chat_update' && payload.message) {
        const normalized = normalizeChatMessage(payload.message);
        setMessages(prev => {
          const updated = prev.map(m => String(m.id) === String(normalized.id) ? { ...m, ...normalized } : m);
          safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } else if (payload.type === 'admin_chat_delete' && payload.id) {
        setMessages(prev => {
          const updated = prev.filter(m => String(m.id) !== String(payload.id));
          safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } else if (payload.event === 'db_change' && payload.table === 'admin_chat') {
        if (payload.data) {
          const items = Array.isArray(payload.data) ? payload.data : [payload.data];
          const normalizedItems = items.map(normalizeChatMessage);
          setMessages(prev => {
            let updated = [...prev];
            normalizedItems.forEach(item => {
              if (payload.action === 'delete') {
                updated = updated.filter(m => String(m.id) !== String(item.id));
              } else {
                const idx = updated.findIndex(m => String(m.id) === String(item.id));
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...item };
                } else {
                  updated.push(item);
                }
              }
            });
            safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
          if (payload.action === 'insert') {
            setTimeout(scrollToBottom, 50);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Lock background page body scroll when chat drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const loadChatMessages = async () => {
    setLoading(true);
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      let rawList: any[] = local ? JSON.parse(local) : [];

      const remoteData = await fetchTableData<any>('admin_chat', LOCAL_STORAGE_KEY, rawList);
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        rawList = remoteData;
      }

      const normalizedList = rawList.map(normalizeChatMessage);
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedList));
      setMessages(normalizedList);
    } catch (err) {
      console.warn('Menggunakan data obrolan lokal:', err);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 150);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper for file type classification
  const getFileTypeCategory = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
    return 'generic';
  };

  // Raw File Upload handler (Option 1: Pdf, Word, Excel, Gambar tanpa kompress)
  const handleRawFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileCategory = getFileTypeCategory(file.name, file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        name: file.name,
        url: reader.result as string,
        type: fileCategory === 'image' ? 'image' : 'file',
        fileType: fileCategory,
        size: file.size,
        isCompressed: false
      });
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Image Upload handler with Auto Compress under 1MB if > 1MB (Option 2)
  const handleCompressedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setShowAttachMenu(false);

    try {
      if (file.size <= 1024 * 1024) {
        // Under 1MB: read directly
        const reader = new FileReader();
        reader.onload = () => {
          setPendingAttachment({
            name: file.name,
            url: reader.result as string,
            type: 'image',
            fileType: 'image',
            size: file.size,
            isCompressed: false
          });
          setIsCompressing(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Over 1MB: Auto compress using Canvas
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale max resolution to 1600px
          const MAX_DIM = 1600;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress JPEG quality iteratively to keep base64 size < 1MB (~1,300,000 chars)
            let quality = 0.85;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            while (compressedDataUrl.length > 1300000 && quality > 0.3) {
              quality -= 0.15;
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

            setPendingAttachment({
              name: file.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg",
              url: compressedDataUrl,
              type: 'image',
              fileType: 'image',
              size: approxBytes,
              isCompressed: true
            });
          }
          setIsCompressing(false);
        };

        img.onerror = () => {
          setIsCompressing(false);
        };
      }
    } catch (err) {
      console.error("Gagal kompresi gambar:", err);
      setIsCompressing(false);
    }
    e.target.value = '';
  };

  // Textarea Change & @ Mention Handling
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorIndex = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorIndex);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query.toLowerCase());
        setShowMentionMenu(true);
        setMentionSelectedIndex(0);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  // Select Mention Item
  const handleSelectMention = (displayTag: string) => {
    if (!inputRef.current) return;
    const cursorIndex = inputRef.current.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorIndex);
    const textAfterCursor = inputText.slice(cursorIndex);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    const insertedText = `${displayTag} `;
    let newCursorPos = 0;

    if (lastAtPos !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtPos) + insertedText + textAfterCursor;
      setInputText(newText);
      newCursorPos = lastAtPos + insertedText.length;
    } else {
      setInputText(prev => prev + insertedText);
      newCursorPos = inputText.length + insertedText.length;
    }

    setShowMentionMenu(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  // Scroll active mention menu item into view when navigating with arrow keys
  useEffect(() => {
    if (showMentionMenu && mentionMenuRef.current) {
      const activeEl = mentionMenuRef.current.querySelector(
        `[data-mention-index="${mentionSelectedIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [mentionSelectedIndex, showMentionMenu]);

  const filteredMentions = userMentionsList.filter(m => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (
      (m.display && m.display.toLowerCase().includes(q)) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.id && m.id.toLowerCase().includes(q))
    );
  });

  // Send or Save Edited Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !pendingAttachment) return;

    // Process pendingAttachment upload to server storage if base64
    let finalAttachment = pendingAttachment;
    if (pendingAttachment && pendingAttachment.url && pendingAttachment.url.startsWith('data:')) {
      try {
        const serverUrl = await uploadFileToStorage(pendingAttachment.url, pendingAttachment.name, 'chat_media');
        finalAttachment = {
          ...pendingAttachment,
          url: serverUrl
        };
      } catch (err) {
        console.warn('Gagal mengunggah lampiran chat ke server storage:', err);
      }
    }

    // Handle Edit Existing Message
    if (editingMsgId) {
      const updatedList = messages.map(m => {
        if (String(m.id) === String(editingMsgId)) {
          return {
            ...m,
            message: trimmed || m.message,
            attachment: finalAttachment || m.attachment,
            is_edited: true,
            edited_at: new Date().toISOString()
          };
        }
        return m;
      });

      setMessages(updatedList);
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      const editedMsg = updatedList.find(m => String(m.id) === String(editingMsgId));
      if (editedMsg) {
        sendRealtimeWSMessage({
          type: 'admin_chat_update',
          message: editedMsg
        });
        try {
          await updateTableRow('admin_chat', LOCAL_STORAGE_KEY, editingMsgId, editedMsg);
        } catch (err) {
          console.warn("Gagal update pesan di database:", err);
        }
      }

      setEditingMsgId(null);
      setInputText('');
      setPendingAttachment(null);
      setShowMentionMenu(false);
      return;
    }

    // New Message Creation
    const nowIso = new Date().toISOString();
    const avatarUrl = localStorage.getItem('smartsantri_active_avatar') || undefined;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender_username: currentUsername,
      sender_name: currentDisplayName,
      sender_role: currentRole,
      sender_avatar: avatarUrl,
      sender: currentUsername,
      senderRole: currentRole,
      senderAvatar: avatarUrl,
      recipient_role: activeChannel,
      message: trimmed,
      text: trimmed,
      attachment: finalAttachment || undefined,
      reply_to: replyToMsg ? {
        id: replyToMsg.id,
        sender_name: (replyToMsg.sender_username && replyToMsg.sender_username.toLowerCase() === currentUsername.toLowerCase())
          ? 'Anda' 
          : (replyToMsg.sender_name || replyToMsg.sender || 'Admin'),
        message: replyToMsg.message || replyToMsg.text || (replyToMsg.attachment ? `[File: ${replyToMsg.attachment.name}]` : 'Lampiran')
      } : undefined,
      created_at: nowIso,
      timestamp: nowIso
    };

    setMessages(prev => {
      const updated = [...prev, newMsg];
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setInputText('');
    setPendingAttachment(null);
    setReplyToMsg(null);
    setShowMentionMenu(false);
    setTimeout(scrollToBottom, 50);

    sendRealtimeWSMessage({
      type: 'admin_chat_message',
      message: newMsg
    });

    try {
      await insertTableRow('admin_chat', LOCAL_STORAGE_KEY, newMsg);
    } catch (err) {
      console.warn('Gagal menyimpan pesan ke database remote:', err);
    }
  };

  // Start Reply Handler
  const handleStartReply = (msg: ChatMessage) => {
    setReplyToMsg(msg);
    setActiveMsgMenuId(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Scroll to original message
  const scrollToMsg = (targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-purple-400');
      }, 1500);
    }
  };

  // Start Editing Message
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setInputText(msg.message);
    setPendingAttachment(msg.attachment || null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setInputText('');
    setPendingAttachment(null);
  };

  const handleDeleteMessage = async (msgId: string) => {
    setPinnedMsgIds(prev => prev.filter(id => String(id) !== String(msgId)));
    setMessages(prev => {
      const updated = prev.filter(m => String(m.id) !== String(msgId));
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteTableRow('admin_chat', LOCAL_STORAGE_KEY, msgId);
      sendRealtimeWSMessage({
        type: 'admin_chat_delete',
        id: msgId
      });
    } catch (err) {
      console.warn('Gagal menghapus pesan:', err);
    }
  };

  const handleDeleteMultipleMessages = async (msgIds: string[]) => {
    if (!msgIds || msgIds.length === 0) return;
    const count = msgIds.length;
    setPinnedMsgIds(prev => prev.filter(id => !msgIds.includes(String(id))));
    setMessages(prev => {
      const updated = prev.filter(m => !msgIds.includes(String(m.id)));
      safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    for (const id of msgIds) {
      try {
        await deleteTableRow('admin_chat', LOCAL_STORAGE_KEY, id);
        sendRealtimeWSMessage({
          type: 'admin_chat_delete',
          id: id
        });
      } catch (err) {
        console.warn('Gagal menghapus pesan:', err);
      }
    }
    setSelectedMediaIds([]);
    setSelectedMediaId(null);
    setShowDeleteMediaModal(false);
    showToast(`${count} file media berhasil dihapus`);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      let str = String(isoString).trim();
      if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
      }
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        const timeMatch = str.match(/\b\d{2}:\d{2}\b/);
        if (timeMatch) return timeMatch[0];
        return '';
      }
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getDateLabel = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      let str = String(isoString).trim();
      if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
      }
      const msgDate = new Date(str);
      if (isNaN(msgDate.getTime())) return '';

      const today = new Date();
      const isSameYear = msgDate.getFullYear() === today.getFullYear();
      const isSameMonth = isSameYear && msgDate.getMonth() === today.getMonth();
      const isSameDay = isSameMonth && msgDate.getDate() === today.getDate();

      if (isSameDay) return 'Hari ini';

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isYesterday =
        msgDate.getFullYear() === yesterday.getFullYear() &&
        msgDate.getMonth() === yesterday.getMonth() &&
        msgDate.getDate() === yesterday.getDate();

      if (isYesterday) return 'Kemarin';

      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMsgDate = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
      const diffDays = Math.round((startOfToday.getTime() - startOfMsgDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays > 0 && diffDays < 7) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return days[msgDate.getDay()];
      }

      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const dayNum = msgDate.getDate();
      const monthName = months[msgDate.getMonth()];
      const yearNum = msgDate.getFullYear();

      if (isSameYear) {
        return `${dayNum} ${monthName}`;
      } else {
        return `${dayNum} ${monthName} ${yearNum}`;
      }
    } catch (e) {
      return '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Highlight @ Mentions inside message text
  const renderFormattedMessageText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[\w.-]+(?:@[\w.-]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="inline-block bg-purple-200/80 text-purple-900 font-extrabold px-1.5 py-0.5 rounded-md text-[0.95em] mx-0.5 shadow-2xs">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredMessages = messages.filter(m => {
    if (!m) return false;
    const targetChannel = m.recipient_role || 'semua';
    const activeChan = activeChannel || 'semua';
    const matchesChannel = activeChan === 'semua' || targetChannel === 'semua' || (targetChannel || '').toLowerCase() === (activeChan || '').toLowerCase();
    
    if (!matchesChannel) return false;

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const msgText = (m.message || '').toLowerCase();
      const senderName = (m.sender_name || m.sender || '').toLowerCase();
      return msgText.includes(q) || senderName.includes(q);
    }

    return true;
  });

  // Extract all media attachments for Media Tab (with optional Star filter)
  const mediaMessages = messages.filter(m => {
    if (!m.attachment || !m.attachment.url) return false;
    if (filterOnlyStarred) {
      return starredMediaIds.includes(m.id);
    }
    return true;
  });

  // Pinned messages list
  const pinnedMessages = messages.filter(m => pinnedMsgIds.includes(m.id));

  // Selected media message object for Action Panel
  const selectedMediaMsg = selectedMediaId ? messages.find(m => m.id === selectedMediaId) : null;

  if (!isOpen && !isClosing) return null;

  // Layout mode class selector
  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'full':
        return 'w-full h-screen rounded-none my-0 right-0 top-0';
      case 'sidebar':
        return 'w-full sm:w-[420px] md:w-[460px] h-screen rounded-none my-0 right-0 top-0 border-l';
      case 'floating':
      default:
        return 'h-[96vh] sm:h-[94vh] my-auto rounded-[28px] border shadow-2xl overflow-hidden';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end items-center overflow-hidden p-2 sm:p-4 pointer-events-none">
      {/* Hidden File Inputs */}
      <input 
        ref={rawFileInputRef} 
        type="file" 
        onChange={handleRawFileUpload} 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.png,.jpg,.jpeg,.webp" 
        className="hidden" 
      />
      <input 
        ref={imageFileInputRef} 
        type="file" 
        onChange={handleCompressedImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Main Chat Box Window with Fast Bottom-to-Top Entrance & Top-to-Bottom Exit Animation */}
      <div 
        style={{
          width: layoutMode === 'floating' ? `${floatingWidth}px` : undefined,
          minWidth: layoutMode === 'floating' ? '340px' : undefined,
          maxWidth: layoutMode === 'floating' ? '100vw' : undefined,
          transform: layoutMode === 'floating' ? `translateX(${positionX}px)` : undefined,
          overscrollBehavior: 'contain'
        }}
        className={`relative z-10 pointer-events-auto flex flex-col bg-white border-slate-200/90 shadow-2xl transition-all duration-150 ease-out overscroll-contain ${
          isClosing 
            ? 'animate-out fade-out slide-out-to-bottom-full duration-150 ease-in' 
            : 'animate-in fade-in slide-in-from-bottom-full duration-150 ease-out'
        } ${getLayoutClasses()}`}
      >
        {/* Drag Handle on Left Edge for Floating Width Resizing */}
        {layoutMode === 'floating' && (
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              document.body.style.userSelect = 'none';
              isResizingRef.current = true;
              setIsResizing(true);
              dragStateRef.current = {
                type: 'resize_left',
                startX: e.clientX,
                startWidth: floatingWidthRef.current,
                startPosX: positionXRef.current
              };
            }}
            className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-30 group hover:bg-purple-500/20 transition-colors flex items-center justify-center ${isResizing ? 'bg-purple-500/30' : ''}`}
            title="Tarik sisi kiri untuk merubah lebar obrolan (Hingga batas layar)"
          >
            <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-purple-600 transition-colors" />
          </div>
        )}

        {/* Drag Handle on Right Edge for Floating Width Resizing */}
        {layoutMode === 'floating' && (
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              document.body.style.userSelect = 'none';
              isResizingRef.current = true;
              setIsResizing(true);
              dragStateRef.current = {
                type: 'resize_right',
                startX: e.clientX,
                startWidth: floatingWidthRef.current,
                startPosX: positionXRef.current
              };
            }}
            className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-30 group hover:bg-purple-500/20 transition-colors flex items-center justify-center ${isResizing ? 'bg-purple-500/30' : ''}`}
            title="Tarik sisi kanan untuk merubah lebar obrolan (Hingga batas layar)"
          >
            <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-purple-600 transition-colors" />
          </div>
        )}

        {/* TOP HEADER BAR (Entire header area draggable in floating mode) */}
        <div 
          onMouseDown={(e) => {
            if (layoutMode === 'floating') {
              e.preventDefault();
              document.body.style.userSelect = 'none';
              isDraggingWindowRef.current = true;
              setIsDraggingWindow(true);
              dragStateRef.current = {
                type: 'window',
                startX: e.clientX,
                startWidth: floatingWidthRef.current,
                startPosX: positionXRef.current
              };
            }
          }}
          className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-5 ${
            layoutMode === 'floating' 
              ? 'cursor-grab active:cursor-grabbing select-none' 
              : ''
          }`}
          title={layoutMode === 'floating' ? 'Tahan dan geser area header untuk memindahkan kotak obrolan' : undefined}
        >
          {/* Left: Chat / Media Switcher Pill */}
          <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center bg-[#f2f3f5] p-1 rounded-full border border-slate-200/50">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                onMouseDown={(e) => e.stopPropagation()}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                  activeTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                Chat
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none ${
                    activeTab === 'media'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`}
                >
                  Media
                </button>
                {activeTab === 'media' && (
                  <button
                    type="button"
                    onClick={() => setFilterOnlyStarred(!filterOnlyStarred)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      filterOnlyStarred
                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 font-bold'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                    }`}
                    title={filterOnlyStarred ? 'Tampilkan semua media' : 'Filter media berbintang ⭐'}
                  >
                    <Star className={`h-3.5 w-3.5 ${filterOnlyStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>

            {/* Layout Mode Switcher [|] */}
            <div className="relative" ref={layoutMenuRef}>
              <button
                type="button"
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
                  showLayoutMenu ? 'bg-slate-100' : ''
                }`}
                title="Atur Tampilan Layout"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round">
                  <rect width="18" height="18" x="3" y="3" rx="3" />
                  <path d="M15 3v18" />
                </svg>
              </button>

              {/* Layout Dropdown Menu */}
              {showLayoutMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('sidebar');
                      setShowLayoutMenu(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      layoutMode === 'sidebar' ? 'bg-slate-100/80 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {layoutMode === 'sidebar' ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : <span className="w-4" />}
                    <span>Sidebar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('floating');
                      setShowLayoutMenu(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      layoutMode === 'floating' ? 'bg-slate-100/80 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {layoutMode === 'floating' ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : <span className="w-4" />}
                    <span>Floating</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('full');
                      setShowLayoutMenu(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      layoutMode === 'full' ? 'bg-slate-100/80 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {layoutMode === 'full' ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : <span className="w-4" />}
                    <span>Halaman penuh</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sembunyikan Button ->| */}
            <div className="relative group/tooltip">
              <button
                type="button"
                onClick={handleCloseWithAnimation}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Sembunyikan"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round">
                  <path d="M5 12h12" />
                  <path d="m13 18 5-6-5-6" />
                  <path d="M20 5v14" />
                </svg>
              </button>

              {/* Tooltip Popup strictly on hover */}
              <div className="hidden group-hover/tooltip:block absolute right-0 top-12 z-50 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-lg whitespace-nowrap pointer-events-none transition-opacity">
                Sembunyikan
              </div>
            </div>
          </div>
        </div>

        {/* PINNED MESSAGES BANNER BAR (SLOTS UP TO 3 PINNED MESSAGES) */}
        {activeTab === 'chat' && pinnedMessages.length > 0 && (
          <div className="bg-slate-50/95 border-b border-purple-100/90 px-3.5 py-2 shrink-0 flex items-center justify-between gap-2 shadow-2xs backdrop-blur-xs relative z-20">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 shrink-0 shadow-2xs">
                <Pin className="h-3.5 w-3.5 fill-purple-600 text-purple-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                    Pesan Disematkan ({pinnedMessages.length}/3)
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 overflow-x-auto no-scrollbar pb-0.5">
                  {pinnedMessages.map((pMsg) => {
                    const pSender = pMsg.sender_name || pMsg.sender || 'Admin';
                    const pText = pMsg.message || (pMsg.attachment ? `[File: ${pMsg.attachment.name}]` : 'Pesan');
                    return (
                      <div
                        key={pMsg.id}
                        onClick={() => handleShowInChat(pMsg.id)}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white hover:bg-purple-50/80 border border-purple-200/80 text-left transition-all cursor-pointer shrink-0 max-w-[200px] sm:max-w-[240px] shadow-2xs group"
                        title="Klik untuk menuju ke lokasi pesan ini"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-purple-900 group-hover:text-purple-700 truncate leading-tight">
                            {pSender}
                          </p>
                          <p className="text-[10.5px] text-slate-600 group-hover:text-slate-900 truncate leading-tight mt-0.5 font-medium">
                            {pText}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePinMessage(pMsg.id);
                          }}
                          className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors shrink-0"
                          title="Lepas sematan"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEDIA CONTENT BODY (COMPACT DESKTOP ICON VIEW) */}
        {activeTab === 'media' ? (
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto overscroll-contain bg-slate-50/60">
            {mediaMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Paperclip className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600 mb-1">Belum Ada Media</p>
                <p className="text-[11px] text-slate-400">Semua foto, dokumen PDF, Word, atau Excel yang dikirim akan tampil di sini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {mediaMessages.map((m) => {
                  const att = m.attachment!;
                  const fileName = att.name || 'File';
                  const lowerName = fileName.toLowerCase();
                  const isImage = att.type === 'image' || att.fileType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
                  const isExcel = att.fileType === 'excel' || /\.(xlsx|xls|csv)$/i.test(fileName);
                  const isWord = att.fileType === 'word' || /\.(docx|doc)$/i.test(fileName);
                  const isPdf = att.fileType === 'pdf' || /\.pdf$/i.test(fileName);
                  const isZip = /\.(zip|rar|tar|gz|7z)$/i.test(fileName) || lowerName.includes('pindahan');
                  const isSql = /\.(sql|db|sqlite)$/i.test(fileName);

                  const isHighlighted = selectedMediaId === m.id;
                  const isMultiSelected = selectedMediaIds.includes(m.id);
                  const isStarred = starredMediaIds.includes(m.id);

                  return (
                    <div 
                      key={m.id}
                      onClick={() => {
                        if (selectedMediaIds.length > 0) {
                          setSelectedMediaIds(prev => 
                            prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          );
                        } else {
                          setSelectedMediaId(prev => prev === m.id ? null : m.id);
                        }
                      }}
                      onDoubleClick={() => handlePreviewMedia(m)}
                      className={`relative group flex flex-col items-center text-center p-2.5 rounded-2xl transition-all cursor-pointer select-none border ${
                        isMultiSelected
                          ? 'bg-purple-100/90 border-purple-600 ring-2 ring-purple-600 shadow-md scale-[1.02]' 
                          : isHighlighted
                          ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-300 shadow-md scale-[1.02]' 
                          : 'bg-white/60 border-slate-200/80 hover:bg-white hover:shadow-md'
                      }`}
                      title={`${fileName} (${formatFileSize(att.size)}) - oleh ${m.sender_name}\nKlik 1x: Sorot | Klik 2x: Preview`}
                    >
                      {/* Badges on top of card */}
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                        {isStarred && (
                          <span className="p-0.5 rounded-full bg-amber-400 text-white shadow-xs" title="Ditandai">
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        {/* Centang hanya muncul jika dalam mode pilih (selectedMediaIds) */}
                        {isMultiSelected && (
                          <span className="p-0.5 rounded-full bg-purple-600 text-white shadow-xs animate-in zoom-in-50 duration-100">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      {/* File Card Icon Preview */}
                      <div className="relative w-16 h-20 mb-1.5 flex items-center justify-center rounded-xl overflow-hidden bg-white shadow-2xs border border-slate-200/90 group-hover:shadow-md group-hover:scale-105 transition-all">
                        {isImage ? (
                          <img src={att.url} alt={fileName} className="w-full h-full object-cover" />
                        ) : isZip ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-amber-50">
                            {/* Zip / Folder Icon */}
                            <div className="w-10 h-10 rounded-md bg-amber-400 border border-amber-500/50 shadow-2xs flex items-center justify-center text-white relative">
                              <div className="w-6 h-1 bg-amber-200 rounded-xs absolute top-1.5" />
                              <div className="w-4 h-0.5 bg-amber-600 rounded-xs absolute top-3" />
                              <div className="w-4 h-0.5 bg-amber-600 rounded-xs absolute top-4" />
                            </div>
                          </div>
                        ) : isExcel ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="absolute top-1 left-1 w-5 h-5 bg-emerald-600 rounded flex items-center justify-center text-white font-black text-[11px] shadow-2xs">
                                S
                              </div>
                              <div className="w-6 h-0.5 bg-emerald-200 rounded my-0.5 mt-5" />
                              <div className="w-6 h-0.5 bg-emerald-200 rounded" />
                              <div className="w-6 h-0.5 bg-emerald-200 rounded mt-0.5" />
                            </div>
                          </div>
                        ) : isWord ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="absolute top-1 left-1 w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white font-black text-[11px] shadow-2xs">
                                W
                              </div>
                              <div className="w-6 h-0.5 bg-blue-200 rounded my-0.5 mt-5" />
                              <div className="w-6 h-0.5 bg-blue-200 rounded" />
                              <div className="w-6 h-0.5 bg-blue-200 rounded mt-0.5" />
                            </div>
                          </div>
                        ) : isPdf ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="absolute top-1 left-1 w-5 h-5 bg-rose-600 rounded flex items-center justify-center text-white font-black text-[8px] shadow-2xs">
                                PDF
                              </div>
                              <div className="w-6 h-0.5 bg-rose-200 rounded my-0.5 mt-5" />
                              <div className="w-6 h-0.5 bg-rose-200 rounded" />
                            </div>
                          </div>
                        ) : isSql ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center relative">
                              <div className="w-6 h-0.5 bg-slate-300 rounded mb-1" />
                              <div className="w-6 h-0.5 bg-purple-400 rounded mb-1" />
                              <div className="w-4 h-0.5 bg-slate-300 rounded" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                            <div className="w-9 h-12 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col items-center justify-center">
                              <FileText className="h-6 w-6 text-slate-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Title */}
                      <p className={`text-[11px] leading-tight line-clamp-2 w-full break-words ${
                        (isHighlighted || isMultiSelected) ? 'text-purple-900 font-bold' : 'text-slate-700 font-medium group-hover:text-purple-700'
                      }`}>
                        {fileName}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* TAB 1: MAIN CHAT MESSAGES LIST */
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 scrollbar-thin">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs font-medium py-12">
                Memuat percakapan...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <p className="text-sm font-medium text-slate-600 mb-1">
                  Kirim <strong className="text-slate-900">pesan obrolan group admin</strong>
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Sebut admin spesifik dengan <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">@email</code> atau rule <code className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">@sekretaris</code>.
                </p>
              </div>
            ) : (
              (() => {
                // Group messages by date
                const groupedMessages: { dateKey: string; label: string; msgs: ChatMessage[] }[] = [];
                filteredMessages.forEach((msg) => {
                  const d = new Date(msg.created_at || Date.now());
                  const dateKey = isNaN(d.getTime())
                    ? 'unknown'
                    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const label = getDateLabel(msg.created_at);

                  const lastGroup = groupedMessages[groupedMessages.length - 1];
                  if (lastGroup && lastGroup.dateKey === dateKey) {
                    lastGroup.msgs.push(msg);
                  } else {
                    groupedMessages.push({ dateKey, label, msgs: [msg] });
                  }
                });

                return groupedMessages.map((group) => (
                  <div key={group.dateKey} className="relative space-y-4">
                    {/* Sticky Floating Date Badge (WhatsApp Style - rounded-full circle sempurna floating at top on scroll) */}
                    {group.label && (
                      <div className="sticky top-1 z-20 flex justify-center my-2 pointer-events-none">
                        <span className="px-3.5 py-1 rounded-full text-[10.5px] font-bold bg-white/95 text-slate-700 shadow-xs border border-slate-200/90 backdrop-blur-md select-none pointer-events-auto flex items-center gap-1">
                          {group.label}
                        </span>
                      </div>
                    )}

                    {group.msgs.map((msg) => {
                      const senderUsername = (msg.sender_username || (msg.sender && msg.sender.includes('@') ? msg.sender : '') || '').trim().toLowerCase();
                      const myUsername = (currentUsername || '').trim().toLowerCase();

                      const isMe = Boolean(senderUsername) && Boolean(myUsername)
                        ? (senderUsername === myUsername)
                        : (Boolean(msg.sender) && Boolean(myUsername) && msg.sender.trim().toLowerCase() === myUsername);

                      const displaySenderName = (msg.sender_name && msg.sender_name.trim() !== 'Admin' ? msg.sender_name : '') ||
                                                (senderUsername ? senderUsername : '') ||
                                                msg.sender ||
                                                'Admin';

                      return (
                        <div
                          key={msg.id}
                          id={`msg-${msg.id}`}
                          className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} rounded-2xl transition-all duration-300`}
                        >
                          {isMe ? (
                            /* USER SENT MESSAGE (RIGHT ALIGNED) */
                            <div className="relative max-w-[88%] sm:max-w-[82%] min-w-[150px]">
                              {/* Hover ChevronDown (v) Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMsgMenuId(activeMsgMenuId === msg.id ? null : msg.id);
                                }}
                                className={`absolute top-1.5 right-1.5 z-20 p-1 rounded-full transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                                  activeMsgMenuId === msg.id ? 'opacity-100 bg-black/10' : ''
                                } text-purple-800 hover:bg-purple-200/80`}
                                title="Opsi Pesan"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>

                              {/* Dropdown Options Popup Menu */}
                              {activeMsgMenuId === msg.id && (
                                <div 
                                  ref={msgMenuRef}
                                  className="absolute top-8 right-1 z-50 w-40 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-200 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleStartReply(msg)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Reply className="h-3.5 w-3.5 text-purple-600" />
                                    <span>Balas</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleTogglePinMessage(msg.id);
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Pin className={`h-3.5 w-3.5 ${pinnedMsgIds.includes(msg.id) ? 'fill-purple-600 text-purple-600' : 'text-purple-600'}`} />
                                    <span>{pinnedMsgIds.includes(msg.id) ? 'Lepas Sematan' : 'Sematkan'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyText(msg.message, msg.id);
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                                    <span>Salin</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleStartEdit(msg);
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteId(msg.id);
                                      setActiveMsgMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              )}

                              {/* User Sent Bubble */}
                              <div className="rounded-[20px] rounded-tr-xs p-3 pr-7 bg-[#f0ebff] text-[#4c1d95] text-xs sm:text-sm font-medium leading-relaxed shadow-2xs border border-purple-200/60">
                                {/* Replied Quote Box */}
                                {msg.reply_to && (
                                  <div 
                                    onClick={() => scrollToMsg(msg.reply_to!.id)}
                                    className="mb-2 rounded-xl bg-purple-200/60 border-l-[4px] border-purple-800 p-2 text-xs flex flex-col cursor-pointer hover:bg-purple-200/80 transition-colors"
                                  >
                                    <span className="font-bold text-purple-950 text-[11px] truncate">
                                      {msg.reply_to.sender_name}
                                    </span>
                                    <p className="text-purple-900/90 text-[11px] truncate font-normal mt-0.5">
                                      {msg.reply_to.message}
                                    </p>
                                  </div>
                                )}

                                {/* Message Text */}
                                {msg.message && (
                                  <p className="whitespace-pre-wrap">{renderFormattedMessageText(msg.message)}</p>
                                )}

                                {/* Attachment */}
                                {msg.attachment && (
                                  <div className="mt-2 rounded-xl overflow-hidden bg-white/80 p-2 border border-purple-200">
                                    {msg.attachment.type === 'image' ? (
                                      <div>
                                        <img 
                                          src={msg.attachment.url} 
                                          alt={msg.attachment.name} 
                                          onClick={() => setPreviewImageModal({ url: msg.attachment!.url, name: msg.attachment!.name })}
                                          className="max-h-56 w-full object-cover rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity shadow-xs" 
                                        />
                                        <div className="flex items-center justify-between text-[10px] text-purple-800 font-bold px-1">
                                          <span className="truncate">{msg.attachment.name}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <a 
                                        href={msg.attachment.url} 
                                        download={msg.attachment.name} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-2 p-1.5 hover:bg-purple-100 rounded-lg transition-colors text-purple-900"
                                      >
                                        <FileText className="h-5 w-5 text-purple-700 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                          <p className="text-[9px] text-purple-600 font-medium">{formatFileSize(msg.attachment.size)}</p>
                                        </div>
                                        <Download className="h-4 w-4 shrink-0 text-purple-700" />
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Bottom Right Time & Pin Indicator */}
                                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-purple-600/90 font-semibold select-none">
                                  {pinnedMsgIds.includes(msg.id) && (
                                    <span title="Pesan Disematkan">
                                      <Pin className="h-3 w-3 fill-purple-700 text-purple-700 shrink-0 mr-0.5" />
                                    </span>
                                  )}
                                  {msg.is_edited && <span className="italic font-bold text-purple-700 mr-0.5">(edited)</span>}
                                  <span>{formatTime(msg.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* RECEIVED MESSAGE (LEFT ALIGNED WITH AVATAR CIRCLE & NAME) */
                            <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                              {/* Avatar Circle */}
                              {msg.sender_avatar ? (
                                <img
                                  src={msg.sender_avatar}
                                  alt={displaySenderName || 'Avatar'}
                                  className="w-8 h-8 rounded-full object-cover border border-purple-200 shadow-2xs shrink-0 mt-0.5"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-white mt-0.5 select-none">
                                  {(displaySenderName || 'A').trim().charAt(0).toUpperCase()}
                                </div>
                              )}

                              {/* Content Container */}
                              <div className="flex flex-col min-w-0 flex-1">
                                {/* Sender Name & Role Label */}
                                <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[11px] font-bold text-slate-800">
                                  <span>{displaySenderName}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-extrabold uppercase">
                                    {msg.sender_role || msg.senderRole || 'Admin'}
                                  </span>
                                </div>

                                {/* Message Bubble Box */}
                                <div className="relative min-w-[150px]">
                                  {/* Hover ChevronDown (v) Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMsgMenuId(activeMsgMenuId === msg.id ? null : msg.id);
                                    }}
                                    className={`absolute top-1.5 right-1.5 z-20 p-1 rounded-full transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                                      activeMsgMenuId === msg.id ? 'opacity-100 bg-black/10' : ''
                                    } text-slate-500 hover:bg-slate-200/80`}
                                    title="Opsi Pesan"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>

                                  {/* Dropdown Options Popup Menu */}
                                  {activeMsgMenuId === msg.id && (
                                    <div 
                                      ref={msgMenuRef}
                                      className="absolute top-8 right-1 z-50 w-40 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-200 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleStartReply(msg)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                      >
                                        <Reply className="h-3.5 w-3.5 text-purple-600" />
                                        <span>Balas</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleTogglePinMessage(msg.id);
                                          setActiveMsgMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                      >
                                        <Pin className={`h-3.5 w-3.5 ${pinnedMsgIds.includes(msg.id) ? 'fill-purple-600 text-purple-600' : 'text-purple-600'}`} />
                                        <span>{pinnedMsgIds.includes(msg.id) ? 'Lepas Sematan' : 'Sematkan'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCopyText(msg.message, msg.id);
                                          setActiveMsgMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors cursor-pointer"
                                      >
                                        <Copy className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Salin</span>
                                      </button>
                                      {currentRole === 'superadmin' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmDeleteId(msg.id);
                                            setActiveMsgMenuId(null);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span>Hapus</span>
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Received Message Bubble */}
                                  <div className="rounded-[20px] rounded-tl-xs p-3 pr-7 bg-white text-slate-800 text-xs sm:text-sm font-normal leading-relaxed shadow-2xs border border-slate-200/90">
                                    {/* Replied Quote Box */}
                                    {msg.reply_to && (
                                      <div 
                                        onClick={() => scrollToMsg(msg.reply_to!.id)}
                                        className="mb-2 rounded-xl bg-slate-100 border-l-[4px] border-amber-700 p-2 text-xs flex flex-col cursor-pointer hover:bg-slate-200/60 transition-colors"
                                      >
                                        <span className="font-bold text-amber-800 text-[11px] truncate">
                                          {msg.reply_to.sender_name}
                                        </span>
                                        <p className="text-slate-600 text-[11px] truncate font-normal mt-0.5">
                                          {msg.reply_to.message}
                                        </p>
                                      </div>
                                    )}

                                    {/* Message Text */}
                                    {msg.message && (
                                      <p className="whitespace-pre-wrap">{renderFormattedMessageText(msg.message)}</p>
                                    )}

                                    {/* Attachment */}
                                    {msg.attachment && (
                                      <div className="mt-2 rounded-xl overflow-hidden bg-slate-50 p-2 border border-slate-200">
                                        {msg.attachment.type === 'image' ? (
                                          <div>
                                            <img 
                                              src={msg.attachment.url} 
                                              alt={msg.attachment.name} 
                                              onClick={() => setPreviewImageModal({ url: msg.attachment!.url, name: msg.attachment!.name })}
                                              className="max-h-56 w-full object-cover rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity shadow-xs" 
                                            />
                                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold px-1">
                                              <span className="truncate">{msg.attachment.name}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <a 
                                            href={msg.attachment.url} 
                                            download={msg.attachment.name} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-800"
                                          >
                                            <FileText className="h-5 w-5 text-purple-600 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                              <p className="text-[9px] text-slate-500 font-medium">{formatFileSize(msg.attachment.size)}</p>
                                            </div>
                                            <Download className="h-4 w-4 shrink-0 text-slate-500" />
                                          </a>
                                        )}
                                      </div>
                                    )}

                                    {/* WhatsApp Style Bottom Right Time & Pin Indicator */}
                                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-medium select-none">
                                      {pinnedMsgIds.includes(msg.id) && (
                                        <span title="Pesan Disematkan">
                                          <Pin className="h-3 w-3 fill-purple-600 text-purple-600 shrink-0 mr-0.5" />
                                        </span>
                                      )}
                                      {msg.is_edited && <span className="italic font-bold text-purple-600 mr-0.5">(edited)</span>}
                                      <span>{formatTime(msg.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ));
              })()
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* INPUT AREA CONTAINER WITH @ MENTION & ATTACHMENT DROPDOWNS (ONLY SHOWN IN CHAT TAB) */}
        {activeTab === 'chat' && (
          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 relative">
            
            {/* Reply Message Preview Banner */}
            {replyToMsg && (
              <div className="flex items-center justify-between p-2 mb-2 rounded-xl bg-purple-50 border-l-4 border-purple-600 text-xs shadow-2xs">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[11px]">
                    <Reply className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                    <span>Membalas {(replyToMsg.sender_username && replyToMsg.sender_username.toLowerCase() === currentUsername.toLowerCase()) ? 'Anda' : (replyToMsg.sender_name || 'Admin')}</span>
                  </div>
                  <p className="text-slate-600 truncate text-[11px] mt-0.5 font-normal">
                    {replyToMsg.message || (replyToMsg.attachment ? `[File: ${replyToMsg.attachment.name}]` : '')}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setReplyToMsg(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Batal Balas"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Edit Message Banner */}
            {editingMsgId && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                <span className="font-bold flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5 text-purple-700" />
                  <span>Mengedit Pesan...</span>
                </span>
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  className="text-purple-700 hover:text-purple-900 font-bold text-[11px] underline cursor-pointer"
                >
                  Batal Edit
                </button>
              </div>
            )}

            {/* Pending Attachment Preview Banner */}
            {pendingAttachment && (
              <div className="flex items-center justify-between p-2 mb-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {pendingAttachment.type === 'image' ? (
                    <img src={pendingAttachment.url} alt="" className="h-8 w-8 object-cover rounded-lg shrink-0" />
                  ) : (
                    <Paperclip className="h-5 w-5 text-purple-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{pendingAttachment.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatFileSize(pendingAttachment.size)}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setPendingAttachment(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* @ Mention Suggestion Popover Menu */}
            {showMentionMenu && (
              <div 
                ref={mentionMenuRef}
                className="absolute bottom-full left-4 right-4 mb-2 z-50 max-h-56 overflow-y-auto overscroll-contain rounded-2xl bg-white p-2 shadow-2xl border border-purple-100 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-purple-700 uppercase tracking-wider border-b border-slate-100 mb-1">
                  <AtSign className="h-3 w-3" />
                  <span>Sebut Admin atau Email</span>
                </div>
                {filteredMentions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">Admin/Email tidak ditemukan</p>
                ) : (
                  filteredMentions.map((item, idx) => {
                    const isSelected = idx === mentionSelectedIndex;
                    return (
                      <button
                        key={`${item.type}_${item.id}_${idx}`}
                        type="button"
                        data-mention-index={idx}
                        onClick={() => handleSelectMention(item.display)}
                        onMouseEnter={() => setMentionSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-purple-100 text-purple-950 font-semibold ring-1 ring-purple-300 shadow-xs' 
                            : 'hover:bg-purple-50/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type === 'role' ? '@' : (item.email ? item.email[0].toUpperCase() : 'U')}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${
                              isSelected ? 'text-purple-950' : 'text-slate-800 group-hover:text-purple-900'
                            }`}>
                              {item.display}
                            </p>
                            {item.type !== 'role' && item.name && (
                              <p className="text-[10px] text-slate-500 truncate">{item.name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ml-2 ${
                          isSelected ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.role}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <form 
              onSubmit={handleSendMessage}
              className="relative rounded-[24px] border-2 border-purple-500/80 focus-within:border-purple-600 bg-white p-3 shadow-xs transition-all"
            >
              {/* Textarea Input */}
              <textarea
                ref={inputRef}
                rows={2}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (showMentionMenu && filteredMentions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setMentionSelectedIndex((prev) => (prev + 1) % filteredMentions.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setMentionSelectedIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                      return;
                    }
                    if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
                      e.preventDefault();
                      const target = filteredMentions[mentionSelectedIndex] || filteredMentions[0];
                      if (target) {
                        handleSelectMention(target.display);
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowMentionMenu(false);
                      return;
                    }
                  }

                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Lanjutkan percakapan... (ketik @ untuk sebut email atau role admin)"
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none font-normal"
              />

              {/* Input Footer Row with + Attachment Menu and Kirim (Send) Button */}
              <div className="flex items-center justify-between pt-1 relative">
                {/* Left Plus Attachment Button & Popover */}
                <div className="relative" ref={attachMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={isCompressing}
                    className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                    title="Tambah Lampiran File atau Gambar"
                  >
                    <Plus className="h-5 w-5" />
                  </button>

                  {/* Attachment Options Popover */}
                  {showAttachMenu && (
                    <div className="absolute bottom-10 left-0 z-50 w-64 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      {/* Option 1: File */}
                      <button
                        type="button"
                        onClick={() => rawFileInputRef.current?.click()}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">File Dokumen</p>
                          <p className="text-[10px] text-slate-400">PDF, Word, Excel, Gambar</p>
                        </div>
                      </button>

                      {/* Option 2: Gambar */}
                      <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Gambar</p>
                          <p className="text-[10px] text-slate-400">Upload foto atau gambar</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Send Button */}
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-500 shadow-2xs">
                  <button
                    type="submit"
                    disabled={isCompressing}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-purple-600 hover:text-purple-800 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Kirim Pesan"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>

          </div>
        )}

        {/* MEDIA ACTION PANEL (Panel Aksi) - Appears at the bottom when in multi-select mode OR when a single item is highlighted */}
        {selectedMediaIds.length > 0 ? (
          /* Mode Pilih Banyak (Multi-Select Action Panel) */
          <div className="p-3 bg-white border-t border-purple-200/80 shadow-2xl animate-in slide-in-from-bottom duration-200 shrink-0 relative z-30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white font-bold">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {selectedMediaIds.length} File Dipilih
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMediaIds([])}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer font-semibold"
              >
                Batal Pilih
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Tombol Download Banyak */}
              <button
                type="button"
                onClick={() => {
                  const selectedMsgs = messages.filter(m => selectedMediaIds.includes(m.id) && m.attachment?.url);
                  selectedMsgs.forEach((msg, idx) => {
                    setTimeout(() => {
                      if (msg.attachment) {
                        handleDownloadImage(msg.attachment.url, msg.attachment.name);
                      }
                    }, idx * 250);
                  });
                  showToast(`Mengunduh ${selectedMsgs.length} file...`);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all cursor-pointer border border-blue-200 shadow-2xs"
              >
                <Download className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Download ({selectedMediaIds.length})</span>
              </button>

              {/* Tombol Hapus Banyak */}
              <button
                type="button"
                onClick={() => setShowDeleteMediaModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all cursor-pointer border border-rose-200 shadow-2xs"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Hapus ({selectedMediaIds.length})</span>
              </button>
            </div>
          </div>
        ) : selectedMediaId && selectedMediaMsg && selectedMediaMsg.attachment ? (
          /* Mode Sorot 1 File (Single Item Highlighted Panel) */
          <div className="p-3 bg-white border-t border-purple-200/80 shadow-2xl animate-in slide-in-from-bottom duration-200 shrink-0 relative z-30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[260px]">
                    {selectedMediaMsg.attachment.name || 'File Disorot'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(selectedMediaMsg.attachment.size)} • Oleh {selectedMediaMsg.sender_name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMediaId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Batal Sorot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 5 Action Buttons Row */}
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              {/* 1. Download */}
              <button
                type="button"
                onClick={() => {
                  if (selectedMediaMsg.attachment) {
                    handleDownloadImage(selectedMediaMsg.attachment.url, selectedMediaMsg.attachment.name);
                    showToast(`Mengunduh ${selectedMediaMsg.attachment.name}...`);
                  }
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-all cursor-pointer group border border-slate-100 hover:border-blue-200"
                title="Download File"
              >
                <Download className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-blue-600" />
                <span className="text-[10px] font-bold">Download</span>
              </button>

              {/* 2. Tandai */}
              <button
                type="button"
                onClick={() => {
                  const isStarred = starredMediaIds.includes(selectedMediaMsg.id);
                  if (isStarred) {
                    setStarredMediaIds(prev => prev.filter(id => id !== selectedMediaMsg.id));
                    showToast("Tanda file dihapus");
                  } else {
                    setStarredMediaIds(prev => [...prev, selectedMediaMsg.id]);
                    showToast("File berhasil ditandai ⭐");
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer group border ${
                  starredMediaIds.includes(selectedMediaMsg.id)
                    ? 'bg-amber-100/90 text-amber-900 font-bold border-amber-300'
                    : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-100'
                }`}
                title="Tandai / Favoritkan"
              >
                <Star className={`h-4 w-4 mb-1 group-hover:scale-110 transition-transform ${starredMediaIds.includes(selectedMediaMsg.id) ? 'fill-amber-500 text-amber-500' : 'text-amber-600'}`} />
                <span className="text-[10px] font-bold">
                  {starredMediaIds.includes(selectedMediaMsg.id) ? 'Ditandai' : 'Tandai'}
                </span>
              </button>

              {/* 3. Pilih Ini (Masuk Mode Multi-Select) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaIds([selectedMediaMsg.id]);
                  setSelectedMediaId(null);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition-all cursor-pointer group border border-slate-100 hover:border-purple-200"
                title="Pilih File Ini untuk Mode Multi-Select"
              >
                <Check className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-purple-600" />
                <span className="text-[10px] font-bold">Pilih Ini</span>
              </button>

              {/* 4. Tampilkan di chat */}
              <button
                type="button"
                onClick={() => {
                  handleShowInChat(selectedMediaMsg.id);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-all cursor-pointer group border border-slate-100 hover:border-emerald-200"
                title="Buka lokasi pesan file ini di percakapan chat"
              >
                <MessageSquare className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-emerald-600" />
                <span className="text-[10px] font-bold text-center leading-none">Ke Chat</span>
              </button>

              {/* 5. Hapus (Paling Kanan) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMediaIds([selectedMediaMsg.id]);
                  setShowDeleteMediaModal(true);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-all cursor-pointer group border border-slate-100 hover:border-rose-200"
                title="Hapus File Ini"
              >
                <Trash2 className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform text-rose-600" />
                <span className="text-[10px] font-bold text-center leading-none">Hapus</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Toast Alert Notification Banner */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[250] max-w-[90%] px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-slate-300" />
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Message Deletion */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-white rounded-2xl p-5 max-w-xs sm:max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl shrink-0 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Hapus Pesan</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteId) {
                    handleDeleteMessage(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Media Deletion */}
      {showDeleteMediaModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-white rounded-2xl p-5 max-w-xs sm:max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl shrink-0 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Hapus {selectedMediaIds.length} Media Selected</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus {selectedMediaIds.length} media yang dipilih? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteMediaModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteMediaModal(false);
                  await handleDeleteMultipleMessages(selectedMediaIds);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Lightbox Preview Modal with Download Button */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200 pointer-events-auto"
          onClick={() => setPreviewImageModal(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Title, Download Button, and Close Button */}
            <div className="w-full flex items-center justify-between mb-3 text-white">
              <span className="text-xs font-semibold truncate max-w-xs sm:max-w-md bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                {previewImageModal.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadImage(previewImageModal.url, previewImageModal.name)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 max-h-[80vh] overflow-y-auto overscroll-contain flex items-center justify-center">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name}
                className="max-h-[80vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

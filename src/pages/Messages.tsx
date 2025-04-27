import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  Timestamp,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db, collections, logEvent } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeftIcon, SearchIcon, SendIcon, XIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
}

interface FirestoreUser {
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
}

interface FirestoreConversation {
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: { seconds: number; nanoseconds: number };
  unreadCount?: number;
  createdAt?: { seconds: number; nanoseconds: number };
}

interface FirestoreMessage {
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: { seconds: number; nanoseconds: number };
  read: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: { seconds: number; nanoseconds: number };
  unreadCount?: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: { seconds: number; nanoseconds: number };
  read: boolean;
}

export default function Messages() {
  const { isAuthenticated, isLoading, userData, currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messagesUnsubscribe, setMessagesUnsubscribe] = useState<(() => void) | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add these state variables for message search
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  useEffect(() => {
    if (userData && currentUser) {
      fetchUsers();
      fetchConversations();
      
      // Log index creation instructions to console for developer reference
      console.info(
        "If you see a Firestore index error, create the required composite index by visiting:\n" +
        "https://console.firebase.google.com/project/_/firestore/indexes\n" +
        "You need a composite index on the 'conversations' collection with:\n" +
        "1. participants (array-contains)\n" +
        "2. lastMessageTimestamp (descending)\n"
      );
    }
  }, [userData, currentUser]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (conversations.length > 0) {
      const total = conversations.reduce((count, conversation) => {
        return count + (conversation.unreadCount || 0);
      }, 0);
      setTotalUnreadCount(total);
      
      if (total > 0) {
        document.title = `(${total}) Messages - EduMeet`;
      } else {
        document.title = 'Messages - EduMeet';
      }
    }
    
    return () => {
      document.title = 'EduMeet';
    };
  }, [conversations]);
  
  const fetchUsers = async () => {
    if (!userData) return;
    
    try {
      let usersData: User[] = [];
      
      if (userData.role === 'student') {
        // Fetch teachers for student users
        const teachersRef = collection(db, collections.teachers);
        const teachersSnapshot = await getDocs(teachersRef);
        
        teachersSnapshot.forEach((doc) => {
          if (doc.id !== currentUser?.uid) {
            const teacherData = doc.data() as FirestoreUser;
            usersData.push({
              uid: doc.id,
              displayName: teacherData.displayName || '',
              email: teacherData.email || '',
              photoURL: teacherData.photoURL,
              role: 'teacher'
            });
          }
        });
      } else if (userData.role === 'teacher') {
        // Fetch students for teacher users
        const studentsRef = collection(db, collections.students);
        const q = query(studentsRef, where('status', '==', 'approved'));
        const studentsSnapshot = await getDocs(q);
        
        studentsSnapshot.forEach((doc) => {
          if (doc.id !== currentUser?.uid) {
            const studentData = doc.data() as FirestoreUser;
            usersData.push({
              uid: doc.id,
              displayName: studentData.displayName || '',
              email: studentData.email || '',
              photoURL: studentData.photoURL,
              role: 'student'
            });
          }
        });
      } else if (userData.role === 'admin') {
        // For admin, fetch both teachers and students
        const teachersRef = collection(db, collections.teachers);
        const teachersSnapshot = await getDocs(teachersRef);
        
        teachersSnapshot.forEach((doc) => {
        if (doc.id !== currentUser?.uid) {
            const teacherData = doc.data() as FirestoreUser;
          usersData.push({
            uid: doc.id,
              displayName: teacherData.displayName || '',
              email: teacherData.email || '',
              photoURL: teacherData.photoURL,
              role: 'teacher'
          });
        }
      });
        
        const studentsRef = collection(db, collections.students);
        const studentsSnapshot = await getDocs(studentsRef);
        
        studentsSnapshot.forEach((doc) => {
          if (doc.id !== currentUser?.uid) {
            const studentData = doc.data() as FirestoreUser;
            usersData.push({
              uid: doc.id,
              displayName: studentData.displayName || '',
              email: studentData.email || '',
              photoURL: studentData.photoURL,
              role: 'student'
            });
          }
        });
      }
      
      setUsers(usersData);
      logEvent('Users fetched', { count: usersData.length });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };
  
  const fetchConversations = async () => {
    if (!currentUser) return;
    
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastMessageTimestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const conversationsData: Conversation[] = [];
        let totalUnread = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirestoreConversation;
          
          const unreadCount = data.unreadCount || 0;
          
          conversationsData.push({
            id: doc.id,
            participants: data.participants,
            lastMessage: data.lastMessage,
            lastMessageTimestamp: data.lastMessageTimestamp,
            unreadCount: unreadCount
          });
          
          totalUnread += unreadCount;
        });
        
        setConversations(conversationsData);
        setTotalUnreadCount(totalUnread);
        logEvent('Conversations fetched', { count: conversationsData.length, unread: totalUnread });
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    }
  };
  
  const fetchMessages = async (conversationId: string) => {
    try {
    setIsLoadingMessages(true);
      setMessages([]);
      
      // Clean up previous listener if exists
      if (messagesUnsubscribe) {
        messagesUnsubscribe();
        setMessagesUnsubscribe(null);
      }
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );
      
      // Set up real-time listener for messages
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages: Message[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Make sure we have a valid message structure
          if (data.conversationId && data.senderId && data.content) {
            fetchedMessages.push({
            id: doc.id,
            conversationId: data.conversationId,
            senderId: data.senderId,
            content: data.content,
              timestamp: data.timestamp || Timestamp.now(),
              read: !!data.read
          });
          }
        });
        
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
        
        // Scroll to bottom when messages are loaded
        scrollToBottom();
      });
      
      // Store unsubscribe function
      setMessagesUnsubscribe(() => unsubscribe);
      
      // Mark messages as read in Firestore
      await markMessagesAsRead(conversationId);
        
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      setIsLoadingMessages(false);
    }
  };
  
  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      // Find unread messages in this conversation that were not sent by the current user
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        where('senderId', '!=', currentUser.uid),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Mark each message as read
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });
      
      if (querySnapshot.size > 0) {
        await batch.commit();
      }
      
      // Reset unread counter for current user's view of this conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { 
        unreadCount: 0,
        [`unreadCount_${currentUser.uid}`]: 0,
        lastRead: Timestamp.now() 
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  const selectConversation = async (conversation: Conversation) => {
    try {
    setSelectedConversation(conversation);
      setMessages([]);
      setIsLoadingMessages(true);
    
      // Get the other participant's ID
      const otherParticipantId = conversation.participants.find(
        (participantId) => participantId !== currentUser?.uid
      );

      if (!otherParticipantId) {
        console.error('Could not find other participant ID');
        setIsLoadingMessages(false);
        return;
      }

      // Try to find the user in teachers collection first
      let userRole = 'teacher';
      const teacherDoc = await getDoc(doc(db, 'teachers', otherParticipantId));
      
      if (teacherDoc.exists()) {
        // User is a teacher
        setSelectedUser({
          uid: otherParticipantId,
          ...teacherDoc.data() as FirestoreUser,
          role: 'teacher'
        });
      } else {
        // Try students collection
        userRole = 'student';
        const studentDoc = await getDoc(doc(db, 'students', otherParticipantId));
        
        if (studentDoc.exists()) {
          setSelectedUser({
            uid: otherParticipantId,
            ...studentDoc.data() as FirestoreUser,
            role: 'student'
          });
        } else {
          console.error(`User ${otherParticipantId} not found in teachers or students collections`);
        }
      }
      
      // Mark the conversation as read
      await updateDoc(doc(db, 'conversations', conversation.id), {
        unreadCount: 0,
        lastRead: Timestamp.now()
      });
      
      // Fetch messages for this conversation
      await fetchMessages(conversation.id);
      
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast.error('Failed to load conversation details');
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  const startNewConversation = async (user: User) => {
    if (!currentUser) return;
    
    const existingConversation = conversations.find(conv => 
      conv.participants.includes(user.uid) && conv.participants.includes(currentUser.uid)
    );
    
    if (existingConversation) {
      selectConversation(existingConversation);
      return;
    }
    
    try {
      const newConversation = {
        participants: [currentUser.uid, user.uid],
        createdAt: Timestamp.now(),
        lastMessageTimestamp: Timestamp.now(),
        unreadCount: 0
      };
      
      const conversationRef = await addDoc(collection(db, 'conversations'), newConversation);
      
      const conversation: Conversation = {
        id: conversationRef.id,
        ...newConversation
      };
      
      setSelectedConversation(conversation);
      setSelectedUser(user);
      setMessages([]);
      
      logEvent('Conversation created', { userId: user.uid });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !currentUser) {
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Create a properly formatted message object
      const messageData = {
        conversationId: selectedConversation.id,
        senderId: currentUser.uid,
        content: newMessage.trim(),
        timestamp: Timestamp.now(),
        read: false
      };
      
      // Add the message to Firestore
      await addDoc(collection(db, 'messages'), messageData);
      
      // Get other participant from conversation
      const otherParticipantId = selectedConversation.participants.find(
        id => id !== currentUser.uid
      );
      
      // Update the conversation with the last message
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: newMessage.trim(),
        lastMessageTimestamp: Timestamp.now(),
        lastMessageSenderId: currentUser.uid,
        // Only increment unread count for the other participant's view
        ...(otherParticipantId ? { [`unreadCount_${otherParticipantId}`]: increment(1) } : {}),
        unreadCount: increment(1)
      });
      
      // Clear the input
      setNewMessage('');
      
      // Scroll to bottom
      scrollToBottom();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  const formatMessageTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    try {
      // Make sure timestamp is valid
      if (!timestamp || typeof timestamp.seconds !== 'number') {
        return '';
      }
      
      const date = new Date(timestamp.seconds * 1000);
      
      // Verify the date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
    return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting message time:', error);
      return '';
    }
  };
  
  const formatConversationTime = (timestamp?: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return '';
    
    try {
      // Make sure timestamp is valid
      if (typeof timestamp.seconds !== 'number') {
        return '';
      }
      
      const date = new Date(timestamp.seconds * 1000);
      
      // Verify the date is valid before proceeding
      if (isNaN(date.getTime())) {
        return '';
      }
      
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MM/dd/yy');
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };
  
  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const filteredUsers = users.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Add this function to search through messages
  const searchMessages = () => {
    if (!messageSearchQuery.trim() || messages.length === 0) {
      setSearchResults([]);
      return;
    }
    
    setIsSearchingMessages(true);
    const query = messageSearchQuery.toLowerCase();
    const results = messages.filter(message => 
      message.content.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
    setActiveSearchIndex(results.length > 0 ? 0 : -1);
    setIsSearchingMessages(false);
    
    // Scroll to first result
    if (results.length > 0) {
      const msgElement = document.getElementById(`message-${results[0].id}`);
      if (msgElement) {
        msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgElement.classList.add('bg-yellow-100/30');
      }
    }
  };

  // Add this function to navigate between search results
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = activeSearchIndex;
    if (direction === 'next') {
      newIndex = (activeSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setActiveSearchIndex(newIndex);
    
    // Highlight and scroll to the active result
    const msgElement = document.getElementById(`message-${searchResults[newIndex].id}`);
    if (msgElement) {
      msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove highlight from all messages
      document.querySelectorAll('.message-highlight').forEach(el => {
        el.classList.remove('bg-yellow-100/30');
      });
      
      // Add highlight to current message
      msgElement.classList.add('bg-yellow-100/30');
    }
  };

  // Add this function to clear message search
  const clearMessageSearch = () => {
    setMessageSearchQuery('');
    setSearchResults([]);
    setActiveSearchIndex(-1);
    
    // Remove all highlights
    document.querySelectorAll('.message-highlight').forEach(el => {
      el.classList.remove('bg-yellow-100/30');
    });
  };

  // Add this effect to reset search when conversation changes
  useEffect(() => {
    clearMessageSearch();
  }, [selectedConversation]);
  
  // Add this function to delete a conversation
  const deleteConversation = async (conversationId: string) => {
    if (!currentUser) return;
    
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this entire conversation? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Delete the conversation document
      await deleteDoc(doc(db, 'conversations', conversationId));
      
      // Delete all messages in the conversation
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('conversationId', '==', conversationId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Update UI
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      toast.success('Conversation deleted successfully');
      
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }
  
  if (!userData) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-20 pb-6 flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 rounded-full"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">
              Chat with {userData.role === 'student' ? 'teachers' : 'students'}
            </p>
          </div>
        </div>
        
        <Card className="flex-1 overflow-hidden border shadow-sm">
          <div className="grid md:grid-cols-[320px_1fr] h-[calc(100vh-220px)]">
            <div className="border-r flex flex-col h-full">
              <div className="p-3 border-b">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-grow overflow-y-auto">
                <div className="h-full">
                  {conversations.length > 0 && (
                    <div className="divide-y">
                      {conversations.map((conversation) => {
                        const otherParticipantId = conversation.participants.find(id => id !== currentUser?.uid);
                        const otherUser = users.find(user => user.uid === otherParticipantId);
                        
                        return (
                          <div
                            key={conversation.id}
                            className={cn(
                              "flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group",
                              selectedConversation?.id === conversation.id && "bg-muted"
                            )}
                          >
                            <div 
                              className="flex-1 flex items-center gap-3 cursor-pointer"
                              onClick={() => selectConversation(conversation)}
                            >
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={otherUser?.photoURL || ""} />
                                <AvatarFallback>
                                  {getUserInitials(otherUser?.displayName || "User")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="font-medium truncate">{otherUser?.displayName || "User"}</div>
                                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {formatConversationTime(conversation.lastMessageTimestamp)}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {conversation.lastMessage || "No messages yet"}
                                </div>
                              </div>
                              {conversation.unreadCount ? (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground flex-shrink-0">
                                  {conversation.unreadCount}
                                </div>
                              ) : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conversation.id);
                              }}
                              title="Delete conversation"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="p-3">
                    <h3 className="text-sm font-medium mb-2">Start a conversation</h3>
                    {filteredUsers.length > 0 ? (
                      <div className="space-y-1">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.uid}
                            className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => startNewConversation(user)}
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={user.photoURL} />
                              <AvatarFallback>{getUserInitials(user.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{user.displayName}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.role}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {searchQuery 
                          ? "No users found matching your search" 
                          : "No users available to message"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                  {selectedUser && (
                    <>
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={selectedUser.photoURL} />
                        <AvatarFallback>{getUserInitials(selectedUser.displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{selectedUser.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedUser.role}
                        </div>
                      </div>
                    </>
                  )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                      onClick={() => selectedConversation && deleteConversation(selectedConversation.id)}
                      title="Delete Conversation"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                    
                    <div className="relative hidden sm:block">
                      <Input
                        placeholder="Search in conversation..."
                        className="w-[220px] h-8 pl-8 text-sm"
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchMessages();
                          }
                        }}
                      />
                      <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      {messageSearchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={clearMessageSearch}
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="flex items-center gap-1 hidden sm:flex">
                        <span className="text-xs text-muted-foreground">
                          {activeSearchIndex + 1}/{searchResults.length}
                        </span>
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigateSearchResults('prev')}
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigateSearchResults('next')}
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-pulse text-sm">Loading messages...</div>
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isCurrentUser = message.senderId === currentUser?.uid;
                        const isSearchResult = searchResults.some(result => result.id === message.id);
                        const isActiveResult = searchResults[activeSearchIndex]?.id === message.id;
                        
                        return (
                          <div
                            id={`message-${message.id}`}
                            key={message.id}
                            className={cn(
                              "flex message-highlight",
                              isCurrentUser ? "justify-end" : "justify-start",
                              isActiveResult && "bg-yellow-100/30"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-lg p-3",
                                isCurrentUser 
                                  ? "bg-primary text-primary-foreground rounded-br-none"
                                  : "bg-muted rounded-bl-none"
                              )}
                            >
                              <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                              <div
                                className={cn(
                                  "text-xs mt-1",
                                  isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                                )}
                              >
                                {formatMessageTime(message.timestamp)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation by sending a message</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t mt-auto">
                  <div className="flex gap-2">
                    <Textarea
                      className="min-h-[50px] max-h-[120px] resize-none"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                    />
                    <Button 
                      className="h-auto"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-6">
                <div>
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <SendIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Your Messages</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a conversation or start a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}


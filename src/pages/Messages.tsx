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
  arrayUnion
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
import { ArrowLeftIcon, SearchIcon, SendIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date | { seconds: number; nanoseconds: number };
  read: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: Date | { seconds: number; nanoseconds: number };
  unreadCount?: number;
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  useEffect(() => {
    if (userData && currentUser) {
      fetchUsers();
      fetchConversations();
    }
  }, [userData, currentUser]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchUsers = async () => {
    if (!userData) return;
    
    try {
      const usersRef = collection(db, collections.users);
      let q;
      
      if (userData.role === 'student') {
        q = query(usersRef, where('role', '==', 'teacher'));
      } else if (userData.role === 'teacher') {
        q = query(usersRef, where('role', '==', 'student'));
      } else {
        q = query(usersRef);
      }
      
      const querySnapshot = await getDocs(q);
      const usersData: User[] = [];
      
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUser?.uid) {
          usersData.push({
            uid: doc.id,
            ...doc.data(),
          } as User);
        }
      });
      
      setUsers(usersData);
      logEvent('Users fetched', { count: usersData.length });
    } catch (error) {
      console.error('Error fetching users:', error);
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
        
        querySnapshot.forEach((doc) => {
          conversationsData.push({
            id: doc.id,
            ...doc.data(),
          } as Conversation);
        });
        
        setConversations(conversationsData);
        logEvent('Conversations fetched', { count: conversationsData.length });
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };
  
  const fetchMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messagesData: Message[] = [];
        
        querySnapshot.forEach((doc) => {
          messagesData.push({
            id: doc.id,
            ...doc.data(),
          } as Message);
        });
        
        setMessages(messagesData);
        setIsLoadingMessages(false);
        
        markMessagesAsRead(conversationId);
        
        logEvent('Messages fetched', { count: messagesData.length, conversationId });
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsLoadingMessages(false);
    }
  };
  
  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        where('senderId', '!=', currentUser.uid),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, { read: true });
      });
      
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { unreadCount: 0 });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedUser(null);
    
    if (currentUser) {
      const otherParticipantId = conversation.participants.find(id => id !== currentUser.uid);
      if (otherParticipantId) {
        const userDoc = await getDoc(doc(db, collections.users, otherParticipantId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setSelectedUser({
            uid: otherParticipantId,
            ...userData
          });
        }
      }
    }
    
    fetchMessages(conversation.id);
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
  
  const sendMessage = async () => {
    if (!currentUser || !selectedConversation || !newMessage.trim()) return;
    
    try {
      const message = {
        conversationId: selectedConversation.id,
        senderId: currentUser.uid,
        content: newMessage.trim(),
        timestamp: Timestamp.now(),
        read: false
      };
      
      await addDoc(collection(db, 'messages'), message);
      
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      await updateDoc(conversationRef, {
        lastMessage: newMessage.trim(),
        lastMessageTimestamp: Timestamp.now(),
        unreadCount: arrayUnion(1)
      });
      
      setNewMessage('');
      logEvent('Message sent', { conversationId: selectedConversation.id });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const formatMessageTime = (timestamp: Date | { seconds: number; nanoseconds: number }) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
    return format(date, 'h:mm a');
  };
  
  const formatConversationTime = (timestamp?: Date | { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MM/dd/yy');
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
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col">
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
        
        <Card className="flex-1 overflow-hidden border">
          <div className="grid md:grid-cols-[300px_1fr] h-[calc(100vh-200px)]">
            <div className="border-r">
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
              
              <ScrollArea className="h-[calc(100vh-254px)]">
                {conversations.length > 0 && (
                  <div className="divide-y">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedConversation?.id === conversation.id && "bg-muted"
                        )}
                        onClick={() => selectConversation(conversation)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {getUserInitials("User")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="font-medium truncate">User</div>
                            <div className="text-xs text-muted-foreground">
                              {formatConversationTime(conversation.lastMessageTimestamp)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage || "No messages yet"}
                          </div>
                        </div>
                        {conversation.unreadCount ? (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">
                            {conversation.unreadCount}
                          </div>
                        ) : null}
                      </div>
                    ))}
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
                          <Avatar className="h-8 w-8">
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
              </ScrollArea>
            </div>
            
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b flex items-center gap-3">
                  {selectedUser && (
                    <>
                      <Avatar className="h-9 w-9">
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
                
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-pulse text-sm">Loading messages...</div>
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isCurrentUser = message.senderId === currentUser?.uid;
                        
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              isCurrentUser ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg p-3",
                                isCurrentUser 
                                  ? "bg-primary text-primary-foreground rounded-br-none"
                                  : "bg-muted rounded-bl-none"
                              )}
                            >
                              <div className="text-sm">{message.content}</div>
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
                </ScrollArea>
                
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
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
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


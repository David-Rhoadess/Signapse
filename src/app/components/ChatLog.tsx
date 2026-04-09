import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';

interface ChatSession {
  id: string;
  date: string;
  duration: string;
  messages: {
    sender: 'user' | 'bot';
    text: string;
    time: string;
  }[];
}

const mockChatSessions: ChatSession[] = [
  {
    id: '1',
    date: 'April 9, 2026',
    duration: '15 minutes',
    messages: [
      { sender: 'bot', text: "Hi! I'm Nutty's assistant. How can I help you today?", time: '2:30 PM' },
      { sender: 'user', text: 'Hello! Can you tell me about Signapse?', time: '2:31 PM' },
      { sender: 'bot', text: "Great question! As a squirrel mascot's assistant, I'm here to make your day better!", time: '2:31 PM' },
      { sender: 'user', text: 'That sounds wonderful!', time: '2:32 PM' },
      { sender: 'bot', text: 'I love chatting with you!', time: '2:32 PM' },
    ],
  },
  {
    id: '2',
    date: 'April 8, 2026',
    duration: '8 minutes',
    messages: [
      { sender: 'bot', text: "Hi! I'm Nutty's assistant. How can I help you today?", time: '10:15 AM' },
      { sender: 'user', text: 'Just saying hi!', time: '10:16 AM' },
      { sender: 'bot', text: 'Nutty says hello! 🐿️', time: '10:16 AM' },
    ],
  },
  {
    id: '3',
    date: 'April 7, 2026',
    duration: '22 minutes',
    messages: [
      { sender: 'bot', text: "Hi! I'm Nutty's assistant. How can I help you today?", time: '4:00 PM' },
      { sender: 'user', text: 'I need some help', time: '4:01 PM' },
      { sender: 'bot', text: "I'm here to help! What would you like to know?", time: '4:01 PM' },
      { sender: 'user', text: 'How does video calling work?', time: '4:02 PM' },
      { sender: 'bot', text: "That's interesting! Tell me more.", time: '4:02 PM' },
      { sender: 'user', text: 'Thanks for your help!', time: '4:05 PM' },
      { sender: 'bot', text: 'How can I assist you today?', time: '4:05 PM' },
    ],
  },
];

export function ChatLog() {
  return (
    <div className="size-full bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-1">Chat Log</h2>
          <p className="text-sm text-gray-600">View your previous conversations with Nutty's assistant</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pb-4">
            {mockChatSessions.map((session) => (
              <Card key={session.id} className="p-4">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{session.date}</h3>
                    <p className="text-xs text-gray-500">Duration: {session.duration}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.messages.length} messages
                  </div>
                </div>

                <div className="space-y-2">
                  {session.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-1.5 ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-xs">{message.text}</p>
                        <span className="text-xs opacity-70 mt-0.5 block">
                          {message.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

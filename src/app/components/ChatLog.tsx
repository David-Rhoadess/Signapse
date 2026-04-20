import { useState, useEffect } from "react";
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

interface ChatSession {
  id: string;
  date: string;
  duration: string;
  summary: {
    learned: string[];
    practice: string[];
  };
  messages: ChatMessage[];
}

const mockChatSessions: ChatSession[] = [
  {
    id: '1',
    date: 'April 9, 2026',
    duration: '15 minutes',
    summary: {
      learned: [
        'WH-questions place the question word at the end of the sentence',
        'How to introduce yourself with MY NAME and ask for someone else\'s name',
        'Topical sentence structure using ME LIVE followed by a location',
      ],
      practice: [
        'Placing question words at the end of WH-questions',
      ],
    },
    messages: [
      { sender: 'bot', text: "Hi there! I am Acorn. Ready to practice some ASL today? Let us start simple. Can you tell me your name?", time: '2:30 PM' },
      { sender: 'user', text: 'Signed: HELLO MY NAME WHAT', time: '2:31 PM' },
      { sender: 'bot', text: "Almost! It looks like the question word ended up in the wrong spot. In ASL, WH-questions put the question word at the very end. Try again: HELLO MY NAME [...] YOUR NAME WHAT.", time: '2:31 PM' },
      { sender: 'user', text: 'Signed: HELLO MY NAME S-A-R-A-H YOUR NAME WHAT', time: '2:32 PM' },
      { sender: 'bot', text: "Perfect! So nice to meet you, Sarah. Do you have any pets at home?", time: '2:32 PM' },
      { sender: 'user', text: 'Signed: ME HAVE DOG', time: '2:34 PM' },
      { sender: 'bot', text: "A dog, how fun! What color is your dog?", time: '2:34 PM' },
      { sender: 'user', text: 'Signed: DOG COLOR BROWN', time: '2:36 PM' },
      { sender: 'bot', text: "Brown, lovely! Does your dog have a name?", time: '2:37 PM' },
      { sender: 'user', text: 'Signed: DOG NAME COOKIE', time: '2:38 PM' },
      { sender: 'bot', text: "Cookie is such a sweet name! I love it. How old is Cookie?", time: '2:38 PM' },
    ],
  },
  {
    id: '2',
    date: 'April 8, 2026',
    duration: '8 minutes',
    summary: {
      learned: [
        'ME is used instead of I in ASL',
        'How to express preferences using ME FAVORITE and ME LIKE',
        'Describing things with adjectives after the noun, such as DARK BLUE',
      ],
      practice: [
        'Remembering to use ME instead of I at the start of a sentence',
      ],
    },
    messages: [
      { sender: 'bot', text: "Welcome back! Great to see you again. What is your favorite color?", time: '10:15 AM' },
      { sender: 'user', text: 'Signed: I FAVORITE COLOR BLUE', time: '10:16 AM' },
      { sender: 'bot', text: "Close! In ASL you would use ME instead of I. Give it another go!", time: '10:16 AM' },
      { sender: 'user', text: 'Signed: ME FAVORITE COLOR BLUE', time: '10:17 AM' },
      { sender: 'bot', text: "Nice! Blue is a great choice. Do you prefer light blue or dark blue?", time: '10:17 AM' },
      { sender: 'user', text: 'Signed: ME LIKE DARK BLUE', time: '10:19 AM' },
      { sender: 'bot', text: "Very cool! What is your favorite food?", time: '10:19 AM' },
      { sender: 'user', text: 'Signed: ME LOVE PIZZA', time: '10:21 AM' },
      { sender: 'bot', text: "Pizza is always a good answer! Do you like it with lots of toppings or just cheese?", time: '10:22 AM' },
    ],
  },
  {
    id: '3',
    date: 'April 7, 2026',
    duration: '22 minutes',
    summary: {
      learned: [
        'How to greet someone with HELLO',
        'Expressing feelings using ME FEEL followed by an emotion',
        'Describing daily routines like ME EAT and ME COOK',
        'Using SELF to mean doing something on your own',
      ],
      practice: [],
    },
    messages: [
      { sender: 'bot', text: "Hello! I am Acorn, your ASL practice partner. So glad you are here. Let us start easy. Can you say hello to me?", time: '4:00 PM' },
      { sender: 'user', text: 'Signed: HELLO', time: '4:01 PM' },
      { sender: 'bot', text: "Hello to you! What a great sign to start with. How are you feeling today?", time: '4:01 PM' },
      { sender: 'user', text: 'Signed: ME FEEL HAPPY', time: '4:02 PM' },
      { sender: 'bot', text: "That makes me happy too! What did you do today?", time: '4:03 PM' },
      { sender: 'user', text: 'Signed: ME EAT BREAKFAST', time: '4:04 PM' },
      { sender: 'bot', text: "Wonderful! What did you eat for breakfast?", time: '4:05 PM' },
      { sender: 'user', text: 'Signed: ME EAT EGG BREAD', time: '4:06 PM' },
      { sender: 'bot', text: "Eggs and bread, a great breakfast! Do you eat breakfast every day?", time: '4:07 PM' },
      { sender: 'user', text: 'Signed: YES ME EAT EVERY DAY', time: '4:09 PM' },
      { sender: 'bot', text: "That is a healthy habit! Do you cook it yourself?", time: '4:10 PM' },
      { sender: 'user', text: 'Signed: YES ME COOK SELF', time: '4:12 PM' },
      { sender: 'bot', text: "Look at you, cooking your own breakfast! What is your favorite thing to cook?", time: '4:13 PM' },
      { sender: 'user', text: 'Signed: ME LIKE COOK EGG', time: '4:15 PM' },
      { sender: 'bot', text: "Eggs are so versatile! Do you like them scrambled or fried?", time: '4:16 PM' },
    ],
  },
];

function ConversationModal({ session, onClose }: { session: ChatSession; onClose: () => void }) {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col"
      style={{ backgroundColor: '#ffffff', height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Full conversation from ${session.date}`}
    >
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ backgroundColor: '#ffffff' }}>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{session.date}</h2>
          <p className="text-sm text-gray-600 mt-0.5">Duration: {session.duration}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close conversation"
          className="ml-4 shrink-0 w-10 h-10 flex items-center justify-center rounded-full font-bold text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b91c1c')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
        >
          X
        </button>
      </div>

      {/* Scrollable messages */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5"
        style={{ backgroundColor: '#ffffff' }}
      >
        <ol
          className="space-y-4 list-none max-w-2xl mx-auto pb-8"
          aria-label="Full conversation messages"
        >
          {session.messages.map((message, index) => {
            const isUser = message.sender === 'user';
            return (
              <li
                key={index}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  role="group"
                  aria-label={`${isUser ? 'You' : 'Acorn'} at ${message.time}`}
                >
                  <p className={`text-xs font-semibold mb-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {isUser ? 'You' : 'Acorn'}
                  </p>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <time
                    className={`text-xs mt-1.5 block ${isUser ? 'text-blue-200' : 'text-gray-400'}`}
                    dateTime={message.time}
                    aria-label={`Sent at ${message.time}`}
                  >
                    {message.time}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function ChatSessionCard({ session }: { session: ChatSession }) {
  const [modalOpen, setModalOpen] = useState(false);
  const previewMessages = session.messages.slice(0, 2);

  return (
    <>
      <Card
        className="p-5"
        role="article"
        aria-label={`Chat session from ${session.date}, ${session.duration} long`}
      >
        {/* Card header */}
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{session.date}</h3>
            <p className="text-sm text-gray-600 mt-0.5">Duration: {session.duration}</p>
          </div>
          <div className="text-sm text-gray-600" aria-label={`${session.messages.length} messages`}>
            {session.messages.length} messages
          </div>
        </div>

        {/* Two column layout */}
        <div className="flex flex-col sm:flex-row gap-5">

          {/* Left: Summary */}
          <div className="sm:w-1/2 space-y-4 sm:border-r sm:pr-5">

            <section aria-labelledby={`learned-title-${session.id}`}>
              <h4
                id={`learned-title-${session.id}`}
                className="text-sm font-bold text-gray-800 mb-2"
              >
                What you learned
              </h4>
              {session.summary.learned.length > 0 ? (
                <ul className="space-y-2" aria-label="Things learned in this session">
                  {session.summary.learned.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </span>
                      <span className="text-sm text-gray-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">Nothing new this session.</p>
              )}
            </section>

            <section aria-labelledby={`practice-title-${session.id}`}>
              <h4
                id={`practice-title-${session.id}`}
                className="text-sm font-bold text-gray-800 mb-2"
              >
                Things to keep practicing
              </h4>
              {session.summary.practice.length > 0 ? (
                <ul className="space-y-2" aria-label="Things to keep practicing from this session">
                  {session.summary.practice.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs"
                      >
                        !
                      </span>
                      <span className="text-sm text-gray-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-green-700">You did a great job this session, keep going!</p>
              )}
            </section>
          </div>

          {/* Right: Conversation preview */}
          <div className="sm:w-1/2 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-gray-800">Conversation preview</h4>

            <ol className="space-y-2 list-none" aria-label={`Preview of conversation from ${session.date}`}>
              {previewMessages.map((message, index) => {
                const isUser = message.sender === 'user';
                return (
                  <li key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                      role="group"
                      aria-label={`${isUser ? 'You' : 'Acorn'} at ${message.time}`}
                    >
                      <p className={`text-xs font-semibold mb-0.5 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {isUser ? 'You' : 'Acorn'}
                      </p>
                      <p className="text-sm leading-snug">{message.text}</p>
                      <time
                        className={`text-xs mt-1 block ${isUser ? 'text-blue-200' : 'text-gray-400'}`}
                        dateTime={message.time}
                        aria-label={`Sent at ${message.time}`}
                      >
                        {message.time}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>

            <button
              onClick={() => setModalOpen(true)}
              aria-haspopup="dialog"
              className="mt-2 self-start text-sm font-semibold underline text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.color = '#111827')}
            >
              Read full conversation
            </button>
          </div>
        </div>
      </Card>

      {modalOpen && (
        <ConversationModal
          session={session}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

export function ChatLog() {
  return (
    <div className="size-full bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Chat Log</h2>
          <p className="text-sm text-gray-600">
            Each session shows a summary of what you learned and what to keep practicing, alongside a preview of your conversation with Acorn.
          </p>
        </header>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pb-4" role="feed" aria-label="Chat sessions">
            {mockChatSessions.map((session) => (
              <ChatSessionCard key={session.id} session={session} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { Home } from './components/Home';
import { ChatLog } from './components/ChatLog';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'chat-log', Component: ChatLog },
    ],
  },
]);

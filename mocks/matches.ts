import { Match } from '@/types';
import { mockJobs } from './jobs';

export const mockMatches: Match[] = [
  {
    id: 'm1',
    job: mockJobs[0],
    matchedDate: '2026-02-19',
    status: 'interested',
    lastMessage: 'Hi! We loved your profile. Would you be available for a quick chat?',
    unreadCount: 1,
    companyInterest: 'Our engineering team was impressed by your React and TypeScript expertise. We believe you would be a great fit for our frontend team.',
  },
  {
    id: 'm2',
    job: mockJobs[1],
    matchedDate: '2026-02-18',
    status: 'interested',
    lastMessage: null,
    unreadCount: 0,
    companyInterest: 'Your design portfolio and product thinking align perfectly with what we are looking for. We would love to discuss this opportunity further.',
  },
  {
    id: 'm3',
    job: mockJobs[4],
    matchedDate: '2026-02-17',
    status: 'interested',
    lastMessage: 'We\'d love to move forward with your application!',
    unreadCount: 2,
    companyInterest: 'Your React Native experience is exactly what we need. Our mobile team is growing and we think you could make a huge impact.',
  },
  {
    id: 'm4',
    job: mockJobs[5],
    matchedDate: '2026-02-16',
    status: 'interested',
    lastMessage: 'Thanks for applying! Our team is reviewing your application.',
    unreadCount: 0,
    companyInterest: 'We noticed your strong background in Next.js and the React ecosystem. Our DX team would benefit greatly from your expertise.',
  },
  {
    id: 'm5',
    job: mockJobs[2],
    matchedDate: '2026-02-15',
    status: 'interested',
    lastMessage: null,
    unreadCount: 0,
    companyInterest: 'Your full-stack skills and experience with collaborative tools make you an ideal candidate for our engineering team.',
  },
];
